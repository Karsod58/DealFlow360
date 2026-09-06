"""
Subscriptions API endpoints
Handles recurring billing with day-based proration
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user, require_finance
from app.routers.websocket import broadcast_subscription_update


router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def calculate_proration(
    old_amount: float,
    new_amount: float,
    old_cycle: models.BillingCycle,
    new_cycle: models.BillingCycle,
    next_bill_date: datetime,
    change_date: datetime = None
) -> dict:
    """
    Calculate day-based proration for subscription changes
    Returns: { "credit": float, "charge": float, "net": float, "days_remaining": int }
    """
    if change_date is None:
        change_date = datetime.utcnow()
    
    # Calculate days in billing period
    cycle_days_map = {
        models.BillingCycle.WEEKLY: 7,
        models.BillingCycle.MONTHLY: 30,
        models.BillingCycle.QUARTERLY: 90,
        models.BillingCycle.YEARLY: 365,
    }
    
    old_cycle_days = cycle_days_map.get(old_cycle, 30)
    new_cycle_days = cycle_days_map.get(new_cycle, 30)
    
    # Calculate days remaining until next bill
    days_remaining = (next_bill_date - change_date).days
    if days_remaining < 0:
        days_remaining = 0
    
    # Calculate prorated credit for unused portion of old plan
    daily_rate_old = old_amount / old_cycle_days
    credit = daily_rate_old * days_remaining
    
    # Calculate prorated charge for new plan
    daily_rate_new = new_amount / new_cycle_days
    charge = daily_rate_new * days_remaining
    
    # Net amount (positive = charge customer, negative = credit customer)
    net = charge - credit
    
    return {
        "credit": round(credit, 2),
        "charge": round(charge, 2),
        "net": round(net, 2),
        "days_remaining": days_remaining,
        "description": f"Proration for {days_remaining} days: ${credit:.2f} credit - ${charge:.2f} charge = ${net:.2f}"
    }


@router.get("", response_model=List[schemas.Subscription])
def get_subscriptions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get all subscriptions with optional status filter
    Only FINANCE and ADMIN can view subscriptions
    """
    # Role-based access control - STRICT: Only FINANCE and ADMIN
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance and Admin users can view subscriptions"
        )
    
    query = db.query(models.Subscription)
    
    if status:
        try:
            status_enum = models.SubscriptionStatus[status.upper()]
            query = query.filter(models.Subscription.status == status_enum)
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}"
            )
    
    subscriptions = query.order_by(models.Subscription.created_at.desc()).all()
    return subscriptions


