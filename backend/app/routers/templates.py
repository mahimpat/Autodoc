from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, text, desc, asc
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

from ..models import Template, TemplateCategory, TemplateVariable, TemplateUsage, User
from ..auth import get_current_user, get_db
from ..llm.orchestrator import list_templates as list_yaml_templates, load_template as load_yaml_template

router = APIRouter(prefix="/templates", tags=["templates"])

# Pydantic models for request/response

class TemplateVariableCreate(BaseModel):
    name: str
    type: str
    required: bool = False
    default_value: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    validation_rules: Optional[Dict[str, Any]] = None
    placeholder: Optional[str] = None
    description: Optional[str] = None
    help_text: Optional[str] = None
    order_index: int = 0

class TemplateVariableResponse(TemplateVariableCreate):
    id: UUID
    template_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tags: List[str] = []
    template_data: Dict[str, Any]
    visibility: str = "private"
    variables: List[TemplateVariableCreate] = []

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tags: Optional[List[str]] = None
    template_data: Optional[Dict[str, Any]] = None
    visibility: Optional[str] = None
    variables: Optional[List[TemplateVariableCreate]] = None

class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    category_id: Optional[UUID]
    tags: List[str]
    version: str
    author_id: int
    organization_id: Optional[int]
    template_data: Dict[str, Any]
    visibility: str
    is_verified: bool
    is_featured: bool
    total_uses: int
    success_rate: float
    avg_rating: float
    created_at: datetime
    updated_at: Optional[datetime]
    published_at: Optional[datetime]
    variables: List[TemplateVariableResponse] = []
    
    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    template_count: int = 0
    
    class Config:
        from_attributes = True

class TemplateUsageCreate(BaseModel):
    template_id: UUID
    document_id: Optional[int] = None
    success: bool
    completion_rate: Optional[float] = None
    variables_used: Optional[Dict[str, Any]] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None


# Legacy YAML template endpoints (for backward compatibility)

@router.get("/yaml")
def get_yaml_templates():
    """Get legacy YAML templates"""
    return {"templates": list_yaml_templates()}

@router.get("/yaml/{name}")
def get_yaml_template(name: str):
    """Get specific legacy YAML template"""
    try: 
        return load_yaml_template(name)
    except FileNotFoundError as e: 
        raise HTTPException(status_code=404, detail=str(e))


# New database-backed template system

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    """Get all template categories with template counts"""
    categories = db.query(TemplateCategory).all()
    
    result = []
    for category in categories:
        template_count = db.query(Template).filter(
            Template.category_id == category.id,
            Template.visibility.in_(["public", "marketplace"])
        ).count()
        
        result.append(CategoryResponse(
            id=category.id,
            name=category.name,
            description=category.description,
            icon=category.icon,
            color=category.color,
            template_count=template_count
        ))
    
    return result

