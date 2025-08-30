from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Table, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .db import Base

# Association table for many-to-many relationship between users and organizations
user_organization = Table(
    'user_organization',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('organization_id', Integer, ForeignKey('organizations.id'), primary_key=True),
    Column('role', String, default='member'),  # owner, admin, member, viewer
    Column('joined_at', DateTime(timezone=True), server_default=func.now())
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    stripe_customer_id = Column(String, nullable=True)
    
    # Collaborative relationships
    organizations = relationship("Organization", secondary=user_organization, back_populates="members")
    current_organization_id = Column(Integer, ForeignKey('organizations.id'))
    current_organization = relationship("Organization", foreign_keys=[current_organization_id])

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    template = Column(String, nullable=False)
    content = Column(JSON, nullable=True)  # outline/sections JSON
    created_at = Column(DateTime, server_default=func.now())
    stripe_customer_id = Column(String, nullable=True)
    
    # Workspace relationship
    workspace_id = Column(Integer, ForeignKey('workspaces.id'))
    workspace = relationship("Workspace", back_populates="documents")
    is_public_in_workspace = Column(Boolean, default=False)
    is_template = Column(Boolean, default=False)

    user = relationship("User")

class Snippet(Base):
    __tablename__ = "snippets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project = Column(String, default="default", index=True)
    path = Column(String)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(384))   # default embed dims for all-minilm
    created_at = Column(DateTime, server_default=func.now())
    stripe_customer_id = Column(String, nullable=True)
    
    # Workspace relationship
    workspace_id = Column(Integer, ForeignKey('workspaces.id'))
    workspace = relationship("Workspace", back_populates="snippets")
    is_shared = Column(Boolean, default=True)


from sqlalchemy import UniqueConstraint

class PinnedSnippet(Base):
    __tablename__ = "pinned_snippets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    doc_id = Column(Integer, nullable=False, index=True)
    section_index = Column(Integer, nullable=False)
    snippet_id = Column(Integer, ForeignKey("snippets.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    stripe_customer_id = Column(String, nullable=True)

    __table_args__ = (UniqueConstraint('user_id','doc_id','section_index','snippet_id', name='uq_pin'),)


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="inactive")  # active, trialing, past_due, canceled, incomplete
    tier = Column(String, default="free")        # free, pro, team
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Usage(Base):
    __tablename__ = "usage"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    period_start = Column(DateTime, server_default=func.now())
    period_end = Column(DateTime, nullable=True)
    generations_today = Column(Integer, default=0)  # resets daily
    tokens_month = Column(Integer, default=0)       # resets monthly
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
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
    is_public = Column(Boolean, default=False)
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
    role = Column(String, default='member')
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


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Context
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    workspace_id = Column(Integer, ForeignKey('workspaces.id'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Activity
    action = Column(String, nullable=False)
    entity_type = Column(String)
    entity_id = Column(Integer)
    description = Column(Text)
    
    # Metadata
    activity_metadata = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    organization = relationship("Organization")
    workspace = relationship("Workspace")
