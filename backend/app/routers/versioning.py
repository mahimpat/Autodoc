from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import json
import re
from difflib import unified_diff

from ..auth import get_current_user, get_db
from ..models import User, Document
from ..models_versioning import (
    DocumentVersion, DocumentVersionTag, DocumentComment, 
    DocumentAnalytics, DocumentComplianceCheck, DocumentExportJob
)

router = APIRouter(prefix="/documents", tags=["document-versioning"])

# Pydantic models
class DocumentVersionCreate(BaseModel):
    title: str
    content: str
    template: str
    change_summary: Optional[str] = None
    branch_name: str = "main"
    parent_version_id: Optional[int] = None

class DocumentVersionResponse(BaseModel):
    id: int
    version_number: str
    branch_name: str
    title: str
    content: str
    change_summary: Optional[str]
    word_count: int
    character_count: int
    readability_score: Optional[float]
    is_published: bool
    is_draft: bool
    approval_status: str
    created_at: datetime
    created_by_id: int
    parent_version_id: Optional[int]
    
    class Config:
        from_attributes = True

class VersionTagCreate(BaseModel):
    tag_name: str
    tag_value: Optional[str] = None
    color: str = "#3B82F6"

class CommentCreate(BaseModel):
    content: str
    comment_type: str = "general"
    line_number: Optional[int] = None
    selection_start: Optional[int] = None
    selection_end: Optional[int] = None
    selected_text: Optional[str] = None
    parent_comment_id: Optional[int] = None

class ComplianceCheckResponse(BaseModel):
    id: int
    framework: str
    rule_id: str
    rule_description: Optional[str]
    status: str
    severity: str
    confidence: float
    found_issues: List[dict]
    suggestions: List[dict]
    can_auto_fix: bool
    checked_at: datetime

def calculate_readability_score(text: str) -> float:
    """Calculate Flesch Reading Ease score"""
    sentences = len(re.findall(r'[.!?]+', text))
    words = len(text.split())
    syllables = sum([max(1, len(re.findall(r'[aeiouAEIOU]', word))) for word in text.split()])
    
    if sentences == 0 or words == 0:
        return 0.0
    
    score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words))
    return max(0.0, min(100.0, score))

def generate_version_number(document_id: int, branch_name: str, db: Session) -> str:
    """Generate semantic version number"""
    latest_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.branch_name == branch_name
    ).order_by(desc(DocumentVersion.id)).first()
    
    if not latest_version:
        return "1.0.0"
    
    # Parse existing version
    parts = latest_version.version_number.split('.')
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    
    # Increment patch version by default
    return f"{major}.{minor}.{patch + 1}"