@router.get("/search", response_model=List[TemplateResponse])
async def search_templates(
    query: Optional[str] = Query(None, description="Search query"),
    category_id: Optional[UUID] = Query(None, description="Filter by category"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    visibility: Optional[str] = Query("public", description="Template visibility"),
    is_featured: Optional[bool] = Query(None, description="Filter featured templates"),
    min_rating: Optional[float] = Query(None, description="Minimum rating"),
    sort_by: str = Query("created_at", description="Sort by: created_at, rating, uses, name"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    limit: int = Query(20, le=100, description="Number of results"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search and filter templates"""
    
    query_obj = db.query(Template).options(joinedload(Template.variables))
    
    # Apply filters
    if visibility == "public":
        query_obj = query_obj.filter(Template.visibility.in_(["public", "marketplace"]))
    elif visibility == "organization" and current_user:
        query_obj = query_obj.filter(
            or_(
                Template.visibility == "public",
                Template.visibility == "marketplace",
                and_(
                    Template.visibility == "organization",
                    Template.organization_id == current_user.current_organization_id
                )
            )
        )
    elif visibility == "private" and current_user:
        query_obj = query_obj.filter(Template.author_id == current_user.id)
    
    if query:
        # Full-text search using PostgreSQL
        query_obj = query_obj.filter(
            or_(
                Template.name.ilike(f"%{query}%"),
                Template.description.ilike(f"%{query}%"),
                Template.tags.op("&&")(f"{{{query}}}")
            )
        )
    
    if category_id:
        query_obj = query_obj.filter(Template.category_id == category_id)
    
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        query_obj = query_obj.filter(Template.tags.op("&&")(tag_list))
    
    if is_featured is not None:
        query_obj = query_obj.filter(Template.is_featured == is_featured)
    
    if min_rating:
        query_obj = query_obj.filter(Template.avg_rating >= min_rating)
    
    # Apply sorting
    if sort_by == "rating":
        if sort_order == "desc":
            query_obj = query_obj.order_by(desc(Template.avg_rating))
        else:
            query_obj = query_obj.order_by(asc(Template.avg_rating))
    elif sort_by == "uses":
        if sort_order == "desc":
            query_obj = query_obj.order_by(desc(Template.total_uses))
        else:
            query_obj = query_obj.order_by(asc(Template.total_uses))
    elif sort_by == "name":
        if sort_order == "desc":
            query_obj = query_obj.order_by(desc(Template.name))
        else:
            query_obj = query_obj.order_by(asc(Template.name))
    else:  # created_at
        if sort_order == "desc":
            query_obj = query_obj.order_by(desc(Template.created_at))
        else:
            query_obj = query_obj.order_by(asc(Template.created_at))
    
    # Apply pagination
    templates = query_obj.offset(offset).limit(limit).all()
    
    return templates

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific template by ID"""
    
    template = db.query(Template).options(joinedload(Template.variables)).filter(
        Template.id == template_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check access permissions
    if template.visibility == "private" and (not current_user or template.author_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if (template.visibility == "organization" and 
        (not current_user or template.organization_id != current_user.current_organization_id)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return template

@router.post("", response_model=TemplateResponse)
async def create_template(
    template_data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new template"""
    
    # Create template
    template = Template(
        name=template_data.name,
        description=template_data.description,
        category_id=template_data.category_id,
        tags=template_data.tags,
        template_data=template_data.template_data,
        visibility=template_data.visibility,
        author_id=current_user.id,
        organization_id=current_user.current_organization_id if template_data.visibility == "organization" else None
    )
    
    db.add(template)
    db.flush()  # Get template ID
    
    # Add variables
    for var_data in template_data.variables:
        variable = TemplateVariable(
            template_id=template.id,
            **var_data.dict()
        )
        db.add(variable)
    
    db.commit()
    db.refresh(template)
    
    return template

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    template_data: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a template"""
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only template author can update")
    
    # Update template fields
    update_data = template_data.dict(exclude_unset=True)
    variables_data = update_data.pop("variables", None)
    
    for field, value in update_data.items():
        setattr(template, field, value)
    
    # Update variables if provided
    if variables_data is not None:
        # Remove existing variables
        db.query(TemplateVariable).filter(TemplateVariable.template_id == template_id).delete()
        
        # Add new variables
        for var_data in variables_data:
            variable = TemplateVariable(
                template_id=template.id,
                **var_data
            )
            db.add(variable)
    
    db.commit()
    db.refresh(template)
    
    return template

@router.delete("/{template_id}")
async def delete_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a template"""
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only template author can delete")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted successfully"}

@router.post("/usage", response_model=dict)
async def record_template_usage(
    usage_data: TemplateUsageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record template usage for analytics"""
    
    # Verify template exists
    template = db.query(Template).filter(Template.id == usage_data.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create usage record
    usage = TemplateUsage(
        template_id=usage_data.template_id,
        user_id=current_user.id,
        document_id=usage_data.document_id,
        success=usage_data.success,
        completion_rate=usage_data.completion_rate,
        variables_used=usage_data.variables_used,
        rating=usage_data.rating,
        feedback=usage_data.feedback
    )
    
    db.add(usage)
    
    # Update template statistics
    template.total_uses += 1
    
    # Recalculate success rate
    total_usage = db.query(TemplateUsage).filter(TemplateUsage.template_id == usage_data.template_id).count()
    successful_usage = db.query(TemplateUsage).filter(
        TemplateUsage.template_id == usage_data.template_id,
        TemplateUsage.success == True
    ).count()
    
    template.success_rate = (successful_usage / total_usage) * 100 if total_usage > 0 else 0
    
    # Recalculate average rating if rating provided
    if usage_data.rating:
        ratings = db.query(TemplateUsage.rating).filter(
            TemplateUsage.template_id == usage_data.template_id,
            TemplateUsage.rating.isnot(None)
        ).all()
        
        if ratings:
            avg_rating = sum(rating[0] for rating in ratings) / len(ratings)
            template.avg_rating = round(avg_rating, 2)
    
    db.commit()
    
    return {"message": "Usage recorded successfully"}

@router.get("/{template_id}/stats")
async def get_template_stats(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed template usage statistics"""
    
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only template author can view stats")
    
    # Get usage statistics
    usage_stats = db.query(TemplateUsage).filter(TemplateUsage.template_id == template_id).all()
    
    stats = {
        "total_uses": len(usage_stats),
        "successful_generations": len([u for u in usage_stats if u.success]),
        "success_rate": template.success_rate,
        "average_rating": template.avg_rating,
        "rating_distribution": {},
        "recent_feedback": []
    }
    
    # Rating distribution
    for i in range(1, 6):
        stats["rating_distribution"][str(i)] = len([u for u in usage_stats if u.rating == i])
    
    # Recent feedback
    recent_feedback = [
        {
            "rating": usage.rating,
            "feedback": usage.feedback,
            "created_at": usage.created_at.isoformat()
        }
        for usage in sorted(usage_stats, key=lambda x: x.created_at, reverse=True)[:10]
        if usage.feedback
    ]
    
    stats["recent_feedback"] = recent_feedback
    
    return stats
