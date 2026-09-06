"""
Reports and PDF Export API endpoints
Generates PDF quotations and reports
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import io

from app.database import get_db
from app import models
from app.auth import get_current_active_user

# PDF generation (will use reportlab)
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


router = APIRouter(prefix="/reports", tags=["reports"])


def generate_quotation_pdf(quotation: models.Quotation, customer: models.Customer) -> bytes:
    """
    Generate a professional PDF quotation document
    """
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF generation not available. Install reportlab: pip install reportlab"
        )
    
    # Create PDF buffer
    buffer = io.BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
    )
    
    # Container for PDF elements
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#374151'),
        spaceAfter=12,
    )
    
    # Company Header
    elements.append(Paragraph("DealFlow360", title_style))
    elements.append(Paragraph("Sales Quotation Management System", styles['Normal']))
    elements.append(Spacer(1, 0.3 * inch))
    
    # Quotation Title
    elements.append(Paragraph(f"QUOTATION {quotation.quotation_number}", heading_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Quotation Details
    details_data = [
        ['Quotation Number:', quotation.quotation_number],
        ['Date:', quotation.created_at.strftime('%Y-%m-%d')],
        ['Status:', quotation.status.value],
        ['', ''],
        ['Customer:', customer.name],
        ['Email:', customer.email],
        ['Company:', customer.company or 'N/A'],
        ['Tier:', customer.tier or 'Standard'],
    ]
    
    details_table = Table(details_data, colWidths=[2*inch, 4*inch])
    details_table.setStyle(TableStyle([
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONT', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(details_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Line Items Section
    elements.append(Paragraph("Line Items", heading_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Line items table
    line_items_data = [
        ['Product', 'Qty', 'Unit Price', 'Discount', 'Total']
    ]
    
    for item in quotation.line_items:
        line_items_data.append([
            item.product_name,
            str(item.quantity),
            f'${item.unit_price:,.2f}',
            f'{item.discount}%',
            f'${item.line_total:,.2f}'
        ])
    
    line_items_table = Table(line_items_data, colWidths=[2.5*inch, 0.7*inch, 1.2*inch, 0.8*inch, 1.2*inch])
    line_items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows
        ('FONT', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
    ]))
    
    elements.append(line_items_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Summary Section
    summary_data = [
        ['Subtotal:', f'${quotation.total_value:,.2f}'],
        ['Risk Score:', f'{quotation.blended_score:.2f} points'],
        ['', ''],
        ['TOTAL:', f'${quotation.total_value:,.2f}'],
    ]
    
    summary_table = Table(summary_data, colWidths=[4.5*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('FONT', (0, 0), (0, -2), 'Helvetica'),
        ('FONT', (0, -1), (0, -1), 'Helvetica-Bold'),
        ('FONT', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -2), 11),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1e40af')),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1e40af')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER
    )
    
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph(
        "This quotation is valid for 30 days from the date of issue.",
        footer_style
    ))
    elements.append(Paragraph(
        f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} by DealFlow360",
        footer_style
    ))
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


@router.get("/quotations/{quotation_id}/export")
async def export_quotation_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Export a quotation as PDF
    Available to: REP, MANAGER, FINANCE, ADMIN
    """
    # Role check
    if current_user.role not in [models.UserRole.REP, models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only internal users can export quotations"
        )
    
    # Get quotation
    quotation = db.query(models.Quotation).filter(
        models.Quotation.id == quotation_id
    ).first()
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found"
        )
    
    # Get customer
    customer = db.query(models.Customer).filter(
        models.Customer.id == quotation.customer_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # REP can only export their own quotations (MANAGER/FINANCE/ADMIN can export any)
    if current_user.role == models.UserRole.REP and quotation.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only export your own quotations"
        )
    
    # Generate PDF
    try:
        pdf_bytes = generate_quotation_pdf(quotation, customer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )
    
    # Create audit log
    audit_log = models.AuditLog(
        quotation_id=quotation.id,
        user_id=current_user.id,
        action="PDF Exported",
        note=f"{current_user.name} exported PDF for {quotation.quotation_number}"
    )
    db.add(audit_log)
    db.commit()
    
    # Return PDF as response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=quotation_{quotation.quotation_number}.pdf"
        }
    )


@router.get("/summary")
async def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get summary statistics for reports
    Only MANAGER, FINANCE, and ADMIN can access
    """
    if current_user.role not in [models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and Admins can view report summaries"
        )
    
    # Calculate statistics
    total_quotations = db.query(models.Quotation).count()
    total_value = db.query(models.func.sum(models.Quotation.total_value)).scalar() or 0
    
    approved_quotations = db.query(models.Quotation).filter(
        models.Quotation.status == models.QuotationStatus.APPROVED
    ).count()
    
    confirmed_quotations = db.query(models.Quotation).filter(
        models.Quotation.status == models.QuotationStatus.CONFIRMED
    ).count()
    
    avg_deal_size = total_value / total_quotations if total_quotations > 0 else 0
    
    return {
        "total_quotations": total_quotations,
        "total_value": float(total_value),
        "approved_quotations": approved_quotations,
        "confirmed_quotations": confirmed_quotations,
        "avg_deal_size": float(avg_deal_size),
        "conversion_rate": (confirmed_quotations / total_quotations * 100) if total_quotations > 0 else 0
    }
