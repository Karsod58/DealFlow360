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


@router.get("/quotations/filtered")
def get_filtered_quotations(
    period: Optional[str] = None,  # "7d", "30d", "90d", "1y"
    sales_team: Optional[str] = None,  # REP user name
    approval_status: Optional[str] = None,  # PENDING, APPROVED, REJECTED
    product_category: Optional[str] = None,  # Hardware, Services, etc
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get filtered quotation reports with business intelligence."""
    from datetime import timedelta
    
    query = db.query(models.Quotation)
    
    # Period filter
    if period:
        days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
        if period in days_map:
            cutoff = datetime.utcnow() - timedelta(days=days_map[period])
            query = query.filter(models.Quotation.created_at >= cutoff)
    
    # Sales team filter (by created_by user)
    if sales_team:
        user = db.query(models.User).filter(models.User.name.ilike(f"%{sales_team}%")).first()
        if user:
            query = query.filter(models.Quotation.created_by_id == user.id)
    
    # Approval status filter
    if approval_status and approval_status.upper() in ['PENDING_APPROVAL', 'APPROVED', 'REJECTED']:
        query = query.filter(models.Quotation.status == models.QuotationStatus(approval_status.upper()))
    
    # Product category filter (join with line items)
    if product_category:
        query = query.join(models.LineItem).join(models.Product).filter(
            models.Product.category.ilike(f"%{product_category}%")
        ).distinct()
    
    quotations = query.order_by(models.Quotation.created_at.desc()).limit(100).all()
    
    # Calculate summary metrics
    total_value = sum(q.total_value for q in quotations)
    avg_value = total_value / len(quotations) if quotations else 0
    high_risk_count = sum(1 for q in quotations if q.blended_score > 5)
    
    return {
        "quotations": [
            {
                "id": q.id,
                "quotation_number": q.quotation_number,
                "customer_name": q.customer.name if q.customer else "Unknown",
                "status": q.status.value,
                "total_value": q.total_value,
                "blended_score": q.blended_score,
                "created_by": q.created_by.name if q.created_by else "Unknown",
                "created_at": q.created_at.isoformat()
            } for q in quotations
        ],
        "summary": {
            "total_count": len(quotations),
            "total_value": total_value,
            "average_value": avg_value,
            "high_risk_count": high_risk_count
        },
        "filters_applied": {
            "period": period,
            "sales_team": sales_team,
            "approval_status": approval_status,
            "product_category": product_category
        }
    }


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

@router.get("/export/approvals")
async def export_approvals_report(
    format: str = "pdf",  # pdf or xlsx
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Export approvals report as PDF or Excel
    Available to: MANAGER, FINANCE, ADMIN
    """
    # Role check
    if current_user.role not in [models.UserRole.MANAGER, models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers, finance, and admins can export approval reports"
        )
    
    # Get approvals data
    query = db.query(models.Quotation).filter(
        models.Quotation.status.in_([
            models.QuotationStatus.PENDING_APPROVAL,
            models.QuotationStatus.APPROVED,
            models.QuotationStatus.REJECTED
        ])
    )
    
    if status_filter:
        try:
            status_enum = models.QuotationStatus(status_filter.upper())
            query = query.filter(models.Quotation.status == status_enum)
        except ValueError:
            pass
    
    approvals = query.order_by(models.Quotation.created_at.desc()).all()
    
    if format.lower() == "pdf":
        if not REPORTLAB_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="PDF generation not available"
            )
        
        # Generate PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # Title
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], alignment=TA_CENTER)
        title = Paragraph("Approvals Report", title_style)
        
        # Table data
        data = [['Quotation', 'Customer', 'Total Value', 'Risk Score', 'Status', 'Created']]
        for approval in approvals:
            data.append([
                approval.quotation_number,
                approval.customer.name if approval.customer else 'Unknown',
                f'${approval.total_value:,.2f}',
                f'{approval.blended_score:.1f}',
                approval.status.value,
                approval.created_at.strftime('%Y-%m-%d')
            ])
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        # Build PDF
        story = [title, Spacer(1, 20), table]
        doc.build(story)
        
        pdf_data = buffer.getvalue()
        buffer.close()
        
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=approvals_report.pdf"}
        )
    
    elif format.lower() in ["xlsx", "excel"]:
        import openpyxl
        from openpyxl.styles import Font, PatternFill
        
        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Approvals Report"
        
        # Headers
        headers = ['Quotation', 'Customer', 'Total Value', 'Risk Score', 'Status', 'Created']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        
        # Data
        for row, approval in enumerate(approvals, 2):
            ws.cell(row=row, column=1, value=approval.quotation_number)
            ws.cell(row=row, column=2, value=approval.customer.name if approval.customer else 'Unknown')
            ws.cell(row=row, column=3, value=approval.total_value)
            ws.cell(row=row, column=4, value=approval.blended_score)
            ws.cell(row=row, column=5, value=approval.status.value)
            ws.cell(row=row, column=6, value=approval.created_at.strftime('%Y-%m-%d'))
        
        # Save to buffer
        buffer = io.BytesIO()
        wb.save(buffer)
        xlsx_data = buffer.getvalue()
        buffer.close()
        
        return Response(
            content=xlsx_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=approvals_report.xlsx"}
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format must be 'pdf' or 'xlsx'"
        )