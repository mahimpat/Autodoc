from typing import Dict, Iterator, List, Tuple
import yaml, pathlib
from sqlalchemy import text
from sqlalchemy.orm import Session
from .model_interface import unified_client

TEMPLATE_DIR = pathlib.Path("/app/templates")

SECTION_PROMPT = """You are a professional document writer transforming rough notes and source material into the "{heading}" section of a {mode} titled "{title}".

REQUIREMENTS:
1. USE ONLY THE SOURCE MATERIAL PROVIDED BELOW - DO NOT ADD EXTERNAL KNOWLEDGE
2. Transform rough notes, handwritten text, and OCR content into professional language
3. Preserve ALL factual details, numbers, dates, names, and specific information exactly as provided
4. Do not invent, assume, or add any details not explicitly stated in the sources
5. Organize the content logically but stick strictly to what's provided

HANDLING LIMITED SOURCE MATERIAL:
- Look carefully for ANY content that could relate to "{heading}" - even indirect mentions
- Consider tables, lists, diagrams, metadata, and brief notes as valuable content
- If you find partial information, present it clearly with context
- If you find related information that doesn't directly match the heading, explain the connection
- Only use "[Limited source material for this section]" if absolutely no relevant content exists
- When material is sparse, focus on what IS available rather than what's missing

SOURCE MATERIAL FROM UPLOADED FILES:
{source_excerpt}

TASK: Extract and professionally rewrite ALL information from the source material above that could relate to "{heading}". Look for direct matches, partial matches, and contextual connections. Present whatever relevant information exists in a clear, professional format."""

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
    prompt = SECTION_PROMPT.format(
        mode=mode or "technical document",
        title=title,
        heading=heading,
        user_context=user_context or "",
        source_excerpt=source_excerpt or "[No excerpts available]",
    )
    # Use unified client for multi-model support
    for tok in unified_client.stream_generate(prompt, model=model or "phi3:mini", system=system):
        yield tok


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
