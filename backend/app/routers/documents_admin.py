from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import os
from io import BytesIO
from reportlab.pdfgen import canvas

from ..auth import get_current_user, get_db
from ..models import Document, User

router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("")
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Document).filter(Document.user_id == user.id).order_by(Document.created_at.desc()).limit(100).all()
    return [{"id": d.id, "title": d.title, "template": d.template, "created_at": d.created_at.isoformat() if d.created_at else None} for d in q]

@router.delete("/{doc_id}")
def delete_document(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d or d.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(d); db.commit()
    return {"ok": True}

@router.put("/{doc_id}")
def save_document(doc_id: int, payload: Dict[str, Any], user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d or d.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    if "title" in payload: d.title = payload["title"]
    if "template" in payload: d.template = payload["template"]
    if "content" in payload: d.content = payload["content"]
    db.add(d); db.commit()
    return {"ok": True}

def outline_to_markdown(title: str, content: Dict[str, Any]) -> str:
    md = [f"# {title}"]
    if not content: return "\n".join(md)
    sections = content.get("sections", [])
    for s in sections:
        h = s.get("heading") or "Section"
        body = s.get("content") or s.get("summary") or ""
        md.append(f"\n## {h}\n\n{body}")
    return "\n".join(md)

@router.get("/{doc_id}.md")
def export_md(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d or d.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    md = outline_to_markdown(d.title, d.content or {})
    path = f"/app/_local_store/exports/doc_{doc_id}.md"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(md)
    return FileResponse(path, filename=f"{d.title}.md", media_type="text/markdown")

@router.get("/{doc_id}.pdf")
def export_pdf(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d or d.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    md = outline_to_markdown(d.title, d.content or {})
    # Simple text-to-PDF
    path = f"/app/_local_store/exports/doc_{doc_id}.pdf"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    from reportlab.lib.pagesizes import A4
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    y = height - 40
    for line in md.split("\n"):
        c.drawString(40, y, line[:120])
        y -= 16
        if y < 40:
            c.showPage(); y = height - 40
    c.save()
    return FileResponse(path, filename=f"{d.title}.pdf", media_type="application/pdf")


@router.get("/{doc_id}")
def get_document(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d or d.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    return {"id": d.id, "title": d.title, "template": d.template, "content": d.content, "created_at": d.created_at.isoformat() if d.created_at else None}
