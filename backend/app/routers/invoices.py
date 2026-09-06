"""
Invoices API endpoints
Handles invoice generation, payment recording, and delivery reconciliation
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app import models, schemas
from app.auth import get_current_active_user, require_finance
from app.routers.websocket import broadcast_invoice_update
from app import models, schemas
from app.auth import get_current_active_user, require_finance


router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=List[schemas.Invoice])
def get_invoices(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get all invoices with optional status filter
    Shows both one-time and recurring invoices
    Only FINANCE and ADMIN can view invoices
    """
    # Role-based access control - STRICT: Only FINANCE and ADMIN
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance and Admin users can view invoices"
        )
    query = db.query(models.Invoice)
    
    if status_filter:
        try:
            status_enum = models.InvoiceStatus[status_filter.upper()]
            query = query.filter(models.Invoice.status == status_enum)
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    invoices = query.order_by(models.Invoice.created_at.desc()).all()
    return invoices


@router.get("/{invoice_id}")
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get invoice detail with payment and delivery reconciliation
    Shows progress through: Order Confirmed → Shipped → Invoiced → Paid
    FINANCE/ADMIN can view invoice details
    """
    # Role-based access control
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance or Admin can view invoice details"
        )
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get payments for this invoice
    payments = db.query(models.Payment).filter(
        models.Payment.invoice_id == invoice.id
    ).order_by(models.Payment.created_at.desc()).all()
    
    # Calculate payment progress
    total_paid = sum(p.amount for p in payments if p.status == models.PaymentStatus.COMPLETED)
    amount_remaining = invoice.amount - total_paid
    
    # Determine progress step based on invoice and payment status
    progress_steps = {
        "order_confirmed": False,
        "shipped": False,
        "invoiced": False,
        "paid": False
    }
    
    # If invoice exists, order is confirmed
    progress_steps["order_confirmed"] = True
    
    # Check if associated with quotation and fulfillment
    if invoice.quotation_id:
        quotation = db.query(models.Quotation).filter(
            models.Quotation.id == invoice.quotation_id
        ).first()
        
        if quotation:
            # Check if fulfilled (has accepted splits)
            has_fulfillment = db.query(models.FulfillmentSplit).filter(
                models.FulfillmentSplit.quotation_id == quotation.id,
                models.FulfillmentSplit.status == models.FulfillmentStatus.ACCEPTED
            ).first()
            
            if has_fulfillment:
                progress_steps["shipped"] = True
    
    # Invoice created means invoiced step is complete
    progress_steps["invoiced"] = True
    
    # Check if fully paid
    if invoice.status == models.InvoiceStatus.PAID:
        progress_steps["paid"] = True
    
    # Get audit logs related to this invoice
    audit_logs = []
    if invoice.quotation_id:
        audit_logs = db.query(models.AuditLog).filter(
            models.AuditLog.quotation_id == invoice.quotation_id
        ).order_by(models.AuditLog.created_at.desc()).limit(10).all()
    
    return {
        "invoice": invoice,
        "line_items": invoice.line_items,
        "payments": payments,
        "total_paid": total_paid,
        "amount_remaining": amount_remaining,
        "progress_steps": progress_steps,
        "audit_logs": audit_logs
    }


@router.post("/{invoice_id}/record-payment")
async def record_payment(
    invoice_id: int,
    payment_data: schemas.PaymentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_finance)
):
    """
    Record payment for an invoice
    Updates invoice status and advances progress stepper
    """
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status == models.InvoiceStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is already fully paid"
        )
    
    # Calculate remaining amount
    existing_payments = db.query(models.Payment).filter(
        models.Payment.invoice_id == invoice.id,
        models.Payment.status == models.PaymentStatus.COMPLETED
    ).all()
    
    total_paid = sum(p.amount for p in existing_payments)
    amount_remaining = invoice.amount - total_paid
    
    # Validate payment amount
    if payment_data.amount > amount_remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ${payment_data.amount} exceeds remaining balance ${amount_remaining}"
        )
    
    # Create payment record
    payment = models.Payment(
        invoice_id=invoice.id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        status=models.PaymentStatus.COMPLETED,
        payment_date=datetime.utcnow()
    )
    db.add(payment)
    
    # Update invoice status
    new_total_paid = total_paid + payment_data.amount
    
    if new_total_paid >= invoice.amount:
        invoice.status = models.InvoiceStatus.PAID
        payment_status = "paid"
    elif new_total_paid > 0:
        invoice.status = models.InvoiceStatus.PARTIALLY_PAID
        payment_status = "partially_paid"
    
    invoice.updated_at = datetime.utcnow()
    
    # Create audit log if invoice is linked to quotation
    if invoice.quotation_id:
        audit_log = models.AuditLog(
            quotation_id=invoice.quotation_id,
            user_id=current_user.id,
            action="Payment Recorded",
            note=f"${payment_data.amount} payment recorded for invoice {invoice.invoice_number}. Method: {payment_data.payment_method or 'Not specified'}"
        )
        db.add(audit_log)
    
    db.commit()
    db.refresh(payment)
    db.refresh(invoice)
    
    # Broadcast WebSocket update
    background_tasks.add_task(
        broadcast_invoice_update,
        invoice_id=invoice.id,
        action=payment_status,
        user_id=current_user.id,
        data={
            "invoice_number": invoice.invoice_number,
            "customer_name": invoice.customer_name,
            "payment_amount": float(payment_data.amount),
            "total_paid": float(new_total_paid),
            "invoice_total": float(invoice.amount),
            "status": invoice.status.value
        }
    )
    
    return {
        "success": True,
        "payment": payment,
        "invoice": invoice,
        "message": f"Payment of ${payment_data.amount} recorded successfully"
    }


@router.post("/generate")
def generate_invoice(
    invoice_data: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Generate invoice from quotation or subscription
    Only invoices fulfilled quantities (partial invoicing for backorders)
    FINANCE/ADMIN can generate invoices
    """
    # Role-based access control
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Finance or Admin can generate invoices"
        )
    # Validate quotation exists if provided
    if invoice_data.quotation_id:
        quotation = db.query(models.Quotation).filter(
            models.Quotation.id == invoice_data.quotation_id
        ).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")
        
        # Check if quotation is in a state that can be invoiced
        if quotation.status not in [
            models.QuotationStatus.APPROVED,
            models.QuotationStatus.CONFIRMED
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quotation must be approved or confirmed before invoicing"
            )
    
    # Create invoice
    invoice = models.Invoice(
        invoice_number=invoice_data.invoice_number,
        customer_id=invoice_data.customer_id,
        customer_name=invoice_data.customer_name,
        quotation_id=invoice_data.quotation_id,
        subscription_id=invoice_data.subscription_id,
        amount=invoice_data.amount,
        status=models.InvoiceStatus.UNPAID,
        due_date=invoice_data.due_date or (datetime.utcnow() + timedelta(days=30)),
        is_recurring=invoice_data.is_recurring
    )
    db.add(invoice)
    db.flush()  # Get invoice ID
    
    # If invoice is from quotation, create line items from fulfilled quantities only
    if invoice_data.quotation_id:
        quotation = db.query(models.Quotation).filter(
            models.Quotation.id == invoice_data.quotation_id
        ).first()
        
        # Get fulfillment splits to determine what was actually shipped
        fulfillment_splits = db.query(models.FulfillmentSplit).filter(
            models.FulfillmentSplit.quotation_id == quotation.id,
            models.FulfillmentSplit.status == models.FulfillmentStatus.ACCEPTED,
            models.FulfillmentSplit.is_backorder == 0  # Don't invoice backorders
        ).all()
        
        # Group by line item
        fulfilled_quantities = {}
        for split in fulfillment_splits:
            if split.line_item_id not in fulfilled_quantities:
                fulfilled_quantities[split.line_item_id] = 0
            fulfilled_quantities[split.line_item_id] += split.quantity_fulfilled
        
        # Create invoice line items for fulfilled quantities
        for line_item in quotation.line_items:
            fulfilled_qty = fulfilled_quantities.get(line_item.id, 0)
            
            if fulfilled_qty > 0:
                invoice_line = models.InvoiceLineItem(
                    invoice_id=invoice.id,
                    product_id=line_item.product_id,
                    product_name=line_item.product_name,
                    quantity=fulfilled_qty,
                    unit_price=line_item.unit_price,
                    amount=line_item.unit_price * fulfilled_qty
                )
                db.add(invoice_line)
    
    # Create audit log
    if invoice_data.quotation_id:
        audit_log = models.AuditLog(
            quotation_id=invoice_data.quotation_id,
            user_id=current_user.id,
            action="Invoice Generated",
            note=f"Invoice {invoice_data.invoice_number} generated for ${invoice_data.amount}"
        )
        db.add(audit_log)
    
    db.commit()
    db.refresh(invoice)
    
    return {
        "success": True,
        "invoice": invoice,
        "message": f"Invoice {invoice.invoice_number} generated successfully"
    }


@router.get("/{invoice_id}/download")
def download_invoice_summary(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Download invoice summary (stub for PDF generation)
    In production, this would generate a PDF
    """
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # In production, generate PDF here
    # For now, return invoice data that could be used to generate PDF
    
    return {
        "success": True,
        "message": "PDF generation coming soon",
        "invoice_data": {
            "invoice_number": invoice.invoice_number,
            "customer_name": invoice.customer_name,
            "amount": invoice.amount,
            "status": invoice.status.value,
            "due_date": invoice.due_date,
            "line_items": [
                {
                    "product": item.product_name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "amount": item.amount
                }
                for item in invoice.line_items
            ]
        }
    }