@router.post("/{document_id}/versions", response_model=DocumentVersionResponse)
async def create_document_version(
    document_id: int,
    version_data: DocumentVersionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new version of a document"""
    # Check if document exists and user has access
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Generate version number
    version_number = generate_version_number(document_id, version_data.branch_name, db)
    
    # Calculate content metrics
    word_count = len(version_data.content.split())
    character_count = len(version_data.content)
    readability_score = calculate_readability_score(version_data.content)
    
    # Create version
    version = DocumentVersion(
        document_id=document_id,
        version_number=version_number,
        branch_name=version_data.branch_name,
        parent_version_id=version_data.parent_version_id,
        title=version_data.title,
        content=version_data.content,
        template=version_data.template,
        change_summary=version_data.change_summary,
        word_count=word_count,
        character_count=character_count,
        readability_score=readability_score,
        created_by_id=user.id
    )
    
    db.add(version)
    db.commit()
    db.refresh(version)
    
    return version

@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
async def list_document_versions(
    document_id: int,
    branch: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all versions of a document"""
    # Check access
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    query = db.query(DocumentVersion).filter(DocumentVersion.document_id == document_id)
    
    if branch:
        query = query.filter(DocumentVersion.branch_name == branch)
    
    versions = query.order_by(desc(DocumentVersion.created_at)).offset(offset).limit(limit).all()
    return versions

@router.get("/{document_id}/versions/{version_id}", response_model=DocumentVersionResponse)
async def get_document_version(
    document_id: int,
    version_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific version of a document"""
    version = db.query(DocumentVersion).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == document_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Check access through document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return version

@router.get("/{document_id}/versions/{version_id}/diff")
async def get_version_diff(
    document_id: int,
    version_id: int,
    compare_to: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get diff between two versions"""
    # Get the main version
    version = db.query(DocumentVersion).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == document_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Get comparison version (parent version if not specified)
    if compare_to:
        compare_version = db.query(DocumentVersion).filter(
            DocumentVersion.id == compare_to,
            DocumentVersion.document_id == document_id
        ).first()
    else:
        compare_version = version.parent_version
    
    if not compare_version:
        return {"diff": "No comparison version available", "changes": []}
    
    # Generate diff
    old_lines = compare_version.content.splitlines(keepends=True)
    new_lines = version.content.splitlines(keepends=True)
    
    diff = list(unified_diff(
        old_lines, new_lines,
        fromfile=f"Version {compare_version.version_number}",
        tofile=f"Version {version.version_number}",
        n=3
    ))
    
    # Parse changes for structured response
    changes = []
    current_change = None
    
    for line in diff:
        if line.startswith('@@'):
            if current_change:
                changes.append(current_change)
            current_change = {"type": "hunk", "content": line.strip(), "lines": []}
        elif line.startswith('-'):
            if current_change:
                current_change["lines"].append({"type": "removed", "content": line[1:]})
        elif line.startswith('+'):
            if current_change:
                current_change["lines"].append({"type": "added", "content": line[1:]})
        elif current_change and not line.startswith('\\'):
            current_change["lines"].append({"type": "unchanged", "content": line})
    
    if current_change:
        changes.append(current_change)
    
    return {
        "diff": ''.join(diff),
        "changes": changes,
        "stats": {
            "old_version": compare_version.version_number,
            "new_version": version.version_number,
            "old_word_count": compare_version.word_count,
            "new_word_count": version.word_count,
            "word_count_change": version.word_count - compare_version.word_count
        }
    }

@router.post("/{document_id}/versions/{version_id}/tags")
async def add_version_tag(
    document_id: int,
    version_id: int,
    tag_data: VersionTagCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a tag to a document version"""
    # Check version exists and user has access
    version = db.query(DocumentVersion).join(Document).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    tag = DocumentVersionTag(
        version_id=version_id,
        tag_name=tag_data.tag_name,
        tag_value=tag_data.tag_value,
        color=tag_data.color,
        created_by_id=user.id
    )
    
    db.add(tag)
    db.commit()
    db.refresh(tag)
    
    return {"id": tag.id, "message": "Tag added successfully"}

@router.post("/{document_id}/versions/{version_id}/comments")
async def add_version_comment(
    document_id: int,
    version_id: int,
    comment_data: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a document version"""
    # Check version exists and user has access
    version = db.query(DocumentVersion).join(Document).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    comment = DocumentComment(
        version_id=version_id,
        content=comment_data.content,
        comment_type=comment_data.comment_type,
        line_number=comment_data.line_number,
        selection_start=comment_data.selection_start,
        selection_end=comment_data.selection_end,
        selected_text=comment_data.selected_text,
        parent_comment_id=comment_data.parent_comment_id,
        created_by_id=user.id
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return {"id": comment.id, "message": "Comment added successfully"}

@router.post("/{document_id}/versions/{version_id}/approve")
async def approve_version(
    document_id: int,
    version_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a document version"""
    # Check version exists and user has access
    version = db.query(DocumentVersion).join(Document).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    version.approval_status = "approved"
    version.approved_by_id = user.id
    version.approved_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Version approved successfully"}

@router.post("/{document_id}/versions/{version_id}/publish")
async def publish_version(
    document_id: int,
    version_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a document version"""
    # Check version exists and user has access
    version = db.query(DocumentVersion).join(Document).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.approval_status != "approved":
        raise HTTPException(status_code=400, detail="Version must be approved before publishing")
    
    # Unpublish other versions in the same branch
    db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.branch_name == version.branch_name,
        DocumentVersion.id != version_id
    ).update({"is_published": False})
    
    version.is_published = True
    version.is_draft = False
    
    db.commit()
    
    return {"message": "Version published successfully"}

@router.get("/{document_id}/versions/{version_id}/compliance", response_model=List[ComplianceCheckResponse])
async def get_compliance_checks(
    document_id: int,
    version_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get compliance check results for a version"""
    # Check version exists and user has access
    version = db.query(DocumentVersion).join(Document).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == document_id,
        Document.user_id == user.id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    checks = db.query(DocumentComplianceCheck).filter(
        DocumentComplianceCheck.version_id == version_id
    ).order_by(desc(DocumentComplianceCheck.checked_at)).all()
    
    return checks