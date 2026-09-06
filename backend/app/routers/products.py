from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user, require_admin

router = APIRouter(prefix="/products", tags=["products"])

@router.get("", response_model=List[schemas.Product])
def get_products(
    category: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all products, optionally filtered by category."""
    query = db.query(models.Product)
    
    if category:
        query = query.filter(models.Product.category == category)
    
    products = query.limit(limit).all()
    return products

@router.get("/{product_id}", response_model=schemas.Product)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific product by ID."""
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product

@router.get("/suggestions/{quotation_id}", response_model=List[schemas.Product])
def get_product_suggestions(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get upsell/cross-sell product suggestions for a quotation."""
    # For now, return products with high margin or promo discounts
    # In a real system, this would use ML or rule-based recommendations
    suggestions = db.query(models.Product).filter(
        (models.Product.margin != None) | (models.Product.promo_discount != None)
    ).limit(3).all()
    
    return suggestions

@router.post("", response_model=schemas.Product)
def create_product(
    product_data: schemas.ProductBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Create a new product"""
    # Check if product_id already exists
    existing = db.query(models.Product).filter(
        models.Product.product_id == product_data.product_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product ID already exists"
        )
    
    product = models.Product(**product_data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.put("/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: str,
    product_data: schemas.ProductBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Update an existing product"""
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product_data.dict(exclude_unset=True).items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Delete a product"""
    product = db.query(models.Product).filter(
        models.Product.product_id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return {"success": True, "message": "Product deleted"}
