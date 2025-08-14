from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..auth import get_db, get_current_user
from ..models import User, PinnedSnippet
from ..llm.orchestrator import search_snippets

router = APIRouter(prefix="/snippets", tags=["snippets"])

@router.get("")
def get_snippets(doc_id: int, section_query: str, topk: int = 6, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    hits = search_snippets(db, user.id, "default", section_query, topk=topk)
    return [{ "id": sid, "text": txt, "score": score, "path": path, "pinned": False } for sid, txt, score, path in hits]

@router.post("/pin")
def pin_snippet(doc_id: int, section_index: int, snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(PinnedSnippet).filter_by(user_id=user.id, doc_id=doc_id, section_index=section_index, snippet_id=snippet_id).first()
    if existing:
        return {"ok": True, "pinned": True}
    p = PinnedSnippet(user_id=user.id, doc_id=doc_id, section_index=section_index, snippet_id=snippet_id)
    db.add(p); db.commit()
    return {"ok": True, "pinned": True}

@router.delete("/pin")
def unpin_snippet(doc_id: int, section_index: int, snippet_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(PinnedSnippet).filter_by(user_id=user.id, doc_id=doc_id, section_index=section_index, snippet_id=snippet_id).first()
    if not existing:
        return {"ok": True, "pinned": False}
    db.delete(existing); db.commit()
    return {"ok": True, "pinned": False}


@router.get("/{sid}")
def get_snippet(sid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import Snippet
    sn = db.get(Snippet, sid)
    if not sn or user.id != sn.user_id:
        raise HTTPException(status_code=404, detail="Not found")
    return {"id": sn.id, "text": sn.text, "path": sn.path}


@router.get("/by_ids")
def get_snippets_by_ids(ids: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import Snippet
    try:
        arr = [int(x) for x in ids.split(',') if x.strip()]
    except Exception:
        arr = []
    if not arr:
        return []
    q = db.query(Snippet).filter(Snippet.user_id==user.id, Snippet.id.in_(arr)).all()
    return [{"id": s.id, "text": s.text, "path": s.path} for s in q]
