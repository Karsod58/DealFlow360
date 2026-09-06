from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Tuple
from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user, require_finance
from app.routers.websocket import broadcast_fulfillment_update

router = APIRouter(prefix="/fulfillment", tags=["fulfillment"])


def calculate_warehouse_split(
    db: Session,
    quotation_id: int
) -> List[schemas.FulfillmentCalculation]:
    """
    Greedy warehouse split algorithm:
    1. Try to fulfill from single warehouse first (minimize shipments)
    2. If no single warehouse has enough stock, use greedy allocation
    3. Track backorders for items that can't be fulfilled
    """
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    results = []
    
    for line_item in quotation.line_items:
        # Get all warehouses with this product in stock
        stock_levels = db.query(models.StockLevel, models.Warehouse).join(
            models.Warehouse
        ).filter(
            models.StockLevel.product_id == line_item.product_id
        ).all()
        
        if not stock_levels:
            # No stock anywhere - full backorder
            results.append(schemas.FulfillmentCalculation(
                quotation_id=quotation_id,
                line_item_id=line_item.id,
                product_name=line_item.product_name,
                total_quantity=line_item.quantity,
                splits=[],
                total_cost=0.0,
                backorder_quantity=line_item.quantity
            ))
            continue
        
        required_qty = line_item.quantity
        splits = []
        
        # Strategy 1: Try single warehouse fulfillment
        single_warehouse = None
        for stock, warehouse in stock_levels:
            available = stock.in_stock - stock.reserved
            if available >= required_qty:
                single_warehouse = (stock, warehouse, available)
                break
        
        if single_warehouse:
            # Can fulfill from single warehouse
            stock, warehouse, available = single_warehouse
            splits.append(schemas.FulfillmentSplitWithWarehouse(
                warehouse_name=warehouse.name,
                warehouse_code=warehouse.warehouse_code,
                product_name=line_item.product_name,
                quantity_fulfilled=required_qty,
                estimated_shipments=1,
                shipping_cost=warehouse.shipping_cost_base,
                is_backorder=False
            ))
            total_cost = warehouse.shipping_cost_base
            backorder_qty = 0
        else:
            # Strategy 2: Greedy allocation across multiple warehouses
            # Sort by available quantity (descending) to minimize warehouses used
            sorted_stock = sorted(
                [(s, w, s.in_stock - s.reserved) for s, w in stock_levels],
                key=lambda x: x[2],
                reverse=True
            )
            
            remaining = required_qty
            total_cost = 0.0
            warehouses_used = 0
            
            for stock, warehouse, available in sorted_stock:
                if remaining <= 0:
                    break
                
                if available > 0:
                    fulfill_qty = min(available, remaining)
                    splits.append(schemas.FulfillmentSplitWithWarehouse(
                        warehouse_name=warehouse.name,
                        warehouse_code=warehouse.warehouse_code,
                        product_name=line_item.product_name,
                        quantity_fulfilled=fulfill_qty,
                        estimated_shipments=1,
                        shipping_cost=warehouse.shipping_cost_base,
                        is_backorder=False
                    ))
                    remaining -= fulfill_qty
                    total_cost += warehouse.shipping_cost_base
                    warehouses_used += 1
            
            backorder_qty = remaining if remaining > 0 else 0
            
            # If there's a backorder, add it as a split
            if backorder_qty > 0:
                splits.append(schemas.FulfillmentSplitWithWarehouse(
                    warehouse_name="Backorder",
                    warehouse_code="BACKORDER",
                    product_name=line_item.product_name,
                    quantity_fulfilled=backorder_qty,
                    estimated_shipments=0,
                    shipping_cost=0.0,
                    is_backorder=True
                ))
        
        results.append(schemas.FulfillmentCalculation(
            quotation_id=quotation_id,
            line_item_id=line_item.id,
            product_name=line_item.product_name,
            total_quantity=line_item.quantity,
            splits=splits,
            total_cost=total_cost,
            backorder_quantity=backorder_qty
        ))
    
    return results


