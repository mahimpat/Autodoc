from fastapi import APIRouter, UploadFile, File, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import os, time, uuid, json

from ..auth import get_current_user, get_db
from ..models import Document, User, Snippet, PinnedSnippet
from ..llm.orchestrator import load_template, seed_empty_outline, stream_section, search_snippets_hybrid as search_snippets
from ..processing.extract import extract_text_cached, to_snippets
from ..llm.model_interface import unified_client
from ..settings import settings
from ..billing import enforce_or_raise, record_generation

router = APIRouter(prefix="/ingest", tags=["ingest"])

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _sse(e: dict) -> bytes:
    return f"data: {json.dumps(e, ensure_ascii=False)}\n\n".encode("utf-8")

def _analyze_extracted_content(text: str, filename: str) -> dict:
    """Analyze extracted content to provide user feedback"""
    analysis = {}
    
    if not text or len(text.strip()) < 10:
        analysis["content_type"] = "empty"
        analysis["status_message"] = "No readable content found"
        return analysis
    
    # Detect content types
    content_indicators = []
    
    if "=== PAGE" in text:
        content_indicators.append("multi-page PDF")
    if "=== TABLE" in text or "|" in text:
        content_indicators.append("tables")
    if "TITLE:" in text or "AUTHOR:" in text:
        content_indicators.append("document metadata")
    if len(text.split("\n")) > 20:
        content_indicators.append("structured text")
    if any(word in text.lower() for word in ["bullet", "•", "numbered", "list"]):
        content_indicators.append("lists")
    
    # Estimate content quality
    words = len(text.split())
    lines = len([l for l in text.split("\n") if l.strip()])
    
    if words < 50:
        quality = "short"
    elif words < 500:
        quality = "medium"
    else:
        quality = "extensive"
    
    analysis["content_type"] = ", ".join(content_indicators) if content_indicators else "plain text"
    analysis["word_count"] = words
    analysis["line_count"] = lines
    analysis["quality"] = quality
    analysis["status_message"] = f"Extracted {quality} content with {words} words"
    
    return analysis


@router.options("/upload")
async def options_upload():
    # Let CORSMiddleware set the headers; just return 200
    from fastapi import Response
    return Response(status_code=200)

