from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user
from datetime import datetime
from app.routers.websocket import broadcast_quotation_update

router = APIRouter(prefix="/quotations", tags=["quotations"])


def calculate_line_item(line_item: models.LineItem) -> None:
    """Calculate line item totals and status."""
    # Calculate line total
    subtotal = line_item.quantity * line_item.unit_price
    discount_amount = subtotal * (line_item.discount / 100)
    line_item.line_total = subtotal - discount_amount
    
    # Calculate overage and status
    if line_item.discount <= line_item.discount_limit:
        line_item.status = models.LineItemStatus.OK
        line_item.overage = 0.0
    else:
        line_item.status = models.LineItemStatus.OVER
        line_item.overage = line_item.discount - line_item.discount_limit


def calculate_quotation(quotation: models.Quotation) -> None:
    """
    Calculate quotation totals and blended score.
    
    Blended score = revenue-weighted overage calculation
    Formula: sum((overage × line_total) / total_value) for each line
    """
    # Calculate total value first
    quotation.total_value = sum(item.line_total for item in quotation.line_items)
    
    # Calculate blended score (revenue-weighted overage)
    if quotation.total_value > 0:
        quotation.blended_score = sum(
            (item.overage * item.line_total) / quotation.total_value 
            for item in quotation.line_items
        )
    else:
        quotation.blended_score = 0.0


@router.get("", response_model=List[schemas.QuotationList])
def get_quotations(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all quotations, optionally filtered by status."""
    query = db.query(models.Quotation)
    
    if status:
        try:
            status_enum = models.QuotationStatus(status.upper())
            query = query.filter(models.Quotation.status == status_enum)
        except ValueError:
            pass  # Invalid status, return all
    
    quotations = query.order_by(models.Quotation.created_at.desc()).all()
    
    # Enrich with customer information
    result = []
    for q in quotations:
        quotation_dict = {
            "id": q.id,
            "quotation_number": q.quotation_number,
            "customer_id": q.customer_id,
            "customer_name": q.customer.name if q.customer else "Unknown",
            "price_list_id": q.price_list_id,
            "status": q.status,
            "total_value": q.total_value,
            "blended_score": q.blended_score,
            "created_by_id": q.created_by_id,
            "created_at": q.created_at,
            "updated_at": q.updated_at
        }
        result.append(quotation_dict)
    
    return result


@router.post("", response_model=schemas.Quotation, status_code=status.HTTP_201_CREATED)
def create_quotation(
    quotation_data: schemas.QuotationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new quotation with customer_id FK. Only REP and ADMIN can create."""
    # Role-based access control - STRICT: Only REP and ADMIN can create quotations
    if current_user.role not in [models.UserRole.REP, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps and Admins can create quotations"
        )
    
    # Validate customer exists
    customer = db.query(models.Customer).filter(
        models.Customer.id == quotation_data.customer_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {quotation_data.customer_id} not found"
        )
    
    # Generate quotation number
    quotation_number = f"Q-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    new_quotation = models.Quotation(
        quotation_number=quotation_number,
        customer_id=quotation_data.customer_id,
        price_list_id=quotation_data.price_list_id,
        created_by_id=current_user.id,
        status=models.QuotationStatus.DRAFT,
        total_value=0.0,
        blended_score=0.0
    )
    
    db.add(new_quotation)
    db.commit()
    db.refresh(new_quotation)
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=new_quotation.id,
        user_id=current_user.id,
        action="Created",
        note=f"New quotation {quotation_number} created for {customer.name}"
    )
    db.add(audit_log)
    db.commit()
    
    return new_quotation


