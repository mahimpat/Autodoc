from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..models import User, Document
from ..auth import get_current_user, get_db
from ..utils.pdf_generator import generate_document_pdf
from datetime import datetime
import re

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/pdf/{doc_id}")
async def export_document_pdf(
    doc_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export document as PDF with AutoDoc branding"""
    
    # Get document and verify ownership
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.content:
        raise HTTPException(status_code=400, detail="Document has no content to export")
    
    try:
        # Generate PDF
        pdf_bytes = generate_document_pdf(
            document_content=document.content,
            title=document.title,
            author=user.email
        )
        
        # Create safe filename
        safe_filename = re.sub(r'[^\w\s-]', '', document.title.strip())
        safe_filename = re.sub(r'[-\s]+', '-', safe_filename)
        filename = f"{safe_filename}-autodoc.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Type": "application/pdf"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate PDF: {str(e)}"
        )

@router.get("/preview/{doc_id}")
async def preview_document_pdf(
    doc_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview document as PDF in browser"""
    
    # Get document and verify ownership
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.content:
        raise HTTPException(status_code=400, detail="Document has no content to preview")
    
    try:
        # Generate PDF
        pdf_bytes = generate_document_pdf(
            document_content=document.content,
            title=document.title,
            author=user.email
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline",
                "Content-Type": "application/pdf"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate PDF: {str(e)}"
        )