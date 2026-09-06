from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user, require_manager

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get dashboard statistics. All internal users can view stats."""
    # Role-based access control - Allow all internal roles
    from fastapi import HTTPException, status
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only internal users can view dashboard statistics"
        )
    
    # For REP, filter to their own quotations
    if current_user.role == models.UserRole.REP:
        # Count pending approvals (rep's own)
        pending_approvals = db.query(models.Quotation).filter(
            models.Quotation.status == models.QuotationStatus.PENDING_APPROVAL,
            models.Quotation.created_by_id == current_user.id
        ).count()
        
        # Count open quotations (rep's own)
        open_quotations = db.query(models.Quotation).filter(
            models.Quotation.status.in_([
                models.QuotationStatus.DRAFT,
                models.QuotationStatus.PENDING_APPROVAL,
                models.QuotationStatus.NEGOTIATION
            ]),
            models.Quotation.created_by_id == current_user.id
        ).count()
        
        # Count at-risk deals (rep's own)
        at_risk_deals = db.query(models.Quotation).filter(
            models.Quotation.blended_score > 0,
            models.Quotation.status != models.QuotationStatus.DRAFT,
            models.Quotation.created_by_id == current_user.id
        ).count()
    else:
        # MANAGER, FINANCE, ADMIN see all
        # Count pending approvals
        pending_approvals = db.query(models.Quotation).filter(
            models.Quotation.status == models.QuotationStatus.PENDING_APPROVAL
        ).count()
        
        # Count open quotations (draft + pending + negotiation)
        open_quotations = db.query(models.Quotation).filter(
            models.Quotation.status.in_([
                models.QuotationStatus.DRAFT,
                models.QuotationStatus.PENDING_APPROVAL,
                models.QuotationStatus.NEGOTIATION
            ])
        ).count()
        
        # Count at-risk deals (blended_score > 0 and not draft)
        at_risk_deals = db.query(models.Quotation).filter(
            models.Quotation.blended_score > 0,
            models.Quotation.status != models.QuotationStatus.DRAFT
        ).count()
    
    return {
        "pending_approvals": pending_approvals,
        "open_quotations": open_quotations,
        "at_risk_deals": at_risk_deals
    }


@router.get("/activity")
def get_recent_activity(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get recent activity from audit logs. MANAGER/FINANCE/ADMIN see all, REP sees their own."""
    # Role-based access control
    from fastapi import HTTPException, status
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only REP, Manager, Finance, or Admin can view activity"
        )
    
    # Build query based on role
    query = db.query(models.AuditLog)
    
    # REP sees only their own activity
    if current_user.role == models.UserRole.REP:
        query = query.filter(models.AuditLog.user_id == current_user.id)
    
    audit_logs = query.order_by(
        models.AuditLog.created_at.desc()
    ).limit(limit).all()
    
    # Convert to activity feed format
    return [
        {
            "id": log.id,
            "message": f"{log.user.name} {log.action.lower()} {log.quotation.quotation_number}",
            "timestamp": log.created_at,
            "quotation_id": log.quotation_id
        }
        for log in audit_logs
    ]



