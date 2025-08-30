from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import secrets
import string
from datetime import datetime, timedelta

from ..auth import get_current_user, get_db
from ..models import User, Organization, Workspace, OrganizationInvitation, ActivityLog, Document, user_organization

router = APIRouter(prefix="/organizations", tags=["organizations"])

# Pydantic models
class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: Optional[bool] = False

class InvitationCreate(BaseModel):
    email: EmailStr
    role: str = "member"

class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    is_active: bool
    member_count: int
    workspace_count: int
    created_at: datetime
    user_role: Optional[str]
    
    class Config:
        from_attributes = True

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_public: bool
    document_count: int
    created_at: datetime
    created_by: dict
    
    class Config:
        from_attributes = True

def get_user_org_role(user_id: int, organization_id: int, db: Session) -> Optional[str]:
    """Get user's role in organization"""
    result = db.query(user_organization).filter(
        user_organization.c.user_id == user_id,
        user_organization.c.organization_id == organization_id
    ).first()
    
    return result.role if result else None

def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from organization name"""
    import re
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
    slug = re.sub(r'\s+', '-', slug)
    return slug[:50]  # Limit length

@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    org_data: OrganizationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new organization"""
    # Generate unique slug
    base_slug = generate_slug(org_data.name)
    slug = base_slug
    counter = 1
    
    # Make sure slug is unique
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Create organization
    organization = Organization(
        name=org_data.name,
        slug=slug,
        description=org_data.description,
        created_by_id=user.id
    )
    
    db.add(organization)
    db.flush()  # Get the ID
    
    # Add creator as owner
    from sqlalchemy import insert
    stmt = insert(user_organization).values(
        user_id=user.id,
        organization_id=organization.id,
        role='owner'
    )
    db.execute(stmt)
    
    # Create default workspace
    default_workspace = Workspace(
        name="General",
        description="Default workspace for general collaboration",
        organization_id=organization.id,
        created_by_id=user.id,
        is_public=True
    )
    db.add(default_workspace)
    
    # Log activity
    activity = ActivityLog(
        organization_id=organization.id,
        user_id=user.id,
        action="created_organization",
        entity_type="organization",
        entity_id=organization.id,
        description=f"Created organization: {organization.name}"
    )
    db.add(activity)
    
    db.commit()
    
    return OrganizationResponse(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        description=organization.description,
        is_active=organization.is_active,
        member_count=1,
        workspace_count=1,
        created_at=organization.created_at,
        user_role="owner"
    )

@router.get("/", response_model=List[OrganizationResponse])
async def list_user_organizations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List organizations user belongs to"""
    # Get organizations where user is a member
    org_memberships = db.query(Organization).join(
        user_organization, user_organization.c.organization_id == Organization.id
    ).filter(
        user_organization.c.user_id == user.id,
        Organization.is_active == True
    ).all()
    
    organizations = []
    for org in org_memberships:
        # Get user's role in this organization
        membership = db.query(user_organization).filter(
            user_organization.c.user_id == user.id,
            user_organization.c.organization_id == org.id
        ).first()
        # Get member count
        member_count = db.query(user_organization).filter(
            user_organization.c.organization_id == org.id
        ).count()
        
        # Get workspace count
        workspace_count = db.query(Workspace).filter(
            Workspace.organization_id == org.id,
            Workspace.is_active == True
        ).count()
        
        organizations.append(OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            description=org.description,
            is_active=org.is_active,
            member_count=member_count,
            workspace_count=workspace_count,
            created_at=org.created_at,
            user_role=membership.role if membership else "member"
        ))
    
    return organizations

@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organization details"""
    organization = db.query(Organization).filter(Organization.id == org_id).first()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if user is member
    user_role = get_user_org_role(user.id, org_id, db)
    if not user_role:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get counts
    member_count = db.query(user_organization).filter(
        user_organization.c.organization_id == org_id
    ).count()
    
    workspace_count = db.query(Workspace).filter(
        Workspace.organization_id == org_id
    ).count()
    
    return OrganizationResponse(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        description=organization.description,
        is_active=organization.is_active,
        member_count=member_count,
        workspace_count=workspace_count,
        created_at=organization.created_at,
        user_role=user_role
    )

