from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Association table for many-to-many relationship between users and organizations
user_organization = Table(
    'user_organization',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('organization_id', Integer, ForeignKey('organizations.id'), primary_key=True),
    Column('role', String, default='member'),  # owner, admin, member, viewer
    Column('joined_at', DateTime(timezone=True), server_default=func.now())
)

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)  # URL-friendly name
    description = Column(Text)
    
    # Settings
    is_active = Column(Boolean, default=True)
    max_members = Column(Integer, default=50)
    max_storage_gb = Column(Integer, default=10)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Creator
    created_by_id = Column(Integer, ForeignKey('users.id'))
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Relationships
    members = relationship("User", secondary=user_organization, back_populates="organizations")
    workspaces = relationship("Workspace", back_populates="organization")
    invitations = relationship("OrganizationInvitation", back_populates="organization")

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    
    # Organization relationship
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    organization = relationship("Organization", back_populates="workspaces")
    
    # Settings
    is_public = Column(Boolean, default=False)  # Public within organization
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Creator
    created_by_id = Column(Integer, ForeignKey('users.id'))
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Relationships
    documents = relationship("Document", back_populates="workspace")
    snippets = relationship("Snippet", back_populates="workspace")

class OrganizationInvitation(Base):
    __tablename__ = "organization_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    organization = relationship("Organization", back_populates="invitations")
    
    email = Column(String, nullable=False, index=True)
    role = Column(String, default='member')  # owner, admin, member, viewer
    token = Column(String, unique=True, nullable=False)
    
    # Status
    is_accepted = Column(Boolean, default=False)
    is_expired = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    
    # Inviter
    invited_by_id = Column(Integer, ForeignKey('users.id'))
    invited_by = relationship("User", foreign_keys=[invited_by_id])

# Extended User model (add to existing User model)
class UserExtended:
    """
    Add these fields to your existing User model:
    """
    # Many-to-many relationship with organizations
    organizations = relationship("Organization", secondary=user_organization, back_populates="members")
    
    # Current active organization (for UI convenience)
    current_organization_id = Column(Integer, ForeignKey('organizations.id'))
    current_organization = relationship("Organization", foreign_keys=[current_organization_id])

# Extended Document model (add to existing Document model)  
class DocumentExtended:
    """
    Add these fields to your existing Document model:
    """
    # Workspace relationship
    workspace_id = Column(Integer, ForeignKey('workspaces.id'))
    workspace = relationship("Workspace", back_populates="documents")
    
    # Sharing settings
    is_public_in_workspace = Column(Boolean, default=False)
    is_template = Column(Boolean, default=False)  # Can be used as template by others

# Extended Snippet model (add to existing Snippet model)
class SnippetExtended:
    """
    Add these fields to your existing Snippet model:
    """
    # Workspace relationship (in addition to user_id)
    workspace_id = Column(Integer, ForeignKey('workspaces.id'))
    workspace = relationship("Workspace", back_populates="snippets")
    
    # Make snippets shareable within organization
    is_shared = Column(Boolean, default=True)  # Share with workspace by default

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Context
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    workspace_id = Column(Integer, ForeignKey('workspaces.id'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Activity
    action = Column(String, nullable=False)  # uploaded_document, generated_doc, created_workspace, etc.
    entity_type = Column(String)  # document, workspace, organization
    entity_id = Column(Integer)
    description = Column(Text)
    
    # Metadata
    metadata = Column(Text)  # JSON string with additional details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    organization = relationship("Organization")
    workspace = relationship("Workspace")