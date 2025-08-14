from fastapi import APIRouter, HTTPException
from ..llm.orchestrator import list_templates, load_template
router = APIRouter(prefix="/templates", tags=["templates"])
@router.get("")
def get_templates():
    return {"templates": list_templates()}
@router.get("/{name}")
def get_template(name: str):
    try: return load_template(name)
    except FileNotFoundError as e: raise HTTPException(status_code=404, detail=str(e))
