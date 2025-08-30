from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..auth import get_current_user, get_db
from ..models import User, Snippet

router = APIRouter(prefix="/debug", tags=["debug"])

@router.get("/snippets")
def debug_snippets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Debug endpoint to check snippet retrieval"""
    user_id = user.id
    
    # Test direct query
    all_snippets = db.query(Snippet).filter_by(user_id=user_id).all()
    default_project_snippets = db.query(Snippet).filter_by(user_id=user_id, project="default").all()
    
    # Test with sample text
    sample_texts = [s.text[:100] for s in all_snippets[:3]]
    
    return {
        "user_id": user_id,
        "total_snippets": len(all_snippets),
        "default_project_snippets": len(default_project_snippets),
        "sample_paths": [s.path for s in all_snippets[:3]],
        "sample_texts": sample_texts,
        "projects": list(set(s.project for s in all_snippets))
    }