"""
Customer Portal API endpoints
Separate auth namespace for customer-facing negotiation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import secrets

from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user


router = APIRouter(prefix="/portal", tags=["portal"])


def generate_magic_token():
    """Generate a secure magic link token"""
    return secrets.token_urlsafe(32)


@router.post("/generate-link/{quotation_id}")
def generate_portal_link(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Generate a magic link for customer portal access
    Called by internal users to send portal link to customer
    Token is now stored in customers.portal_magic_token (not per-negotiation)
    """
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Get customer
    customer = db.query(models.Customer).filter(
        models.Customer.id == quotation.customer_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate or reuse magic token
    if not customer.portal_magic_token:
        customer.portal_magic_token = generate_magic_token()
    
    # Set expiration (30 days from now)
    customer.portal_token_expires = datetime.utcnow() + timedelta(days=30)
    
    # Create negotiation records for each line item (if they don't exist)
    for line_item in quotation.line_items:
        existing_neg = db.query(models.CustomerNegotiation).filter(
            models.CustomerNegotiation.quotation_id == quotation_id,
            models.CustomerNegotiation.line_item_id == line_item.id
        ).first()
        
        if not existing_neg:
            negotiation = models.CustomerNegotiation(
                quotation_id=quotation_id,
                line_item_id=line_item.id,
                status=models.NegotiationStatus.SENT
            )
            db.add(negotiation)
    
    db.commit()
    
    # In production, this would send an email with the link
    portal_url = f"/portal/negotiate/{customer.portal_magic_token}"
    
    return {
        "portal_url": portal_url,
        "magic_token": customer.portal_magic_token,
        "expires_at": customer.portal_token_expires.isoformat(),
        "customer_code": customer.customer_code
    }


@router.get("/negotiate/{magic_token}")
def get_portal_quotation(
    magic_token: str,
    db: Session = Depends(get_db)
):
    """
    Customer accesses quotation via magic link
    Returns quotation details with negotiation status
    Token is now stored in customers.portal_magic_token
    """
    # Find customer by magic token
    customer = db.query(models.Customer).filter(
        models.Customer.portal_magic_token == magic_token
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired portal link"
        )
    
    # Check if token is expired
    if customer.portal_token_expires and customer.portal_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Portal link has expired. Please request a new link."
        )
    
    # Get all quotations for this customer
    quotations = db.query(models.Quotation).filter(
        models.Quotation.customer_id == customer.id
    ).order_by(models.Quotation.created_at.desc()).all()
    
    if not quotations:
        raise HTTPException(status_code=404, detail="No quotations found for this customer")
    
    # Get the most recent quotation
    quotation = quotations[0]
    
    # Check if quotation has moved past negotiation (stale session check)
    if quotation.status not in [
        models.QuotationStatus.DRAFT,
        models.QuotationStatus.NEGOTIATION,
        models.QuotationStatus.PENDING_APPROVAL
    ]:
        return {
            "error": "stale_session",
            "message": "This quotation has already been processed and can no longer be modified.",
            "current_status": quotation.status.value
        }
    
    # Get all negotiations for this quotation
    negotiations = db.query(models.CustomerNegotiation).filter(
        models.CustomerNegotiation.quotation_id == quotation.id
    ).all()
    
    return {
        "customer": customer,
        "quotation": quotation,
        "line_items": quotation.line_items,
        "negotiations": negotiations,
        "all_quotations": quotations,  # Customer can see their history
        "can_edit": quotation.status in [
            models.QuotationStatus.DRAFT,
            models.QuotationStatus.NEGOTIATION
        ]
    }


