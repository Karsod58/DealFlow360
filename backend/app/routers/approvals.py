from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from datetime import datetime
from app.routers.websocket import broadcast_approval_update, notify_user

router = APIRouter(prefix="/approvals", tags=["approvals"])


def get_risk_level(blended_score: float) -> models.RiskLevel:
    """Determine risk level based on blended score."""
    if blended_score == 0:
        return models.RiskLevel.LOW
    elif blended_score < 10:
        return models.RiskLevel.MEDIUM
    else:
        return models.RiskLevel.HIGH


def create_approval_steps(db: Session, quotation: models.Quotation):
    """Create approval steps based on blended score."""
    risk_level = get_risk_level(quotation.blended_score)
    
    # Get manager
    manager = db.query(models.User).filter(
        models.User.role == models.UserRole.MANAGER
    ).first()
    
    # Always create Manager approval step
    manager_step = models.ApprovalStep(
        quotation_id=quotation.id,
        approver_role=models.UserRole.MANAGER,
        assigned_to_id=manager.id if manager else None,
        status=models.ApprovalStatus.PENDING,
        step_order=1,
        risk_level=risk_level
    )
    db.add(manager_step)
    
    # If high risk, also require Finance approval
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
    
    db.commit()


@router.get("", response_model=List[schemas.ApprovalListItem])
def get_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all quotations requiring approval."""
    query = db.query(models.Quotation).filter(
        models.Quotation.status.in_([
            models.QuotationStatus.PENDING_APPROVAL,
            models.QuotationStatus.APPROVED,
            models.QuotationStatus.REJECTED
        ])
    )
    
    quotations = query.order_by(models.Quotation.created_at.desc()).all()
    
    result = []
    for q in quotations:
        # Get current approval step
        approval_step = db.query(models.ApprovalStep).filter(
            models.ApprovalStep.quotation_id == q.id,
            models.ApprovalStep.status == models.ApprovalStatus.PENDING
        ).order_by(models.ApprovalStep.step_order).first()
        
        risk_level = get_risk_level(q.blended_score)
        
        # Determine stage and assigned_to
        if q.status == models.QuotationStatus.APPROVED:
            stage = "Auto-Approved" if q.blended_score == 0 else "Approved"
            assigned_to = None
        elif approval_step:
            stage = approval_step.approver_role.value
            assigned_to = approval_step.assigned_to.name if approval_step.assigned_to else None
        else:
            stage = "Completed"
            assigned_to = None
        
        # Apply status filter
        if status_filter:
            if status_filter.lower() == "pending" and q.status != models.QuotationStatus.PENDING_APPROVAL:
                continue
            if status_filter.lower() == "approved" and q.status != models.QuotationStatus.APPROVED:
                continue
            if status_filter.lower() == "returned" and q.status != models.QuotationStatus.DRAFT:
                continue
        
        result.append(schemas.ApprovalListItem(
            id=q.id,
            quotation_number=q.quotation_number,
            customer_name=q.customer.name if q.customer else "Unknown",
            blended_score=q.blended_score,
            risk_level=risk_level.value,
            stage=stage,
            assigned_to=assigned_to,
            status=q.status,
            created_at=q.created_at
        ))
    
    return result


@router.get("/{quotation_id}", response_model=schemas.ApprovalDetail)
def get_approval_detail(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get approval detail for a specific quotation."""
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Get approval steps
    approval_steps = db.query(models.ApprovalStep).filter(
        models.ApprovalStep.quotation_id == quotation_id
    ).order_by(models.ApprovalStep.step_order).all()
    
    # Get audit logs
    audit_logs = db.query(models.AuditLog).filter(
        models.AuditLog.quotation_id == quotation_id
    ).order_by(models.AuditLog.created_at.desc()).all()
    
    risk_level = get_risk_level(quotation.blended_score)
    
    return schemas.ApprovalDetail(
        quotation=quotation,
        approval_steps=approval_steps,
        audit_logs=audit_logs,
        risk_level=risk_level.value,
        customer_tier="Gold"
    )


