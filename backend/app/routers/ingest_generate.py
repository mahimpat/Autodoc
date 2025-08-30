from fastapi import APIRouter, UploadFile, File, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import os, time, uuid, json

from ..auth import get_current_user, get_db
from ..models import Document, User, Snippet, PinnedSnippet, Workspace
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

def _get_workspace_content(user: User, db: Session) -> List[str]:
    """Get content from user's current workspace, falling back to user's own content"""
    user_source_texts = []
    
    try:
        # First, try to get workspace-scoped content if user has a current workspace
        if user.current_organization_id:
            # Get user's current workspace from their organization
            current_workspace = db.query(Workspace).filter(
                Workspace.organization_id == user.current_organization_id,
                Workspace.is_active == True
            ).first()
            
            if current_workspace:
                # Get all shared snippets from the workspace (most recent first)
                workspace_snippets = db.query(Snippet).filter(
                    Snippet.workspace_id == current_workspace.id,
                    Snippet.is_shared == True
                ).order_by(Snippet.id.desc()).all()
                
                print(f"DEBUG WORKSPACE: Found {len(workspace_snippets)} shared snippets in workspace {current_workspace.name}")
                
                if workspace_snippets:
                    # Use recent workspace snippets with reasonable limit for LLM context
                    max_snippets = int(os.getenv("MAX_CONTENT_SNIPPETS", "300"))  # Configurable limit
                    limited_snippets = workspace_snippets[:max_snippets]
                    print(f"DEBUG WORKSPACE: Using {len(limited_snippets)} of {len(workspace_snippets)} shared workspace snippets")
                    
                    user_source_texts = [snippet.text for snippet in limited_snippets if snippet.text and snippet.text.strip()]
                    
                    print(f"DEBUG WORKSPACE: Using {len(user_source_texts)} snippets from all workspace uploads")
        
        # Fallback to user's personal content if no workspace content
        if not user_source_texts:
            print(f"DEBUG FALLBACK: No workspace content found, using user's personal content")
            all_user_snippets = db.query(Snippet).filter_by(user_id=user.id).order_by(Snippet.id.desc()).all()
            print(f"DEBUG FALLBACK: Found {len(all_user_snippets)} personal snippets")
            
            if all_user_snippets:
                # Use recent personal snippets with reasonable limit for LLM context
                max_snippets = int(os.getenv("MAX_CONTENT_SNIPPETS", "300"))  # Configurable limit
                limited_snippets = all_user_snippets[:max_snippets]
                print(f"DEBUG FALLBACK: Using {len(limited_snippets)} of {len(all_user_snippets)} personal snippets")
                
                user_source_texts = [snippet.text for snippet in limited_snippets if snippet.text and snippet.text.strip()]
                
                print(f"DEBUG FALLBACK: Using {len(user_source_texts)} snippets from all personal uploads")
    
    except Exception as e:
        print(f"DEBUG ERROR: Error fetching workspace content: {e}")
        user_source_texts = []
    
    return user_source_texts