@router.post("/negotiate/{magic_token}/submit")
def submit_counter_offer(
    magic_token: str,
    portal_data: schemas.CustomerPortalSubmit,
    db: Session = Depends(get_db)
):
    """
    Customer submits counter-offer (discount request, delivery date change)
    Recomputes blended score and triggers re-approval if needed
    Token is now stored in customers.portal_magic_token
    """
    # Find customer by magic token
    customer = db.query(models.Customer).filter(
        models.Customer.portal_magic_token == magic_token
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired portal link"
        )
    
    # Check if token is expired
    if customer.portal_token_expires and customer.portal_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Portal link has expired"
        )
    
    # Get the most recent quotation for this customer
    quotation = db.query(models.Quotation).filter(
        models.Quotation.customer_id == customer.id
    ).order_by(models.Quotation.created_at.desc()).first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Stale session check
    if quotation.status not in [
        models.QuotationStatus.DRAFT,
        models.QuotationStatus.NEGOTIATION
    ]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This quotation has already been processed on another session"
        )
    
    action = portal_data.action
    
    if action == "submit_request":
        # Update negotiations with customer comments and counter offers
        for neg_data in portal_data.negotiations:
            line_item = db.query(models.LineItem).filter(
                models.LineItem.id == neg_data.line_item_id,
                models.LineItem.quotation_id == quotation.id
            ).first()
            
            if not line_item:
                continue
            
            # Create or update negotiation record
            existing_neg = db.query(models.CustomerNegotiation).filter(
                models.CustomerNegotiation.quotation_id == quotation.id,
                models.CustomerNegotiation.line_item_id == neg_data.line_item_id
            ).first()
            
            if existing_neg:
                existing_neg.customer_comment = neg_data.customer_comment
                existing_neg.counter_discount = neg_data.counter_discount
                existing_neg.requested_delivery_date = neg_data.requested_delivery_date
                existing_neg.status = models.NegotiationStatus.UNDER_NEGOTIATION
            else:
                new_neg = models.CustomerNegotiation(
                    quotation_id=quotation.id,
                    line_item_id=neg_data.line_item_id,
                    customer_comment=neg_data.customer_comment,
                    counter_discount=neg_data.counter_discount,
                    requested_delivery_date=neg_data.requested_delivery_date,
                    status=models.NegotiationStatus.UNDER_NEGOTIATION
                )
                db.add(new_neg)
            
            # Update line item with counter discount if provided
            if neg_data.counter_discount is not None:
                line_item.discount = neg_data.counter_discount
                
                # Recalculate overage
                if line_item.discount > line_item.discount_limit:
                    line_item.overage = line_item.discount - line_item.discount_limit
                else:
                    line_item.overage = 0.0
                
                # Recalculate line total
                discount_amount = line_item.unit_price * (line_item.discount / 100)
                line_item.line_total = (line_item.unit_price - discount_amount) * line_item.quantity
        
        # Recalculate blended score
        blended_score = sum(item.overage for item in quotation.line_items)
        old_score = quotation.blended_score
        quotation.blended_score = blended_score
        
        # Recalculate total value
        quotation.total_value = sum(item.line_total for item in quotation.line_items)
        
        # Check if re-approval is needed
        if blended_score > 0 and (blended_score > old_score or old_score == 0):
            # Customer's changes increased risk - trigger re-approval
            quotation.status = models.QuotationStatus.PENDING_APPROVAL
            
            # Create approval steps based on new risk level
            risk_level = models.RiskLevel.HIGH if blended_score >= 10 else models.RiskLevel.MEDIUM
            
            # Clear old approval steps
            db.query(models.ApprovalStep).filter(
                models.ApprovalStep.quotation_id == quotation.id
            ).delete()
            
            # Create new approval steps
            manager = db.query(models.User).filter(
                models.User.role == models.UserRole.MANAGER
            ).first()
            
            manager_step = models.ApprovalStep(
                quotation_id=quotation.id,
                approver_role=models.UserRole.MANAGER,
                assigned_to_id=manager.id if manager else None,
                status=models.ApprovalStatus.PENDING,
                step_order=1,
                risk_level=risk_level
            )
            db.add(manager_step)
            
            if risk_level == models.RiskLevel.HIGH:
                finance = db.query(models.User).filter(
                    models.User.role == models.UserRole.FINANCE
                ).first()
                
                finance_step = models.ApprovalStep(
                    quotation_id=quotation.id,
                    approver_role=models.UserRole.FINANCE,
                    assigned_to_id=finance.id if finance else None,
                    status=models.ApprovalStatus.PENDING,
                    step_order=2,
                    risk_level=risk_level
                )
                db.add(finance_step)
            
            # Create audit log
            audit_log = models.AuditLog(
                quotation_id=quotation.id,
                user_id=quotation.created_by_id,
                action="Customer Requested Changes",
                note=f"Customer counter-offer increased blended score to {blended_score}, re-entering approval"
            )
            db.add(audit_log)
            
            message = "Changes submitted. Quote re-entered approval workflow due to increased risk."
        else:
            quotation.status = models.QuotationStatus.NEGOTIATION
            message = "Counter-offer submitted successfully. Awaiting sales team response."
        
        db.commit()
        
        return {
            "success": True,
            "message": message,
            "quotation_status": quotation.status.value,
            "blended_score": quotation.blended_score,
            "requires_approval": quotation.status == models.QuotationStatus.PENDING_APPROVAL
        }
    
    elif action == "confirm_quotation":
        # Customer confirms and accepts the quotation as-is
        if quotation.blended_score > 0:
            # If there's risk, it must go through approval first
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This quotation requires approval before confirmation"
            )
        
        quotation.status = models.QuotationStatus.CONFIRMED
        
        # Update all negotiations for this quotation
        db.query(models.CustomerNegotiation).filter(
            models.CustomerNegotiation.quotation_id == quotation.id
        ).update({"status": models.NegotiationStatus.CONFIRMED})
        
        # Create audit log
        audit_log = models.AuditLog(
            quotation_id=quotation.id,
            user_id=quotation.created_by_id,
            action="Customer Confirmed",
            note="Customer confirmed quotation via portal"
        )
        db.add(audit_log)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Quotation confirmed successfully!",
            "quotation_status": quotation.status.value
        }
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action"
        )