@router.post("/{quotation_id}/approve", response_model=schemas.Quotation)
async def approve_quotation(
    quotation_id: int,
    action_data: schemas.ApprovalAction,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Approve a quotation. Only MANAGER, FINANCE, and ADMIN can approve."""
    # Role-based access control
    if current_user.role not in [models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers, Finance, and Admins can approve quotations"
        )
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Find current pending step for this user's role
    pending_step = db.query(models.ApprovalStep).filter(
        models.ApprovalStep.quotation_id == quotation_id,
        models.ApprovalStep.approver_role == current_user.role,
        models.ApprovalStep.status == models.ApprovalStatus.PENDING
    ).first()
    
    if not pending_step:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending approval step for your role"
        )
    
    # Mark step as approved
    pending_step.status = models.ApprovalStatus.APPROVED
    pending_step.reviewed_at = datetime.utcnow()
    pending_step.reviewed_by_id = current_user.id
    
    # Check if there are more pending steps
    remaining_steps = db.query(models.ApprovalStep).filter(
        models.ApprovalStep.quotation_id == quotation_id,
        models.ApprovalStep.status == models.ApprovalStatus.PENDING
    ).count()
    
    # If no more pending steps, mark quotation as approved
    if remaining_steps == 0:
        quotation.status = models.QuotationStatus.APPROVED
        final_status = "fully_approved"
    else:
        final_status = "step_approved"
    
    db.commit()
    db.refresh(quotation)
    
    # Log action
    audit_log = models.AuditLog(
        quotation_id=quotation_id,
        user_id=current_user.id,
        action="Approved",
        note=action_data.note
    )
    db.add(audit_log)
    db.commit()
    
    # Log activity
    activity = models.AuditLog(
        quotation_id=quotation_id,
        user_id=current_user.id,
        action="Approved",
        note=f"{quotation.quotation_number} approved by {current_user.name}"
    )
    db.add(activity)
    db.commit()
    
    # Broadcast WebSocket update
    background_tasks.add_task(
        broadcast_approval_update,
        approval_id=quotation_id,
        action="approved",
        user_id=current_user.id,
        data={
            "quotation_number": quotation.quotation_number,
            "customer_name": quotation.customer.name if quotation.customer else "Unknown",
            "approver_name": current_user.name,
            "approver_role": current_user.role.value,
            "status": final_status,
            "remaining_steps": remaining_steps
        }
    )
    
    # Notify quotation creator
    if quotation.created_by_id and quotation.created_by_id != current_user.id:
        background_tasks.add_task(
            notify_user,
            user_id=quotation.created_by_id,
            notification_type="success",
            title="Quotation Approved",
            message=f"Your quotation {quotation.quotation_number} was approved by {current_user.name}",
            data={"quotation_id": quotation_id}
        )
    
    return quotation


@router.post("/{quotation_id}/reject", response_model=schemas.Quotation)
async def reject_quotation(
    quotation_id: int,
    action_data: schemas.ApprovalAction,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Reject a quotation. Only MANAGER, FINANCE, and ADMIN can reject."""
    # Role-based access control
    if current_user.role not in [models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers, Finance, and Admins can reject quotations"
        )
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Mark quotation as rejected
    quotation.status = models.QuotationStatus.REJECTED
    
    # Mark all pending steps as rejected
    db.query(models.ApprovalStep).filter(
        models.ApprovalStep.quotation_id == quotation_id,
        models.ApprovalStep.status == models.ApprovalStatus.PENDING
    ).update({
        "status": models.ApprovalStatus.REJECTED,
        "reviewed_at": datetime.utcnow(),
        "reviewed_by_id": current_user.id
    })
    
    db.commit()
    db.refresh(quotation)
    
    # Log action
    audit_log = models.AuditLog(
        quotation_id=quotation_id,
        user_id=current_user.id,
        action="Rejected",
        note=action_data.note
    )
    db.add(audit_log)
    db.commit()
    
    # Log activity
    activity = models.AuditLog(
        quotation_id=quotation_id,
        user_id=current_user.id,
        action="Rejected",
        note=f"{quotation.quotation_number} rejected by {current_user.name}"
    )
    db.add(activity)
    db.commit()
    
    # Broadcast WebSocket update
    background_tasks.add_task(
        broadcast_approval_update,
        approval_id=quotation_id,
        action="rejected",
        user_id=current_user.id,
        data={
            "quotation_number": quotation.quotation_number,
            "customer_name": quotation.customer.name if quotation.customer else "Unknown",
            "rejector_name": current_user.name,
            "rejector_role": current_user.role.value,
            "reason": action_data.note
        }
    )
    
    # Notify quotation creator
    if quotation.created_by_id and quotation.created_by_id != current_user.id:
        background_tasks.add_task(
            notify_user,
            user_id=quotation.created_by_id,
            notification_type="error",
            title="Quotation Rejected",
            message=f"Your quotation {quotation.quotation_number} was rejected by {current_user.name}",
            data={"quotation_id": quotation_id, "reason": action_data.note}
        )
    
    return quotation


@router.post("/{quotation_id}/return", response_model=schemas.Quotation)
def return_quotation(
    quotation_id: int,
    action_data: schemas.ApprovalAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Return quotation for revision. Only MANAGER, FINANCE, and ADMIN can return."""
    # Role-based access control
    if current_user.role not in [models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers, Finance, and Admins can return quotations"
        )
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Mark quotation back to draft
    quotation.status = models.QuotationStatus.DRAFT
    
    # Mark all approval steps as returned
    db.query(models.ApprovalStep).filter(
        models.ApprovalStep.quotation_id == quotation_id
    ).update({
        "status": models.ApprovalStatus.RETURNED,
        "reviewed_at": datetime.utcnow(),
        "reviewed_by_id": current_user.id
    })
    
    db.commit()
    db.refresh(quotation)
    
    # Log action
    audit_log = models.AuditLog(
        quotation_id=quotation_id,
        user_id=current_user.id,
        action="Returned",
        note=action_data.note or "Requested revision"
    )
    db.add(audit_log)
    db.commit()
    
    # Log activity
    activity = models.AuditLog(
        quotation_id=quotation_id,
        user_id=current_user.id,
        action="Returned for revision",
        note=f"{quotation.quotation_number} returned for revision by {current_user.name}"
    )
    db.add(activity)
    db.commit()
    
    return quotation