def _analyze_extracted_content(text: str, filename: str) -> dict:
    """Analyze extracted content to provide comprehensive user feedback and processing guidance"""
    analysis = {}
    
    if not text or len(text.strip()) < 10:
        analysis["content_type"] = "empty"
        analysis["status_message"] = "No readable content found"
        analysis["documentation_potential"] = "none"
        return analysis
    
    text_lower = text.lower()
    
    # Detect document structure and content types
    structure_indicators = []
    content_types = []
    documentation_signals = []
    
    # Structure detection
    if "=== PAGE" in text:
        structure_indicators.append("multi-page PDF")
    if "=== TABLE" in text or text.count("|") > 5:
        structure_indicators.append("tables")
    if "TITLE:" in text or "AUTHOR:" in text:
        structure_indicators.append("document metadata")
    if len(text.split("\n")) > 20:
        structure_indicators.append("structured text")
    if any(word in text_lower for word in ["bullet", "•", "numbered", "list", "- ", "* "]):
        structure_indicators.append("lists")
    if text.count("##") > 3 or text.count("#") > 5:
        structure_indicators.append("markdown headers")
    
    # Content type detection (what kind of document this appears to be)
    if any(word in text_lower for word in ["api", "endpoint", "method", "request", "response", "json", "xml"]):
        content_types.append("API documentation")
        documentation_signals.append("technical specs")
    if any(word in text_lower for word in ["class", "function", "method", "variable", "import", "def ", "class "]):
        content_types.append("code documentation")
        documentation_signals.append("code reference")
    if any(word in text_lower for word in ["requirements", "specifications", "shall", "must", "should"]):
        content_types.append("requirements document")
        documentation_signals.append("requirements")
    if any(word in text_lower for word in ["meeting", "action items", "decisions", "attendees", "agenda"]):
        content_types.append("meeting notes")
        documentation_signals.append("decisions/notes")
    if any(word in text_lower for word in ["contract", "agreement", "terms", "conditions", "liability", "party"]):
        content_types.append("legal document")
        documentation_signals.append("legal/compliance")
    if any(word in text_lower for word in ["research", "study", "methodology", "results", "conclusion", "hypothesis"]):
        content_types.append("research document")
        documentation_signals.append("research/analysis")
    if any(word in text_lower for word in ["installation", "setup", "configuration", "deployment", "usage"]):
        content_types.append("technical guide")
        documentation_signals.append("procedures/setup")
    if any(word in text_lower for word in ["project", "timeline", "milestone", "deliverable", "scope"]):
        content_types.append("project documentation")
        documentation_signals.append("project planning")
    
    # Quality and complexity assessment
    words = len(text.split())
    lines = len([l for l in text.split("\n") if l.strip()])
    sentences = len([s for s in text.split(".") if s.strip()])
    
    if words < 50:
        quality = "brief"
        complexity = "simple"
    elif words < 200:
        quality = "concise"
        complexity = "simple" if sentences < 20 else "moderate"
    elif words < 1000:
        quality = "detailed"
        complexity = "moderate" if sentences < 50 else "complex"
    else:
        quality = "comprehensive"
        complexity = "complex"
    
    # Documentation potential assessment
    if content_types and words > 100:
        doc_potential = "high"
    elif content_types or words > 50:
        doc_potential = "medium"
    elif words > 20:
        doc_potential = "low"
    else:
        doc_potential = "minimal"
    
    # Compile analysis
    analysis["content_type"] = ", ".join(content_types) if content_types else "general document"
    analysis["structure"] = ", ".join(structure_indicators) if structure_indicators else "plain text"
    analysis["documentation_signals"] = documentation_signals
    analysis["word_count"] = words
    analysis["line_count"] = lines
    analysis["quality"] = quality
    analysis["complexity"] = complexity
    analysis["documentation_potential"] = doc_potential
    
    # Create comprehensive status message
    if content_types:
        primary_type = content_types[0]
        analysis["status_message"] = f"Detected {primary_type} with {quality} content ({words} words, {doc_potential} documentation potential)"
    else:
        analysis["status_message"] = f"Extracted {quality} content with {words} words ({doc_potential} documentation potential)"
    
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
            
            # Determine workspace assignment
            workspace_id = None
            if user.current_organization_id:
                # Get user's current workspace from their organization
                current_workspace = db.query(Workspace).filter(
                    Workspace.organization_id == user.current_organization_id,
                    Workspace.is_active == True
                ).first()
                if current_workspace:
                    workspace_id = current_workspace.id
                    print(f"DEBUG UPLOAD: Assigning snippets to workspace {current_workspace.name} (ID: {workspace_id})")
            
            for i, (ch, emb) in enumerate(zip(chunks, embeds)):
                sn = Snippet(
                    user_id=user.id, 
                    project="default", 
                    path=path, 
                    text=ch, 
                    embedding=emb,
                    workspace_id=workspace_id,
                    is_shared=True  # Default to shared in workspace
                )
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