@router.post("/upload")
async def upload(files: List[UploadFile] = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = []
    for f in files:
        name = f"{int(time.time())}-{uuid.uuid4().hex}-{f.filename}"
        path = os.path.join(UPLOAD_DIR, name)
        with open(path, "wb") as out:
            out.write(await f.read())
        
        file_info = {"name": f.filename, "path": path, "snippets": 0}
        saved.append(file_info)

        # Extract → chunk → embed → store
        text = extract_text_cached(path)
        print(f"DEBUG UPLOAD: Extracted text from {f.filename}: {len(text)} characters")
        if text:
            print(f"DEBUG UPLOAD: Text preview: {text[:300]}...")
        else:
            print(f"DEBUG UPLOAD: No text extracted from {f.filename}")
        
        # Analyze content type for better user feedback
        content_analysis = _analyze_extracted_content(text, f.filename)
        file_info.update(content_analysis)
        
        chunks = to_snippets(text)
        print(f"DEBUG UPLOAD: Created {len(chunks)} chunks from {f.filename}")
        
        if chunks:
            embeds = unified_client.embed_texts(chunks)
            for i, (ch, emb) in enumerate(zip(chunks, embeds)):
                sn = Snippet(user_id=user.id, project="default", path=path, text=ch, embedding=emb)
                db.add(sn)
                if i < 3:  # Print first 3 chunks for debugging
                    print(f"DEBUG UPLOAD: Chunk {i} (length {len(ch)}): {ch[:200]}...")
            db.commit()
            file_info["snippets"] = len(chunks)
            file_info["extracted_length"] = len(text)
            print(f"DEBUG UPLOAD: Stored {len(chunks)} snippets in database for user {user.id}")
        else:
            print(f"DEBUG UPLOAD: No chunks created for {f.filename} - text might be too short or empty")
            file_info["extraction_error"] = "No meaningful content extracted"

    return {"ok": True, "files": saved}

@router.get("/stream_generate")
def stream_generate(project: str, title: str, template: str, description: str = "", model: str | None = None, system: str | None = None, request: Request = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = Document(user_id=user.id, title=title, template=template, content=None)
    db.add(d); db.commit(); db.refresh(d)

    try:
        tpl = load_template(template)
        outline = seed_empty_outline(tpl, title)
    except Exception:
        outline = {"title": title, "mode": "technical document", "sections": [{"heading": "Introduction"}, {"heading": "Method"}, {"heading": "Conclusion"}]}
    mode = outline.get("mode", "technical document")
    headings = [s.get("heading") for s in outline.get("sections", []) if s.get("heading")]

    def gen():
        try:
            enforce_or_raise(db, user, 2000)
        except Exception:
            yield _sse({"event":"payment_required"}); return
        yield _sse({"event": "start"})
        
        document_content = f"# {title}\n\n"
        total_chars = 0
        
        for idx, heading in enumerate(headings):
            yield _sse({"event": "section_begin", "index": idx, "heading": heading})
            # RAG: Get ALL relevant snippets from uploaded sources, prioritizing recent uploads
            try:
                # Search for content related to this section
                q = f"{heading} {title} {description}"
                topk = int(os.getenv("RAG_TOPK", "20"))  # Further increased to get more source material
                hits = search_snippets(db, user.id, "default", q, topk=topk)
                
                # Get pinned snippets for this section
                pinned = db.query(PinnedSnippet).filter_by(user_id=user.id, doc_id=d.id, section_index=idx).all()
                pinned_texts = []
                pinned_ids = []
                for p in pinned:
                    sn = db.get(Snippet, p.snippet_id)
                    if sn:
                        pinned_texts.append(sn.text)
                        pinned_ids.append(sn.id)
                
                # Get ALL user uploaded content first (recent uploads prioritized)
                # Try both the requested project and "default" to ensure we find uploaded content
                all_user_snippets = db.query(Snippet).filter_by(user_id=user.id, project=project).order_by(Snippet.id.desc()).all()
                if not all_user_snippets:
                    all_user_snippets = db.query(Snippet).filter_by(user_id=user.id, project="default").order_by(Snippet.id.desc()).all()
                # Last resort: get ANY snippets for this user regardless of project
                if not all_user_snippets:
                    all_user_snippets = db.query(Snippet).filter_by(user_id=user.id).order_by(Snippet.id.desc()).all()
                print(f"DEBUG: Found {len(all_user_snippets)} snippets for user {user.id} (tried project '{project}', 'default', then any project)")
                
                if all_user_snippets:
                    # If we have uploaded sources, use ONLY those (no external search)
                    source_texts = [snippet.text for snippet in all_user_snippets]
                    
                    # Improved relevance scoring with fuzzy matching
                    scored_sources = []
                    keywords = [heading.lower(), title.lower()] + [word.lower() for word in heading.split() + title.split() if len(word) > 3]
                    
                    # Add document type keywords for better matching
                    doc_type_keywords = []
                    if 'contract' in title.lower() or 'legal' in title.lower():
                        doc_type_keywords.extend(['agreement', 'contract', 'party', 'parties', 'terms', 'conditions', 'obligations', 'rights', 'liability', 'payment', 'breach', 'termination', 'dispute', 'jurisdiction', 'governing', 'law'])
                    if 'financial' in title.lower() or 'finance' in title.lower():
                        doc_type_keywords.extend(['amount', 'payment', 'cost', 'fee', 'expense', 'budget', 'revenue', 'profit', 'loss', 'financial', 'money', 'dollar'])
                    
                    all_keywords = keywords + doc_type_keywords
                    
                    for text in source_texts:
                        text_lower = text.lower()
                        score = 0
                        
                        # Exact keyword matches
                        for keyword in all_keywords:
                            if keyword in text_lower:
                                score += 2
                        
                        # Partial word matches
                        words = text_lower.split()
                        for keyword in all_keywords:
                            for word in words:
                                if len(word) > 4 and (keyword in word or word in keyword):
                                    score += 1
                        
                        # Base score for any uploaded content (user intent matters)
                        score += 1
                        
                        # Length bonus (longer snippets often have more info)
                        score += min(len(text) / 500, 2)
                        
                        scored_sources.append((text, score))
                    
                    # Sort by relevance score and take more content
                    scored_sources.sort(key=lambda x: x[1], reverse=True)
                    
                    # Use all sources if score is low across the board (user uploaded specific content)
                    # Lower threshold - user uploaded content is always relevant to their chosen template
                    if not scored_sources or scored_sources[0][1] < 0.5:
                        relevant_sources = source_texts  # Use ALL uploaded content - user chose this template for a reason
                    else:
                        relevant_sources = [text for text, score in scored_sources]  # Use ALL scored content
                    
                    # Combine with pinned content
                    ordered = [*pinned_texts] + relevant_sources
                    hit_ids = []  # No external hits when using uploaded content
                else:
                    # No uploaded sources - fall back to search (but this shouldn't happen much)
                    hit_texts = [txt for (_id, txt, _s, _p) in hits]
                    hit_ids = [_id for (_id, txt, _s, _p) in hits]
                    ordered = [*pinned_texts] + hit_texts
                
                # Remove duplicates while preserving order
                seen = set()
                unique = []
                for s in ordered:
                    if s and s.strip() and s not in seen:
                        unique.append(s)
                        seen.add(s)
                
                # Create source excerpt with clear separation
                if unique:
                    excerpt = "\n\n=== SOURCE DOCUMENT ===\n".join(unique)
                    print(f"DEBUG: Using {len(unique)} source excerpts for section '{heading}', total length: {len(excerpt)} chars")
                    print(f"DEBUG: First excerpt preview: {unique[0][:200]}..." if unique else "")
                else:
                    excerpt = "[No source material uploaded - please upload your notes, documents, or images]"
                    print(f"DEBUG: No source material found for section '{heading}' - all_user_snippets count: {len(all_user_snippets) if all_user_snippets else 0}")
                    if all_user_snippets:
                        print(f"DEBUG: Sample snippet text: {all_user_snippets[0].text[:200]}..." if all_user_snippets[0].text else "empty text")
                
                # emit citation events for pinned and hit snippets
                for pid in pinned_ids:
                    yield _sse({"event":"cite","snippet_id": pid, "index": idx})
                for hid in hit_ids[:topk]:
                    yield _sse({"event":"cite","snippet_id": hid, "index": idx})
            except Exception:
                excerpt = ""

            # Add section heading to document
            document_content += f"## {heading}\n\n"
            
            try:
                section_content = ""
                # Create source-focused system prompt
                source_system = "You are a professional document writer who transforms rough notes, handwritten content, and source materials into polished documentation. You ONLY use information provided in the source material and never add external knowledge or assumptions."
                final_system = f"{source_system}\n\n{system}" if system else source_system
                
                for tok in stream_section(mode=mode, title=title, heading=heading, user_context="", source_excerpt=excerpt, model=model, system=final_system):
                    yield _sse({"event": "token", "text": tok})
                    total_chars += len(tok)
                    section_content += tok
                document_content += section_content + "\n\n"
            except Exception as e:
                error_msg = f"\n[Generation error: {e}]\n"
                yield _sse({"event": "token", "text": error_msg})
                document_content += error_msg + "\n\n"
            yield _sse({"event": "section_end", "index": idx})
        
        # Save the complete document content
        d.content = document_content
        db.commit()
        
        yield _sse({"event": "saved", "doc_id": d.id, "content": document_content});
        try:
            record_generation(db, user, total_chars)
        except Exception:
            pass
        yield _sse({"event": "done"})
    return StreamingResponse(gen(), media_type="text/event-stream")
