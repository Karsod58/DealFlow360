"""
Admin configuration API endpoints
Manages discount ceilings, approval rules, and system configuration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user, require_manager_or_admin


router = APIRouter(prefix="/admin", tags=["admin"])


def check_admin_permission(current_user: models.User):
    """Verify user has admin or manager permissions"""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Manager permissions required"
        )


@router.get("/discount-ceilings", response_model=List[schemas.DiscountCeiling])
def get_discount_ceilings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    """
    Get all discount ceiling configurations
    Returns both tier-based and category-based ceilings
    """
    check_admin_permission(current_user)
    
    ceilings = db.query(models.DiscountCeiling).all()
    return ceilings


@router.post("/discount-ceilings", response_model=schemas.DiscountCeiling)
def create_discount_ceiling(
    ceiling_data: schemas.DiscountCeilingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    """
    Create or update discount ceiling configuration
    """
    check_admin_permission(current_user)
    
    # Check if ceiling already exists for this tier/category
    existing = None
    if ceiling_data.tier:
        existing = db.query(models.DiscountCeiling).filter(
            models.DiscountCeiling.tier == ceiling_data.tier,
            models.DiscountCeiling.category.is_(None)
        ).first()
    elif ceiling_data.category:
        existing = db.query(models.DiscountCeiling).filter(
            models.DiscountCeiling.category == ceiling_data.category,
            models.DiscountCeiling.tier.is_(None)
        ).first()
    
    if existing:
        # Update existing
        existing.max_discount = ceiling_data.max_discount
        existing.updated_at = models.func.now()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        ceiling = models.DiscountCeiling(
            tier=ceiling_data.tier,
            category=ceiling_data.category,
            max_discount=ceiling_data.max_discount
        )
        db.add(ceiling)
        db.commit()
        db.refresh(ceiling)
        return ceiling


@router.put("/discount-ceilings/{ceiling_id}", response_model=schemas.DiscountCeiling)
def update_discount_ceiling(
    ceiling_id: int,
    ceiling_data: schemas.DiscountCeilingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    """
    Update a discount ceiling configuration
    """
    check_admin_permission(current_user)
    
    ceiling = db.query(models.DiscountCeiling).filter(
        models.DiscountCeiling.id == ceiling_id
    ).first()
    
    if not ceiling:
        raise HTTPException(status_code=404, detail="Discount ceiling not found")
    
    ceiling.tier = ceiling_data.tier
    ceiling.category = ceiling_data.category
    ceiling.max_discount = ceiling_data.max_discount
    ceiling.updated_at = models.func.now()
    
    db.commit()
    db.refresh(ceiling)
    return ceiling


@router.delete("/discount-ceilings/{ceiling_id}")
def delete_discount_ceiling(
    ceiling_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    """
    Delete a discount ceiling configuration
    """
    check_admin_permission(current_user)
    
    ceiling = db.query(models.DiscountCeiling).filter(
        models.DiscountCeiling.id == ceiling_id
    ).first()
    
    if not ceiling:
        raise HTTPException(status_code=404, detail="Discount ceiling not found")
    
    db.delete(ceiling)
    db.commit()
    
    return {"success": True, "message": "Discount ceiling deleted"}


@router.get("/approval-rules")
def get_approval_rules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    """
    Get approval routing rules
    These are currently hardcoded constants but can be made configurable
    """
    check_admin_permission(current_user)
    
    # Current hardcoded rules (per spec)
    rules = [
        {
            "discount_range": "Within tier/category limit",
            "blended_score": "0",
            "action": "No approval needed (auto-approved)"
        },
        {
            "discount_range": "Over limit",
            "blended_score": "< 10 (Medium risk)",
            "action": "Sales Manager approval required"
        },
        {
            "discount_range": "Over limit",
            "blended_score": "≥ 10 (High risk)",
            "action": "Sales Manager then Finance approval required"
        }
    ]
    
    return {
        "rules": rules,
        "note": "Approval routing is based on blended risk score calculation. Score = sum of all line item discount overages."
    }


@router.post("/save-configuration")
def save_configuration(
    ceilings: List[schemas.DiscountCeilingCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    """
    Batch save all discount ceiling configurations
    """
    check_admin_permission(current_user)
    
    # Clear existing ceilings
    db.query(models.DiscountCeiling).delete()
    
    # Add new ceilings
    for ceiling_data in ceilings:
        ceiling = models.DiscountCeiling(
            tier=ceiling_data.tier,
            category=ceiling_data.category,
            max_discount=ceiling_data.max_discount
        )
        db.add(ceiling)
    
    db.commit()
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=None,
        user_id=current_user.id,
        action="Configuration Updated",
        note=f"Discount ceiling configuration saved: {len(ceilings)} entries"
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "success": True,
        "message": f"Configuration saved successfully. {len(ceilings)} discount ceilings configured."
    }


@router.get("/system-stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    """
    Get system statistics for admin dashboard
    """
    check_admin_permission(current_user)
    
    total_quotations = db.query(models.Quotation).count()
    pending_approvals = db.query(models.Quotation).filter(
        models.Quotation.status == models.QuotationStatus.PENDING_APPROVAL
    ).count()
    
    active_subscriptions = db.query(models.Subscription).filter(
        models.Subscription.status == models.SubscriptionStatus.ACTIVE
    ).count()
    
    unpaid_invoices = db.query(models.Invoice).filter(
        models.Invoice.status.in_([
            models.InvoiceStatus.UNPAID,
            models.InvoiceStatus.PARTIALLY_PAID
        ])
    ).count()
    
    total_users = db.query(models.User).count()
    total_products = db.query(models.Product).count()
    
    return {
        "total_quotations": total_quotations,
        "pending_approvals": pending_approvals,
        "active_subscriptions": active_subscriptions,
        "unpaid_invoices": unpaid_invoices,
        "total_users": total_users,
        "total_products": total_products
    }


# ============================================
# USER MANAGEMENT ENDPOINTS (ADMIN ONLY)
# ============================================

@router.get("/users", response_model=List[schemas.User])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get all internal users (ADMIN only)
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ADMIN can manage users"
        )
    
    users = db.query(models.User).all()
    return users


@router.post("/users", response_model=schemas.User)
def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Create a new internal user (ADMIN only)
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ADMIN can create users"
        )
    
    # Check if user with email already exists
    existing_user = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password
    from app.auth import get_password_hash
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user
    new_user = models.User(
        email=user_data.email,
        hashed_password=hashed_password,
        name=user_data.name,
        role=user_data.role if hasattr(user_data, 'role') else models.UserRole.REP,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=None,
        user_id=current_user.id,
        action="User Created",
        note=f"New user created: {new_user.email} ({new_user.role.value})"
    )
    db.add(audit_log)
    db.commit()
    
    return new_user


@router.get("/users/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get a specific user by ID (ADMIN only)
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ADMIN can view users"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Update a user (ADMIN only)
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ADMIN can update users"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields if provided
    if user_data.email is not None:
        # Check if email is already taken by another user
        existing = db.query(models.User).filter(
            models.User.email == user_data.email,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = user_data.email
    
    if user_data.name is not None:
        user.name = user_data.name
    
    if user_data.role is not None:
        user.role = user_data.role
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.password is not None:
        # Update password
        from app.auth import get_password_hash
        user.hashed_password = get_password_hash(user_data.password)
    
    db.commit()
    db.refresh(user)
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=None,
        user_id=current_user.id,
        action="User Updated",
        note=f"User updated: {user.email}"
    )
    db.add(audit_log)
    db.commit()
    
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Delete a user (ADMIN only)
    Cannot delete yourself
    """
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ADMIN can delete users"
        )
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    email = user.email
    
    # Create audit log before deleting
    audit_log = models.AuditLog(
        quotation_id=None,
        user_id=current_user.id,
        action="User Deleted",
        note=f"User deleted: {email}"
    )
    db.add(audit_log)
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": f"User {email} deleted successfully"}



# ============================================
# CUSTOMERS MANAGEMENT
# ============================================

@router.get("/customers", response_model=List[schemas.Customer])
def get_all_customers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get all customers (All authenticated users can access)
    """
    customers = db.query(models.Customer).order_by(models.Customer.name).all()
    return customers


@router.get("/customers/{customer_id}", response_model=schemas.Customer)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get a specific customer by ID (All authenticated users can access)
    """
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return customer


@router.post("/customers", response_model=schemas.Customer)
def create_customer(
    customer_data: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Create a new customer (REP, ADMIN only)
    """
    if current_user.role not in [models.UserRole.REP, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only REP and ADMIN can create customers"
        )
    
    # Check if customer with same email already exists
    existing = db.query(models.Customer).filter(
        models.Customer.email == customer_data.email
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this email already exists"
        )
    
    new_customer = models.Customer(**customer_data.dict())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return new_customer