@router.get("/stock", response_model=List[schemas.StockWithWarehouse])
def get_stock_levels(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all stock levels across all warehouses. Only FINANCE and ADMIN can view."""
    # Role-based access control - STRICT: Only FINANCE and ADMIN
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance and Admin users can view stock levels"
        )
    
    stock_data = db.query(models.StockLevel, models.Warehouse).join(
        models.Warehouse
    ).all()
    
    result = []
    for stock, warehouse in stock_data:
        # Calculate available
        stock_dict = {
            "id": stock.id,
            "warehouse_id": stock.warehouse_id,
            "product_id": stock.product_id,
            "product_name": stock.product_name,
            "in_stock": stock.in_stock,
            "reserved": stock.reserved,
            "available": stock.in_stock - stock.reserved,
            "created_at": stock.created_at,
            "updated_at": stock.updated_at
        }
        
        result.append(schemas.StockWithWarehouse(
            warehouse=warehouse,
            stock=schemas.StockLevel(**stock_dict)
        ))
    
    return result


@router.get("/orders", response_model=List[schemas.QuotationList])
def get_orders_awaiting_fulfillment(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get quotations that are approved but not yet fulfilled. Only FINANCE and ADMIN."""
    # Role-based access control - STRICT: Only FINANCE and ADMIN
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance and Admin users can view orders awaiting fulfillment"
        )
    
    quotations = db.query(models.Quotation).filter(
        models.Quotation.status == models.QuotationStatus.APPROVED
    ).all()
    
    # Filter out quotations that already have accepted fulfillment splits
    result = []
    for q in quotations:
        existing_splits = db.query(models.FulfillmentSplit).filter(
            models.FulfillmentSplit.quotation_id == q.id,
            models.FulfillmentSplit.status == models.FulfillmentStatus.ACCEPTED
        ).count()
        
        if existing_splits == 0:
            result.append(q)
    
    return result


@router.get("/{quotation_id}/calculate-split", response_model=List[schemas.FulfillmentCalculation])
async def calculate_split(
    quotation_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Calculate warehouse split for a quotation. FINANCE/ADMIN can calculate."""
    # Role-based access control
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance or Admin can calculate warehouse splits"
        )
    
    calculations = calculate_warehouse_split(db, quotation_id)
    
    # Get quotation for broadcast
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if quotation:
        # Broadcast WebSocket update
        background_tasks.add_task(
            broadcast_fulfillment_update,
            fulfillment_id=quotation_id,
            action="calculated",
            user_id=current_user.id,
            data={
                "quotation_number": quotation.quotation_number,
                "customer_name": quotation.customer.name if quotation.customer else "Unknown",
                "splits_count": len(calculations)
            }
        )
    
    return calculations


@router.post("/{quotation_id}/accept-split", response_model=schemas.Quotation)
async def accept_split(
    quotation_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_finance)
):
    """Accept the calculated warehouse split and persist it."""
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Calculate split
    calculations = calculate_warehouse_split(db, quotation_id)
    
    # Persist splits
    for calc in calculations:
        for split_data in calc.splits:
            # Find warehouse by code
            warehouse = db.query(models.Warehouse).filter(
                models.Warehouse.warehouse_code == split_data.warehouse_code
            ).first()
            
            if not warehouse:
                continue  # Skip backorders for now
            
            fulfillment_split = models.FulfillmentSplit(
                quotation_id=quotation_id,
                line_item_id=calc.line_item_id,
                warehouse_id=warehouse.id,
                quantity_fulfilled=split_data.quantity_fulfilled,
                estimated_shipments=split_data.estimated_shipments,
                shipping_cost=split_data.shipping_cost,
                status=models.FulfillmentStatus.ACCEPTED,
                is_backorder=1 if split_data.is_backorder else 0
            )
            db.add(fulfillment_split)
            
            # Reserve stock
            if not split_data.is_backorder:
                stock = db.query(models.StockLevel).filter(
                    models.StockLevel.warehouse_id == warehouse.id,
                    models.StockLevel.product_id == split_data.product_name  # This should be product_id
                ).first()
                
                if stock:
                    stock.reserved += split_data.quantity_fulfilled
    
    # Update quotation status
    quotation.status = models.QuotationStatus.CONFIRMED
    
    db.commit()
    db.refresh(quotation)
    
    # Log activity
    activity = models.AuditLog(
        quotation_id=quotation_id,
        user_id=current_user.id,
        action="Fulfillment accepted",
        note=f"Fulfillment split accepted for {quotation.quotation_number}"
    )
    db.add(activity)
    db.commit()
    
    # Broadcast WebSocket update
    background_tasks.add_task(
        broadcast_fulfillment_update,
        fulfillment_id=quotation_id,
        action="accepted",
        user_id=current_user.id,
        data={
            "quotation_number": quotation.quotation_number,
            "customer_name": quotation.customer.name if quotation.customer else "Unknown",
            "total_splits": len(calculations),
            "status": "confirmed"
        }
    )
    
    return quotation


@router.get("/{quotation_id}/splits", response_model=List[schemas.FulfillmentSplit])
def get_fulfillment_splits(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get saved fulfillment splits for a quotation. FINANCE/ADMIN/MANAGER can view."""
    # Role-based access control
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance, Admin, or Manager can view fulfillment splits"
        )
    
    splits = db.query(models.FulfillmentSplit).filter(
        models.FulfillmentSplit.quotation_id == quotation_id
    ).all()
    
    return splits