@router.get("/{subscription_id}")
def get_subscription_detail(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get subscription detail with one-time and recurring lines
    Shows hybrid billing breakdown
    """
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Get originating quotation with one-time lines
    quotation = None
    one_time_lines = []
    
    if subscription.quotation_id:
        quotation = db.query(models.Quotation).filter(
            models.Quotation.id == subscription.quotation_id
        ).first()
        
        if quotation:
            one_time_lines = [
                {
                    "product": item.product_name,
                    "quantity": item.quantity,
                    "amount": item.line_total
                }
                for item in quotation.line_items
                if not item.product_name.lower().startswith(('care plan', 'support', 'subscription'))
            ]
    
    # Get recurring lines (this subscription)
    recurring_lines = [{
        "plan": subscription.plan_name,
        "cycle": subscription.billing_cycle.value,
        "next_bill_date": subscription.next_bill_date,
        "amount": subscription.amount
    }]
    
    # Get invoices for this subscription
    invoices = db.query(models.Invoice).filter(
        models.Invoice.subscription_id == subscription.id
    ).order_by(models.Invoice.created_at.desc()).all()
    
    return {
        "subscription": subscription,
        "quotation_number": quotation.quotation_number if quotation else None,
        "one_time_lines": one_time_lines,
        "recurring_lines": recurring_lines,
        "invoices": invoices
    }


@router.post("/{subscription_id}/calculate-proration")
def calculate_proration_endpoint(
    subscription_id: int,
    modify_data: schemas.SubscriptionModify,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Calculate proration for subscription changes WITHOUT applying them
    Use this to preview costs before modifying subscription
    """
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Store old values
    old_amount = subscription.amount
    old_cycle = subscription.billing_cycle
    old_plan_name = subscription.plan_name
    
    # Determine new values
    new_amount = modify_data.amount if modify_data.amount is not None else old_amount
    new_cycle = modify_data.billing_cycle if modify_data.billing_cycle is not None else old_cycle
    new_plan_name = modify_data.plan_name if modify_data.plan_name is not None else old_plan_name
    
    # Calculate proration (preview only)
    proration = calculate_proration(
        old_amount=old_amount,
        new_amount=new_amount,
        old_cycle=old_cycle,
        new_cycle=new_cycle,
        next_bill_date=subscription.next_bill_date,
        change_date=datetime.utcnow()
    )
    
    return {
        "subscription_id": subscription_id,
        "current_plan": {
            "name": old_plan_name,
            "amount": old_amount,
            "cycle": old_cycle.value
        },
        "new_plan": {
            "name": new_plan_name,
            "amount": new_amount,
            "cycle": new_cycle.value
        },
        "proration": proration,
        "preview": True,
        "message": "This is a preview calculation. Use /modify endpoint to apply changes."
    }


@router.post("/{subscription_id}/modify")
def modify_subscription(
    subscription_id: int,
    modify_data: schemas.SubscriptionModify,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_finance)
):
    """
    Modify subscription with day-based proration
    Shows proration calculation before applying changes
    """
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription.status != models.SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only modify active subscriptions"
        )
    
    # Store old values
    old_amount = subscription.amount
    old_cycle = subscription.billing_cycle
    old_plan_name = subscription.plan_name
    
    # Determine new values
    new_amount = modify_data.amount if modify_data.amount is not None else old_amount
    new_cycle = modify_data.billing_cycle if modify_data.billing_cycle is not None else old_cycle
    new_plan_name = modify_data.plan_name if modify_data.plan_name is not None else old_plan_name
    
    # Calculate proration
    proration = calculate_proration(
        old_amount=old_amount,
        new_amount=new_amount,
        old_cycle=old_cycle,
        new_cycle=new_cycle,
        next_bill_date=subscription.next_bill_date,
        change_date=datetime.utcnow()
    )
    
    # Apply changes
    subscription.amount = new_amount
    subscription.billing_cycle = new_cycle
    subscription.plan_name = new_plan_name
    subscription.updated_at = datetime.utcnow()
    
    # Create audit log for the modification
    audit_log = models.AuditLog(
        quotation_id=subscription.quotation_id,
        user_id=current_user.id,
        action="Subscription Modified",
        note=f"Changed {old_plan_name} (${old_amount}/{old_cycle.value}) to {new_plan_name} (${new_amount}/{new_cycle.value}). Proration: {proration['description']}"
    )
    db.add(audit_log)
    
    # If there's a net charge, create an invoice for proration
    if proration['net'] > 0:
        invoice_number = f"INV-PRORATE-{subscription.id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        proration_invoice = models.Invoice(
            invoice_number=invoice_number,
            customer_id=subscription.customer_id,
            customer_name=subscription.customer_name,
            subscription_id=subscription.id,
            amount=proration['net'],
            status=models.InvoiceStatus.UNPAID,
            due_date=datetime.utcnow() + timedelta(days=7),
            is_recurring=1
        )
        db.add(proration_invoice)
        
        # Add line item for proration
        line_item = models.InvoiceLineItem(
            invoice_id=proration_invoice.id,
            product_id="PRORATION",
            product_name="Subscription Change Proration",
            quantity=1,
            unit_price=proration['net'],
            amount=proration['net']
        )
        db.add(line_item)
    
    # If there's a net credit, create a credit note
    elif proration['net'] < 0:
        invoice_number = f"CN-{subscription.id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        credit_note = models.Invoice(
            invoice_number=invoice_number,
            customer_id=subscription.customer_id,
            customer_name=subscription.customer_name,
            subscription_id=subscription.id,
            amount=abs(proration['net']),
            status=models.InvoiceStatus.PAID,  # Credit notes are immediately applied
            due_date=datetime.utcnow(),
            is_recurring=1
        )
        db.add(credit_note)
        
        # Add line item for credit
        line_item = models.InvoiceLineItem(
            invoice_id=credit_note.id,
            product_id="CREDIT",
            product_name="Subscription Change Credit",
            quantity=1,
            unit_price=abs(proration['net']),
            amount=abs(proration['net'])
        )
        db.add(line_item)
    
    db.commit()
    db.refresh(subscription)
    
    return {
        "success": True,
        "subscription": subscription,
        "proration": proration,
        "message": f"Subscription modified successfully. {proration['description']}"
    }


