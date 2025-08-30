from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Table, Boolean, Float, Interval, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from pgvector.sqlalchemy import Vector
from .db import Base
import uuid

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


# Template System Models

class TemplateCategory(Base):
    __tablename__ = "template_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    color = Column(String(20))
    parent_id = Column(UUID(as_uuid=True), ForeignKey('template_categories.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Self-referential relationship for hierarchical categories
    parent = relationship("TemplateCategory", remote_side=[id])
    children = relationship("TemplateCategory")
    
    # Templates in this category
    templates = relationship("Template", back_populates="category")


class Template(Base):
    __tablename__ = "templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category_id = Column(UUID(as_uuid=True), ForeignKey('template_categories.id'))
    tags = Column(ARRAY(String), default=[])
    version = Column(String(20), default='1.0.0')
    author_id = Column(Integer, ForeignKey('users.id'))
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=True)
    
    # Template content (YAML/JSON)
    template_data = Column(JSONB, nullable=False)
    
    # Visibility & Access
    visibility = Column(String(20), default='private')  # private, organization, public, marketplace
    is_verified = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    # Usage tracking
    total_uses = Column(Integer, default=0)
    success_rate = Column(Float, default=0)
    avg_rating = Column(Float, default=0)
    avg_completion_time = Column(Interval)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))
    
    # Search & Discovery
    search_vector = Column(TSVECTOR)
    
    # Relationships
    category = relationship("TemplateCategory", back_populates="templates")
    author = relationship("User")
    organization = relationship("Organization")
    variables = relationship("TemplateVariable", back_populates="template", cascade="all, delete-orphan")
    usage_records = relationship("TemplateUsage", back_populates="template")


class TemplateVariable(Base):
    __tablename__ = "template_variables"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey('templates.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # string, number, boolean, select, url, email, textarea
    required = Column(Boolean, default=False)
    default_value = Column(Text)
    options = Column(JSONB)  # For select types
    validation_rules = Column(JSONB)
    placeholder = Column(Text)
    description = Column(Text)
    help_text = Column(Text)
    order_index = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    template = relationship("Template", back_populates="variables")


class TemplateUsage(Base):
    __tablename__ = "template_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey('templates.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=True)
    
    # Usage context
    generation_time = Column(Interval)
    success = Column(Boolean)
    completion_rate = Column(Float)
    variables_used = Column(JSONB)
    
    # User feedback
    rating = Column(Integer)  # 1-5 stars
    feedback = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    template = relationship("Template", back_populates="usage_records")
    user = relationship("User")
    document = relationship("Document")


class TemplateCollection(Base):
    __tablename__ = "template_collections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    is_public = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")
    items = relationship("TemplateCollectionItem", back_populates="collection", cascade="all, delete-orphan")


class TemplateCollectionItem(Base):
    __tablename__ = "template_collection_items"
    
    collection_id = Column(UUID(as_uuid=True), ForeignKey('template_collections.id', ondelete='CASCADE'), primary_key=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey('templates.id', ondelete='CASCADE'), primary_key=True)
    order_index = Column(Integer, default=0)
    
    # Relationships
    collection = relationship("TemplateCollection", back_populates="items")
    template = relationship("Template")