@router.post("/negotiations/{negotiation_id}/respond")
def rep_respond_to_negotiation(
    negotiation_id: int,
    response_data: schemas.RepNegotiationResponse,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    REP responds to customer negotiation request
    Only REP, MANAGER, and ADMIN can respond
    """
    # Role-based access control
    from fastapi import HTTPException, status as http_status
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps, Managers, and Admins can respond to negotiations"
        )
    
    # Get negotiation
    negotiation = db.query(models.CustomerNegotiation).filter(
        models.CustomerNegotiation.id == negotiation_id
    ).first()
    
    if not negotiation:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Negotiation not found"
        )
    
    # Get quotation to verify ownership (REPs can only respond to their own deals)
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == negotiation.quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # REP can only respond to their own quotations (MANAGER/ADMIN can respond to any)
    if current_user.role == models.UserRole.REP and quotation.created_by_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You can only respond to negotiations on your own quotations"
        )
    
    # Update negotiation with REP response
    negotiation.rep_response = response_data.response
    
    # Optionally approve counter-discount or modify it
    if response_data.approved_discount is not None:
        line_item = db.query(models.LineItem).filter(
            models.LineItem.id == negotiation.line_item_id
        ).first()
        
        if line_item:
            # Update line item discount
            line_item.discount = response_data.approved_discount
            
            # Recalculate line item
            from app.routers.quotations import calculate_line_item, calculate_quotation
            calculate_line_item(line_item)
            
            # Recalculate quotation totals
            calculate_quotation(quotation)
            
            negotiation.counter_discount = response_data.approved_discount
    
    # Update negotiation status
    if response_data.action == "accept":
        negotiation.status = models.NegotiationStatus.CONFIRMED
        quotation.status = models.QuotationStatus.APPROVED
        message = "Counter-offer accepted by sales rep"
    elif response_data.action == "counter":
        negotiation.status = models.NegotiationStatus.UNDER_NEGOTIATION
        message = "Sales rep provided counter-offer"
    elif response_data.action == "reject":
        negotiation.status = models.NegotiationStatus.REJECTED
        message = "Counter-offer rejected by sales rep"
    else:
        message = "Response recorded"
    
    db.commit()
    db.refresh(negotiation)
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=quotation.id,
        user_id=current_user.id,
        action="REP Response",
        note=f"{current_user.name} responded to customer negotiation: {message}"
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "success": True,
        "message": message,
        "negotiation": negotiation,
        "quotation_status": quotation.status.value
    }

