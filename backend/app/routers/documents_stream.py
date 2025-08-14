from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json, time, asyncio
from ..db import SessionLocal
from ..models import Document, User
from ..llm.orchestrator import stream_section, search_snippets_hybrid as search_snippets
from ..auth import get_current_user
router = APIRouter(prefix="/documents", tags=["documents-stream"])
def sse(data: dict) -> bytes: return f"data: {json.dumps(data)}\n\n".encode("utf-8")
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
HEARTBEAT_SEC = 10
@router.get("/{doc_id}/stream_regen")
async def stream_regen(request: Request, doc_id: int, index: int, model: str | None = None, system: str | None = None, hint: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc or doc.user_id != user.id: raise HTTPException(status_code=404, detail="Document not found")
    outline = doc.outline_json; mode = outline.get("mode", "Document")
    try: sec = outline["sections"][index]
    except Exception: raise HTTPException(status_code=400, detail="Invalid section index")
    heading = sec.get("heading")
    if hint is not None: sec["summary"] = hint
    combined = []
    for j, s in enumerate(outline.get("sections", []), start=1):
        if s.get("content"): combined.append(f"[S{j}] {s['content'][:800]}")
    sources_block = "\n".join(combined[:8]) if combined else "[S1] (no prior content)"
    user_ctx = sec.get("summary","")
    async def gen():
        try:
            enforce_or_raise(db, user, 1200)
        except Exception:
            yield _sse({"event":"payment_required"}); return
        last_ping = time.time()
        yield sse({"event": "section_begin", "index": index, "heading": heading, "hint": user_ctx})
        buf = []
        total_chars = 0
        for tok in stream_section(mode, outline.get("title",""), heading, user_ctx, sources_block, model=model):
            buf.append(tok); yield sse({"event": "token", "index": index, "text": tok})
            now = time.time()
            if now - last_ping > HEARTBEAT_SEC:
                yield sse({"event": "ping", "ts": now}); last_ping = now
            if await request.is_disconnected(): return
            await asyncio.sleep(0)
        outline["sections"][index]["content"] = "".join(buf); doc.outline_json = outline; db.add(doc); db.commit()
        yield sse({"event": "section_end", "index": index}); yield sse({"event": "saved", "doc_id": doc.id}); yield sse({"event": "done"})
    resp = StreamingResponse(gen(), media_type="text/event-stream")
    try:
        record_generation(db, user, total_chars)
    except Exception:
        pass
    return resp