@router.post("/{subscription_id}/cancel")
def cancel_subscription(
    subscription_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_finance)
):
    """
    Cancel subscription with cancellation/refund rules
    Default: no refund if unconfigured (per spec fallback)
    """
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription.status == models.SubscriptionStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription already cancelled"
        )
    
    # Calculate refund (default: no refund per spec)
    # In production, check DiscountCeiling or company policy for refund rules
    refund_amount = 0.0
    refund_note = "No refund applicable per cancellation policy"
    
    # Check if there's a refund policy configured (optional)
    # For now, default to no refund unless explicitly configured
    
    # Mark subscription as cancelled
    subscription.status = models.SubscriptionStatus.CANCELLED
    subscription.end_date = datetime.utcnow()
    subscription.updated_at = datetime.utcnow()
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=subscription.quotation_id,
        user_id=current_user.id,
        action="Subscription Cancelled",
        note=f"Reason: {reason or 'Not specified'}. {refund_note}"
    )
    db.add(audit_log)
    
    # If refund is applicable, create credit note
    if refund_amount > 0:
        invoice_number = f"CN-CANCEL-{subscription.id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        credit_note = models.Invoice(
            invoice_number=invoice_number,
            customer_id=subscription.customer_id,
            customer_name=subscription.customer_name,
            subscription_id=subscription.id,
            amount=refund_amount,
            status=models.InvoiceStatus.PAID,
            due_date=datetime.utcnow(),
            is_recurring=1
        )
        db.add(credit_note)
        
        line_item = models.InvoiceLineItem(
            invoice_id=credit_note.id,
            product_id="REFUND",
            product_name="Cancellation Refund",
            quantity=1,
            unit_price=refund_amount,
            amount=refund_amount
        )
        db.add(line_item)
    
    db.commit()
    db.refresh(subscription)
    
    return {
        "success": True,
        "subscription": subscription,
        "refund_amount": refund_amount,
        "message": f"Subscription cancelled. {refund_note}"
    }


@router.post("/{subscription_id}/pause")
def pause_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Pause subscription (stops billing, can be resumed later)
    """
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription.status != models.SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only pause active subscriptions"
        )
    
    subscription.status = models.SubscriptionStatus.PAUSED
    subscription.updated_at = datetime.utcnow()
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=subscription.quotation_id,
        user_id=current_user.id,
        action="Subscription Paused",
        note="Subscription paused by user"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(subscription)
    
    return {
        "success": True,
        "subscription": subscription,
        "message": "Subscription paused successfully"
    }


@router.post("/{subscription_id}/resume")
def resume_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Resume paused subscription
    """
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription.status != models.SubscriptionStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only resume paused subscriptions"
        )
    
    subscription.status = models.SubscriptionStatus.ACTIVE
    subscription.updated_at = datetime.utcnow()
    
    # Recalculate next bill date
    cycle_days_map = {
        models.BillingCycle.WEEKLY: 7,
        models.BillingCycle.MONTHLY: 30,
        models.BillingCycle.QUARTERLY: 90,
        models.BillingCycle.YEARLY: 365,
    }
    
    days = cycle_days_map.get(subscription.billing_cycle, 30)
    subscription.next_bill_date = datetime.utcnow() + timedelta(days=days)
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=subscription.quotation_id,
        user_id=current_user.id,
        action="Subscription Resumed",
        note=f"Subscription resumed. Next bill date: {subscription.next_bill_date.strftime('%Y-%m-%d')}"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(subscription)
    
    return {
        "success": True,
        "subscription": subscription,
        "message": "Subscription resumed successfully"
    }