@router.post("/generate_async")
async def generate_async(
    project: str, title: str, template: str, 
    description: str = "", model: str = None, system: str = None,
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Queue a document generation request"""
    import uuid
    from ..llm.hybrid_queue import hybrid_queue, GenerationRequest, RequestPriority
    
    # Determine user priority based on tier
    user_tier = getattr(user, 'tier', 'free')  # Assuming you have user tiers
    
    priority_map = {
        'enterprise': RequestPriority.CRITICAL,
        'premium': RequestPriority.HIGH, 
        'pro': RequestPriority.NORMAL,
        'free': RequestPriority.LOW
    }
    
    priority = priority_map.get(user_tier, RequestPriority.NORMAL)
    
    # Create generation request
    request_id = str(uuid.uuid4())
    
    # Build comprehensive prompt with uploaded content
    user_source_texts = []
    try:
        all_user_snippets = db.query(Snippet).filter_by(user_id=user.id).order_by(Snippet.id.desc()).all()
        if all_user_snippets:
            # Use only latest upload
            latest_path = all_user_snippets[0].path
            latest_snippets = [s for s in all_user_snippets if s.path == latest_path]
            user_source_texts = [snippet.text for snippet in latest_snippets if snippet.text and snippet.text.strip()]
    except Exception as e:
        logger.error(f"Error fetching snippets: {e}")
    
    # Build comprehensive prompt
    if user_source_texts:
        content_preview = "\n".join(user_source_texts[:10])  # First 10 chunks
        full_prompt = f"""
Generate a {template} document with title "{title}".

Based on the uploaded content below:
{content_preview}

Description: {description}

Create comprehensive documentation based entirely on the uploaded materials.
"""
    else:
        full_prompt = f"Generate a {template} document with title '{title}'. Description: {description}"
    
    gen_request = GenerationRequest(
        request_id=request_id,
        user_id=user.id,
        prompt=full_prompt,
        model=model or "phi3:mini",
        priority=priority,
        template=template,
        user_tier=user_tier,
        estimated_duration=len(user_source_texts) * 2 + 30  # Estimate based on content
    )
    
    # Add to queue
    status, message = await hybrid_queue.add_request(gen_request)
    
    if status == "cached":
        return {
            "request_id": request_id,
            "status": "completed",
            "result": message,
            "cached": True
        }
    elif status == "failed":
        return {
            "error": message,
            "status": "failed"
        }
    else:
        queue_stats = hybrid_queue.get_queue_stats()
        position = hybrid_queue.get_user_queue_position(user.id, request_id)
        
        return {
            "request_id": request_id,
            "status": "queued",
            "queue_position": position,
            "estimated_wait_time": position * 45,  # 45 seconds per position
            "queue_stats": queue_stats
        }

@router.get("/generation_status/{request_id}")
async def get_generation_status(request_id: str, user: User = Depends(get_current_user)):
    """Get status of a generation request"""
    from ..llm.hybrid_queue import hybrid_queue
    
    status, result = hybrid_queue.get_request_status(request_id)
    queue_stats = hybrid_queue.get_queue_stats()
    position = hybrid_queue.get_user_queue_position(user.id, request_id)
    
    response = {
        "request_id": request_id,
        "status": status.value,
        "queue_position": position,
        "queue_stats": queue_stats
    }
    
    if status.value in ["completed", "failed"]:
        response["result"] = result
    
    if status.value == "queued":
        response["estimated_wait_time"] = position * 45
    
    return response

@router.get("/queue_stats")
async def get_queue_stats(user: User = Depends(get_current_user)):
    """Get current queue statistics"""
    from ..llm.hybrid_queue import hybrid_queue
    from ..llm.hybrid_client import hybrid_client
    
    queue_stats = hybrid_queue.get_queue_stats()
    health_stats = hybrid_client.get_health_status()
    
    return {
        "queue": queue_stats,
        "instances": health_stats,
        "user_active_requests": hybrid_queue.user_active_requests.get(user.id, 0)
    }

# Keep the old endpoint for backward compatibility but mark as deprecated
@router.get("/stream_generate")
def stream_generate_legacy(
    project: str, 
    title: str, 
    template: str = None, 
    smart_template_id: str = None,
    template_variables: str = None,
    description: str = "", 
    model: str | None = None, 
    system: str | None = None, 
    request: Request = None, 
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Extract user_id before entering generator scope to avoid SQLAlchemy DetachedInstanceError
    user_id = user.id
    
    # Determine workspace assignment for document
    workspace_id = None
    if user.current_organization_id:
        current_workspace = db.query(Workspace).filter(
            Workspace.organization_id == user.current_organization_id,
            Workspace.is_active == True
        ).first()
        if current_workspace:
            workspace_id = current_workspace.id
            print(f"DEBUG DOCUMENT: Creating document in workspace {current_workspace.name} (ID: {workspace_id})")
    
    d = Document(
        user_id=user_id, 
        title=title, 
        template=template, 
        content=None,
        workspace_id=workspace_id,
        is_public_in_workspace=True  # Default to shared in workspace
    )
    db.add(d); db.commit(); db.refresh(d)

    # Handle smart templates vs classic templates
    if smart_template_id:
        # Load smart template from database
        smart_template = db.query(Template).filter(Template.id == smart_template_id).first()
        if smart_template:
            template_data = smart_template.template_data
            mode = template_data.get("mode", "Smart Template Document")
            headings = [section.get("title") for section in template_data.get("sections", []) if section.get("title")]
            outline = {
                "title": title,
                "mode": mode,
                "sections": [{"heading": heading} for heading in headings]
            }
            
            # Parse template variables if provided
            parsed_variables = {}
            if template_variables:
                try:
                    import json
                    parsed_variables = json.loads(template_variables)
                    print(f"DEBUG TEMPLATE: Using template variables: {parsed_variables}")
                except json.JSONDecodeError:
                    print(f"DEBUG TEMPLATE: Failed to parse template variables: {template_variables}")
        else:
            raise HTTPException(status_code=404, detail="Smart template not found")
    elif template:
        # Load classic YAML template
        try:
            tpl = load_template(template)
            outline = seed_empty_outline(tpl, title)
        except Exception:
            outline = {"title": title, "mode": "technical document", "sections": [{"heading": "Introduction"}, {"heading": "Method"}, {"heading": "Conclusion"}]}
    else:
        raise HTTPException(status_code=400, detail="Either template or smart_template_id must be provided")
    
    mode = outline.get("mode", "technical document")
    headings = [s.get("heading") for s in outline.get("sections", []) if s.get("heading")]

    # WORKSPACE-AWARE CONTENT FETCHING: Use workspace content if available, fallback to user content
    print(f"DEBUG PRE-GENERATION: Fetching workspace-aware content for user {user_id}")
    user_source_texts = _get_workspace_content(user, db)

    def gen():
        try:
            enforce_or_raise(db, user, 2000)
        except Exception:
            yield _sse({"event":"payment_required"}); return
        yield _sse({"event": "start"})
        
        print(f"DEBUG GENERATION START: User {user_id} has {len(user_source_texts)} preprocessed text snippets")
        print(f"DEBUG GENERATION START: Generating document '{title}' with template '{template}' for project '{project}'")
        
        document_content = f"# {title}\n\n"
        total_chars = 0
        
        for idx, heading in enumerate(headings):
            yield _sse({"event": "section_begin", "index": idx, "heading": heading})
            print(f"DEBUG SECTION START: Processing section {idx} '{heading}' with {len(user_source_texts)} user_source_texts available")
            # RAG: Get ALL relevant snippets from uploaded sources, prioritizing recent uploads
            try:
                print(f"DEBUG CRITICAL: About to check user_source_texts - length: {len(user_source_texts) if user_source_texts else 'None'}")
                print(f"DEBUG CRITICAL: user_source_texts type: {type(user_source_texts)}")
                print(f"DEBUG CRITICAL: user_source_texts first item preview: {user_source_texts[0][:100] if user_source_texts else 'No items'}")
                # Search for content related to this section - prioritize section heading over title
                # Use heading as primary search term since uploaded content should drive the documentation
                q = f"{heading}"
                if description.strip():
                    q += f" {description}"  # Add description if provided as it may contain content-specific terms
                # Only add title as secondary search term to avoid title-bias
                q += f" {title.split()[-1]}"  # Use only the last word of title to reduce bias
                
                topk = int(os.getenv("RAG_TOPK", "50"))  # Significantly increased for comprehensive coverage
                hits = search_snippets(db, user_id, "default", q, topk=topk)
                
                # Get pinned snippets for this section
                pinned = db.query(PinnedSnippet).filter_by(user_id=user_id, doc_id=d.id, section_index=idx).all()
                pinned_texts = []
                pinned_ids = []
                for p in pinned:
                    sn = db.get(Snippet, p.snippet_id)
                    if sn:
                        pinned_texts.append(sn.text)
                        pinned_ids.append(sn.id)
                
                # DIRECT APPROACH: Skip all complex processing and use uploaded content directly
                if user_source_texts:
                    print(f"DEBUG DIRECT: Found {len(user_source_texts)} uploaded texts, using them directly")
                    
                    # Take the first 15 source texts to ensure we have comprehensive content
                    selected_texts = user_source_texts[:15]
                    
                    # Build excerpt directly
                    excerpt_parts = ["=== UPLOADED CONTENT ==="]
                    for i, text in enumerate(selected_texts):
                        if text and text.strip():
                            excerpt_parts.append(f"\n--- Content Segment {i+1} ---")
                            excerpt_parts.append(text)
                    
                    excerpt = "\n\n".join(excerpt_parts)
                    print(f"DEBUG DIRECT: Created excerpt with {len(selected_texts)} segments, total length: {len(excerpt)}")
                    print(f"DEBUG DIRECT: Excerpt preview: {excerpt[:300]}...")
                    
                    # Set hit_ids for citations
                    hit_ids = []
                else:
                    print(f"DEBUG DIRECT: No user_source_texts available, falling back to search")
                    # Fallback to search if no uploaded content
                    hit_texts = [txt for (_id, txt, _s, _p) in hits]
                    hit_ids = [_id for (_id, txt, _s, _p) in hits]
                    excerpt = "\n".join(hit_texts) if hit_texts else "[No content available]"
                
                # emit citation events for pinned and hit snippets
                for pid in pinned_ids:
                    yield _sse({"event":"cite","snippet_id": pid, "index": idx})
                for hid in hit_ids[:topk]:
                    yield _sse({"event":"cite","snippet_id": hid, "index": idx})
            except Exception as e:
                print(f"DEBUG EXCEPTION: Error in section processing: {e}")
                print(f"DEBUG EXCEPTION: Exception type: {type(e)}")
                import traceback
                print(f"DEBUG EXCEPTION: Traceback: {traceback.format_exc()}")
                excerpt = ""

            # Add section heading to document
            document_content += f"## {heading}\n\n"
            
            try:
                section_content = ""
                # Create content-driven system prompt that ignores title assumptions
                source_system = """You are an expert documentation specialist who creates documentation based ENTIRELY on uploaded source materials. Your approach is content-driven, meaning you let the actual uploaded content determine what gets documented, not assumptions about document types or titles.

CORE METHODOLOGY:
- ANALYZE FIRST: Thoroughly examine the uploaded source materials to understand what information is actually available
- EXTRACT COMPLETELY: Pull out ALL relevant information from the source materials, regardless of whether it fits typical expectations
- DOCUMENT WHAT EXISTS: Create documentation based on what's actually in the uploaded files, not what "should" be there
- IGNORE PRECONCEPTIONS: Don't assume what content should be present based on document titles or types

YOUR SPECIALTIES:
- Converting rough notes, handwritten content, meeting minutes, and fragmented documents into polished documentation
- Extracting structured information from unstructured sources (OCR text, handwritten notes, informal documents)
- Recognizing and preserving ALL technical details, specifications, procedures, names, dates, and numbers exactly as provided
- Creating comprehensive documentation from partial or incomplete source materials
- Maintaining absolute fidelity to source content while improving presentation and organization

CONTENT-DRIVEN RULES:
1. BASE EVERYTHING on the uploaded source material - never add external knowledge or assumptions
2. EXTRACT ALL information that could be relevant, even if it seems incomplete, fragmented, or doesn't fit typical patterns
3. PRESERVE EXACT details (numbers, names, procedures, specifications, dates) exactly as they appear in source materials
4. CREATE SECTIONS based on what content is actually available, not on what typical documents contain
5. INDICATE CLEARLY when information is limited: "Based on the uploaded materials..." or "The source documents contain..."
6. TRANSFORM rough content into professional language while maintaining complete fidelity to the original meaning and facts"""

                # Add contract-specific instructions for legal templates
                contract_addition = ""
                if template in ['legal_contract_analysis', 'uploaded_contract_analysis'] or 'legal' in template or 'contract' in template:
                    contract_addition = "\n\nSPECIAL INSTRUCTIONS FOR CONTRACT ANALYSIS: You are analyzing an actual uploaded contract document. Focus on extracting the specific terms, conditions, obligations, and details that are actually written in this contract. Do not add standard legal language or typical contract provisions that are not present in the uploaded document. Extract exact payment amounts, specific dates, precise job duties, actual benefit details, and verbatim contract clauses as they appear in the source material."
                
                final_system = f"{source_system}{contract_addition}\n\n{system}" if system else f"{source_system}{contract_addition}"
                
                # FORCE uploaded content usage - bypass all search logic
                if user_source_texts:
                    # Create a comprehensive excerpt from ALL uploaded content
                    forced_excerpt = "=== ALL UPLOADED CONTENT ===\n\n"
                    for i, content in enumerate(user_source_texts[:20]):  # Use first 20 chunks
                        if content and content.strip():
                            forced_excerpt += f"--- Segment {i+1} ---\n{content}\n\n"
                    
                    print(f"DEBUG FORCE: Using forced excerpt with {len(forced_excerpt)} characters")
                    print(f"DEBUG FORCE: Excerpt preview: {forced_excerpt[:200]}...")
                    excerpt = forced_excerpt
                
                print(f"DEBUG LLM START: About to call stream_section for '{heading}' with {len(excerpt)} chars")
                token_count = 0
                for tok in stream_section(mode=mode, title=title, heading=heading, user_context="", source_excerpt=excerpt, model=model, system=final_system):
                    token_count += 1
                    if token_count <= 5:
                        print(f"DEBUG LLM TOKEN {token_count}: '{tok}'")
                    yield _sse({"event": "token", "text": tok})
                    total_chars += len(tok)
                    section_content += tok
                print(f"DEBUG LLM END: Generated {token_count} tokens for section '{heading}'")
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
