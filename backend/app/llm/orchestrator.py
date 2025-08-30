from typing import Dict, Iterator, List, Tuple
import yaml, pathlib
from sqlalchemy import text
from sqlalchemy.orm import Session
from .model_interface import unified_client

TEMPLATE_DIR = pathlib.Path("/app/templates")

SECTION_PROMPT = """You are a professional documentation specialist who transforms uploaded source materials (rough notes, documents, handwritten content, OCR text) into comprehensive documentation. You are working on the "{heading}" section.

CRITICAL INSTRUCTION: The content you generate must be ENTIRELY based on the uploaded source materials below. Ignore any preconceptions about what this documentation should contain based on the title "{title}" or document type "{mode}". Instead, let the actual uploaded content guide what you write.

CORE PRINCIPLES:
1. **SOURCE-DRIVEN CONTENT**: Base ALL content decisions on what's actually in the uploaded materials, not on what you think should be in this type of document.
2. **CONTENT-FIRST APPROACH**: If the uploaded materials contain information that seems relevant to "{heading}", include it regardless of whether it fits typical expectations for this section.
3. **COMPREHENSIVE EXTRACTION**: Analyze ALL content thoroughly - extract everything that could be relevant to "{heading}" even if it's incomplete or fragmented.
4. **ZERO ASSUMPTIONS**: Never add information, examples, or details not explicitly present in the source materials.

CONTENT DISCOVERY STRATEGY:
- **Primary Search**: Look for content directly related to "{heading}"
- **Secondary Search**: Find information that provides context, background, or supporting details for "{heading}"
- **Structural Mining**: Extract from tables, lists, diagrams, code blocks, configurations, procedures
- **Detail Extraction**: Capture names, dates, versions, specifications, requirements, constraints, examples
- **Connection Mapping**: Include information that connects to or depends on "{heading}" concepts

TRANSFORMATION APPROACH:
- If source materials contain detailed information for "{heading}", create a comprehensive section
- If source materials contain limited information for "{heading}", write what's available and note the scope
- If source materials contain no direct information for "{heading}", look for related/contextual information
- Always indicate when information is limited: "Based on the uploaded materials, [limited information available]"
- Convert rough notes and fragmented content into professional, readable documentation
- Preserve all technical details, specifications, examples, and procedures exactly as provided

SOURCE MATERIAL FROM UPLOADED FILES:
{source_excerpt}

TASK: Analyze the uploaded source materials above and create the "{heading}" section using ONLY what's actually present in those materials. Let the content of the uploaded files determine what goes into this section, not preconceived notions about what a "{heading}" section typically contains."""

def list_templates() -> Dict[str, str]:
    if not TEMPLATE_DIR.exists():
        return {"tdd": "tdd.yaml", "research_report": "research_report.yaml", "readme_changelog": "readme_changelog.yaml"}
    return {p.stem: p.name for p in TEMPLATE_DIR.glob("*.yaml")}

def load_template(name: str) -> Dict:
    path = TEMPLATE_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {name}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))

def seed_empty_outline(tpl: Dict, title: str) -> Dict:
    sections = [{"heading": s.get("title"), "summary": s.get("hint", ""), "content": ""} for s in tpl.get("sections", [])]
    return {"title": title, "mode": tpl.get("mode", "technical document"), "sections": sections, "metadata": tpl.get("metadata", {})}

def search_snippets(db: Session, user_id: int, project: str, query: str, topk: int = 6) -> List[Tuple[int, str]]:
    # embed query then run vector distance search (L2)
    vec = unified_client.embed_texts([query])[0]
    # raw SQL for performance
    sql = text("SELECT id, text FROM snippets WHERE user_id=:uid AND project=:proj ORDER BY embedding <=> :vec LIMIT :k")
    rows = db.execute(sql, {"uid": user_id, "proj": project, "vec": vec, "k": topk}).fetchall()
    return [(r[0], r[1]) for r in rows]

def stream_section(mode: str, title: str, heading: str, user_context: str = "", source_excerpt: str = "", model: str | None = None, system: str | None = None) -> Iterator[str]:
    source_content = source_excerpt or "[No excerpts available]"
    prompt = SECTION_PROMPT.format(
        mode=mode or "technical document",
        title=title,
        heading=heading,
        user_context=user_context or "",
        source_excerpt=source_content,
    )
    print(f"DEBUG LLM: Section '{heading}' - Source content length: {len(source_content)} chars")
    print(f"DEBUG LLM: Source content preview: {source_content[:200]}..." if len(source_content) > 10 else f"DEBUG LLM: Source content: {source_content}")
    print(f"DEBUG LLM: Prompt contains uploaded content: {'SOURCE:' in source_content or len(source_content) > 50}")
    # Use unified client for multi-model support
    print(f"DEBUG ORCHESTRATOR: About to call unified_client.stream_generate with model {model or 'phi3:mini'}")
    try:
        token_count = 0
        for tok in unified_client.stream_generate(prompt, model=model or "phi3:mini", system=system):
            token_count += 1
            if token_count <= 3:
                print(f"DEBUG ORCHESTRATOR TOKEN {token_count}: '{tok}'")
            yield tok
        print(f"DEBUG ORCHESTRATOR: Generated {token_count} total tokens")
    except Exception as e:
        print(f"DEBUG ORCHESTRATOR ERROR: {e}")
        print(f"DEBUG ORCHESTRATOR ERROR TYPE: {type(e)}")
        raise


def search_snippets_hybrid(db: Session, user_id: int, project: str, query: str, topk: int = 6, n: int = 12, alpha: float = 0.5):
    """Fused vector + BM25 search. Returns [(id, text, score, path)]."""
    vec = unified_client.embed_texts([query])[0]
    sql_vec = text("""
        SELECT id, text, path, (embedding <=> :vec) AS vscore
        FROM snippets
        WHERE user_id=:uid AND project=:proj
        ORDER BY vscore ASC
        LIMIT :n
    """)
    rows_v = db.execute(sql_vec, {"uid": user_id, "proj": project, "vec": vec, "n": n}).fetchall()
    sql_bm = text("""
        SELECT id, text, path, ts_rank_cd(to_tsvector('english', text), plainto_tsquery('english', :q)) AS bscore
        FROM snippets
        WHERE user_id=:uid AND project=:proj
        ORDER BY bscore DESC
        LIMIT :n
    """)
    rows_b = db.execute(sql_bm, {"uid": user_id, "proj": project, "q": query, "n": n}).fetchall()
    rank_v = { int(r[0]): i for i, r in enumerate(rows_v) }
    rank_b = { int(r[0]): i for i, r in enumerate(rows_b) }
    ids = []
    for r in rows_v + rows_b:
        rid = int(r[0])
        if rid not in ids: ids.append(rid)
    fused = []
    for rid in ids:
        rv = rank_v.get(rid, n) / max(n, 1)
        rb = rank_b.get(rid, n) / max(n, 1)
        score = alpha * rv + (1.0 - alpha) * rb
        if rid in rank_v: r = rows_v[rank_v[rid]]
        else: r = rows_b[rank_b[rid]]
        fused.append((rid, r[1], float(score), (r[2] if len(r)>2 else None)))
    fused.sort(key=lambda x: x[2])
    return fused[:topk]