@router.get("/deal-health")
def get_deal_health(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Deal Health and Anomaly Dashboard
    Detects: stalled deals (no change ≥3 days), discount anomalies (>2× rep avg), delivery slippage
    MANAGER/ADMIN see all deals, REP sees only their own deals
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_
    
    # Define thresholds (hardcoded per spec)
    STALLED_DAYS = 3
    ANOMALY_MULTIPLIER = 2.0
    
    deals_flagged = []
    
    # Role-based filtering
    base_query = db.query(models.Quotation)
    if current_user.role == models.UserRole.REP:
        # REP sees only their own deals
        base_query = base_query.filter(models.Quotation.created_by_id == current_user.id)
    elif current_user.role not in [models.UserRole.MANAGER, models.UserRole.ADMIN]:
        # Only REP, MANAGER, ADMIN can access this endpoint
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only REP, MANAGER, or ADMIN can view deal health."
        )
    
    # 1. Stalled Deals: no status change ≥3 days
    stalled_threshold = datetime.utcnow() - timedelta(days=STALLED_DAYS)
    
    stalled_quotations = base_query.filter(
        models.Quotation.status.in_([
            models.QuotationStatus.DRAFT,
            models.QuotationStatus.NEGOTIATION,
            models.QuotationStatus.PENDING_APPROVAL
        ]),
        models.Quotation.updated_at < stalled_threshold
    ).all()
    
    for quote in stalled_quotations:
        days_idle = (datetime.utcnow() - quote.updated_at).days
        deals_flagged.append({
            "deal_id": quote.id,
            "quotation_number": quote.quotation_number,
            "customer_name": quote.customer.name if quote.customer else "Unknown",
            "issue": f"Idle {days_idle} days",
            "flagged_date": quote.updated_at.isoformat(),
            "action_taken": "Nudge sent" if days_idle > 5 else None,
            "type": "stalled"
        })
    
    # 2. Discount Anomalies: discount > 2× rep's historical average
    # Calculate rep's average discount
    rep_quotes = db.query(models.Quotation).filter(
        models.Quotation.created_by_id == current_user.id,
        models.Quotation.status != models.QuotationStatus.DRAFT
    ).all()
    
    if rep_quotes:
        # Calculate average discount across all line items
        total_discount = 0
        total_items = 0
        
        for quote in rep_quotes:
            for item in quote.line_items:
                total_discount += item.discount
                total_items += 1
        
        avg_discount = total_discount / total_items if total_items > 0 else 0
        anomaly_threshold = avg_discount * ANOMALY_MULTIPLIER
        
        # Find quotes with discounts exceeding threshold
        recent_quotes = db.query(models.Quotation).filter(
            models.Quotation.created_at > datetime.utcnow() - timedelta(days=30)
        ).all()
        
        for quote in recent_quotes:
            for item in quote.line_items:
                if item.discount > anomaly_threshold and avg_discount > 0:
                    deals_flagged.append({
                        "deal_id": quote.id,
                        "quotation_number": quote.quotation_number,
                        "customer_name": quote.customer.name if quote.customer else "Unknown",
                        "issue": f"Discount {item.discount:.1f}% vs avg {avg_discount:.1f}%",
                        "flagged_date": quote.created_at.isoformat(),
                        "action_taken": "Escalated to Manager" if item.discount > 15 else None,
                        "type": "discount_anomaly"
                    })
                    break  # Only flag once per quote
    
    # 3. Delivery Slippage: fulfillment splits with estimated delivery at risk
    # For now, we'll flag quotes that are approved but haven't been fulfilled within expected time
    approved_threshold = datetime.utcnow() - timedelta(days=7)
    
    delivery_at_risk = db.query(models.Quotation).filter(
        models.Quotation.status == models.QuotationStatus.APPROVED,
        models.Quotation.updated_at < approved_threshold
    ).all()
    
    for quote in delivery_at_risk:
        # Check if fulfillment has been calculated
        has_fulfillment = db.query(models.FulfillmentSplit).filter(
            models.FulfillmentSplit.quotation_id == quote.id
        ).first()
        
        if not has_fulfillment:
            days_waiting = (datetime.utcnow() - quote.updated_at).days
            deals_flagged.append({
                "deal_id": quote.id,
                "quotation_number": quote.quotation_number,
                "customer_name": quote.customer.name if quote.customer else "Unknown",
                "issue": f"Approved {days_waiting} days ago, no fulfillment",
                "flagged_date": quote.updated_at.isoformat(),
                "action_taken": None,
                "type": "delivery_slippage"
            })
    
    # Calculate stats
    stalled_count = len([d for d in deals_flagged if d["type"] == "stalled"])
    anomaly_count = len([d for d in deals_flagged if d["type"] == "discount_anomaly"])
    slippage_count = len([d for d in deals_flagged if d["type"] == "delivery_slippage"])
    
    return {
        "stats": {
            "stalled_deals": stalled_count,
            "discount_anomalies": anomaly_count,
            "delivery_slippage": slippage_count
        },
        "deals": deals_flagged,
        "thresholds": {
            "stalled_days": STALLED_DAYS,
            "anomaly_multiplier": ANOMALY_MULTIPLIER
        }
    }
