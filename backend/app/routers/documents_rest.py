from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..auth import get_current_user, get_db
from ..models import Document, User

router = APIRouter(prefix="/documents", tags=["documents"])

class DocumentUpdate(BaseModel):
    content: str

@router.put("/{doc_id}")
def update_document(
    doc_id: int, 
    update_data: DocumentUpdate,
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Find the document and verify ownership
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update the content
    document.content = update_data.content
    db.commit()
    
    return {"ok": True, "message": "Document updated successfully"}

@router.get("/{doc_id}")
def get_document(
    doc_id: int,
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Find the document and verify ownership
    document = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": document.id,
        "title": document.title,
        "content": document.content,
        "template": document.template,
        "created_at": document.created_at
    }