@router.post("/{org_id}/workspaces", response_model=WorkspaceResponse)
async def create_workspace(
    org_id: int,
    workspace_data: WorkspaceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workspace in organization"""
    # Check if user is member
    user_role = get_user_org_role(user.id, org_id, db)
    if not user_role or user_role not in ['owner', 'admin', 'member']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    workspace = Workspace(
        name=workspace_data.name,
        description=workspace_data.description,
        organization_id=org_id,
        created_by_id=user.id,
        is_public=workspace_data.is_public
    )
    
    db.add(workspace)
    
    # Log activity
    activity = ActivityLog(
        organization_id=org_id,
        workspace_id=workspace.id,
        user_id=user.id,
        action="created_workspace",
        entity_type="workspace",
        entity_id=workspace.id,
        description=f"Created workspace: {workspace.name}"
    )
    db.add(activity)
    
    db.commit()
    
    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        is_public=workspace.is_public,
        document_count=0,
        created_at=workspace.created_at,
        created_by={"id": user.id, "name": user.email}  # Adjust based on your User model
    )

@router.get("/{org_id}/workspaces", response_model=List[WorkspaceResponse])
async def list_workspaces(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List workspaces in organization"""
    # Check if user is member
    user_role = get_user_org_role(user.id, org_id, db)
    if not user_role:
        raise HTTPException(status_code=403, detail="Access denied")
    
    workspaces = db.query(Workspace).filter(
        Workspace.organization_id == org_id,
        Workspace.is_active == True
    ).options(joinedload(Workspace.created_by)).all()
    
    workspace_responses = []
    for workspace in workspaces:
        # Count documents in workspace
        document_count = db.query(Document).filter(
            Document.workspace_id == workspace.id
        ).count()
        
        workspace_responses.append(WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            description=workspace.description,
            is_public=workspace.is_public,
            document_count=document_count,
            created_at=workspace.created_at,
            created_by={
                "id": workspace.created_by.id,
                "name": workspace.created_by.email
            }
        ))
    
    return workspace_responses

@router.post("/{org_id}/invite")
async def invite_user(
    org_id: int,
    invitation_data: InvitationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite user to organization"""
    # Check if user has permission to invite
    user_role = get_user_org_role(user.id, org_id, db)
    if not user_role or user_role not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Only owners and admins can invite users")
    
    # Check if user is already invited or member
    existing = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.organization_id == org_id,
        OrganizationInvitation.email == invitation_data.email,
        OrganizationInvitation.is_accepted == False,
        OrganizationInvitation.is_expired == False
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already invited")
    
    # Generate invitation token
    token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    
    invitation = OrganizationInvitation(
        organization_id=org_id,
        email=invitation_data.email,
        role=invitation_data.role,
        token=token,
        invited_by_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=7)  # Expires in 7 days
    )
    
    db.add(invitation)
    db.commit()
    
    # TODO: Send invitation email
    
    return {"message": "Invitation sent successfully", "token": token}

@router.get("/{org_id}/members")
async def list_organization_members(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List organization members"""
    # Check if user is member
    user_role = get_user_org_role(user.id, org_id, db)
    if not user_role:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # This would need to be implemented based on your actual models
    # Placeholder implementation
    return {"members": [], "total": 0}

@router.get("/{org_id}/activity")
async def get_organization_activity(
    org_id: int,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organization activity feed"""
    # Check if user is member
    user_role = get_user_org_role(user.id, org_id, db)
    if not user_role:
        raise HTTPException(status_code=403, detail="Access denied")
    
    activities = db.query(ActivityLog).filter(
        ActivityLog.organization_id == org_id
    ).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    
    return {"activities": activities}