@router.get("/{quotation_id}", response_model=schemas.Quotation)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific quotation by ID."""
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    return quotation


@router.put("/{quotation_id}", response_model=schemas.Quotation)
def update_quotation(
    quotation_id: int,
    quotation_data: schemas.QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a quotation. Only REP and ADMIN can update."""
    # Role-based access control - STRICT: Only REP and ADMIN
    if current_user.role not in [models.UserRole.REP, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps and Admins can update quotations"
        )
    
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Update fields
    if quotation_data.customer_id is not None:
        # Validate customer exists
        customer = db.query(models.Customer).filter(
            models.Customer.id == quotation_data.customer_id
        ).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {quotation_data.customer_id} not found"
            )
        quotation.customer_id = quotation_data.customer_id
    
    if quotation_data.price_list_id is not None:
        quotation.price_list_id = quotation_data.price_list_id
    if quotation_data.status is not None:
        quotation.status = quotation_data.status
    
    # Recalculate totals
    calculate_quotation(quotation)
    
    db.commit()
    db.refresh(quotation)
    
    return quotation


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a quotation. Only REP, MANAGER, and ADMIN can delete."""
    # Role-based access control
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps, Managers, and Admins can delete quotations"
        )
    
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    db.delete(quotation)
    db.commit()
    
    return None


@router.post("/{quotation_id}/submit", response_model=schemas.Quotation)
async def submit_quotation(
    quotation_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Submit quotation for approval. Only REP, MANAGER, and ADMIN can submit."""
    # Role-based access control
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps, Managers, and Admins can submit quotations"
        )
    
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Recalculate to ensure accuracy
    calculate_quotation(quotation)
    
    # Determine status based on blended score
    if quotation.blended_score == 0:
        quotation.status = models.QuotationStatus.APPROVED
        message = f"Quotation {quotation.quotation_number} auto-approved (no risk)"
        action = "approved"
    else:
        quotation.status = models.QuotationStatus.PENDING_APPROVAL
        message = f"Quotation {quotation.quotation_number} submitted for approval (risk score: {quotation.blended_score})"
        action = "submitted"
        
        # Create approval steps
        from app.routers.approvals import create_approval_steps
        create_approval_steps(db, quotation)
    
    db.commit()
    db.refresh(quotation)
    
    # Create audit log entry
    from app.models import AuditLog
    audit_log = AuditLog(
        quotation_id=quotation.id,
        user_id=current_user.id,
        action="Submitted",
        note=f"Initial submission with blended score {quotation.blended_score}"
    )
    db.add(audit_log)
    
    # Log activity
    activity = models.AuditLog(
        quotation_id=quotation.id,
        user_id=current_user.id,
        action="Submitted for approval",
        note=message
    )
    db.add(activity)
    db.commit()
    
    # Broadcast WebSocket update
    background_tasks.add_task(
        broadcast_quotation_update,
        quotation_id=quotation.id,
        action=action,
        user_id=current_user.id,
        data={
            "quotation_number": quotation.quotation_number,
            "customer_id": quotation.customer_id,
            "blended_score": float(quotation.blended_score),
            "status": quotation.status.value
        }
    )
    
    return quotation


@router.post("/{quotation_id}/line-items", response_model=schemas.LineItem, status_code=status.HTTP_201_CREATED)
def add_line_item(
    quotation_id: int,
    line_item_data: schemas.LineItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Add a line item to a quotation. Only REP, MANAGER, and ADMIN can add items."""
    # Role-based access control
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps, Managers, and Admins can add line items"
        )
    
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    new_line_item = models.LineItem(
        quotation_id=quotation_id,
        product_id=line_item_data.product_id,
        product_name=line_item_data.product_name,
        quantity=line_item_data.quantity,
        unit_price=line_item_data.unit_price,
        discount=line_item_data.discount,
        discount_limit=line_item_data.discount_limit,
        line_total=0.0,  # Will be calculated
        status=models.LineItemStatus.OK,
        overage=0.0
    )
    
    # Calculate line item
    calculate_line_item(new_line_item)
    
    db.add(new_line_item)
    db.commit()
    db.refresh(new_line_item)
    
    # Recalculate quotation totals
    calculate_quotation(quotation)
    db.commit()
    
    return new_line_item


@router.put("/{quotation_id}/line-items/{line_item_id}", response_model=schemas.LineItem)
def update_line_item(
    quotation_id: int,
    line_item_id: int,
    line_item_data: schemas.LineItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a line item. Only REP, MANAGER, and ADMIN can update."""
    # Role-based access control
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps, Managers, and Admins can update line items"
        )
    
    line_item = db.query(models.LineItem).filter(
        models.LineItem.id == line_item_id,
        models.LineItem.quotation_id == quotation_id
    ).first()
    
    if not line_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Line item not found"
        )
    
    # Update fields
    if line_item_data.quantity is not None:
        line_item.quantity = line_item_data.quantity
    if line_item_data.discount is not None:
        line_item.discount = line_item_data.discount
    
    # Recalculate line item
    calculate_line_item(line_item)
    
    db.commit()
    db.refresh(line_item)
    
    # Recalculate quotation totals
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    calculate_quotation(quotation)
    db.commit()
    
    return line_item


@router.delete("/{quotation_id}/line-items/{line_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_line_item(
    quotation_id: int,
    line_item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a line item. Only REP, MANAGER, and ADMIN can delete."""
    # Role-based access control
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales Reps, Managers, and Admins can delete line items"
        )
    
    line_item = db.query(models.LineItem).filter(
        models.LineItem.id == line_item_id,
        models.LineItem.quotation_id == quotation_id
    ).first()
    
    if not line_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Line item not found"
        )
    
    db.delete(line_item)
    db.commit()
    
    # Recalculate quotation totals
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if quotation:
        calculate_quotation(quotation)
        db.commit()
    
    return None
