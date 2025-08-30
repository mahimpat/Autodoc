from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    version_number = Column(String, nullable=False)  # e.g., "1.0.0", "1.1.0"
    branch_name = Column(String, default="main")
    parent_version_id = Column(Integer, ForeignKey('document_versions.id'))
    
    # Content
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    content_json = Column(JSON)  # Structured content for diffing
    template = Column(String, nullable=False)
    
    # Metadata
    change_summary = Column(Text)  # What changed in this version
    word_count = Column(Integer, default=0)
    character_count = Column(Integer, default=0)
    readability_score = Column(Float)  # Flesch reading ease score
    
    # Version control
    is_published = Column(Boolean, default=False)
    is_draft = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False)
    
    # Approval workflow
    approval_status = Column(String, default='draft')  # draft, pending, approved, rejected
    approved_by_id = Column(Integer, ForeignKey('users.id'))
    approved_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Author
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    
    # Relationships
    document = relationship("Document")
    parent_version = relationship("DocumentVersion", remote_side=[id])
    child_versions = relationship("DocumentVersion")
    version_tags = relationship("DocumentVersionTag", back_populates="version")
    comments = relationship("DocumentComment", back_populates="version")


class DocumentVersionTag(Base):
    __tablename__ = "document_version_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey('document_versions.id'), nullable=False)
    tag_name = Column(String, nullable=False)  # e.g., "release", "hotfix", "feature"
    tag_value = Column(String)  # e.g., "v1.0", "urgent", "quarterly-review"
    color = Column(String, default="#3B82F6")  # Hex color for UI
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by = relationship("User")
    
    version = relationship("DocumentVersion", back_populates="version_tags")


class DocumentComment(Base):
    __tablename__ = "document_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey('document_versions.id'), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey('document_comments.id'))  # For replies
    
    # Comment content
    content = Column(Text, nullable=False)
    comment_type = Column(String, default="general")  # general, suggestion, approval, issue
    
    # Position in document (for inline comments)
    line_number = Column(Integer)
    selection_start = Column(Integer)
    selection_end = Column(Integer)
    selected_text = Column(Text)
    
    # Status
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True))
    resolved_by_id = Column(Integer, ForeignKey('users.id'))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Author
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    
    # Relationships
    version = relationship("DocumentVersion", back_populates="comments")
    parent_comment = relationship("DocumentComment", remote_side=[id])
    replies = relationship("DocumentComment")


class DocumentAnalytics(Base):
    __tablename__ = "document_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False, index=True)
    version_id = Column(Integer, ForeignKey('document_versions.id'))
    
    # View analytics
    total_views = Column(Integer, default=0)
    unique_viewers = Column(Integer, default=0)
    avg_time_spent = Column(Float, default=0.0)  # minutes
    
    # Engagement metrics
    downloads = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    approvals_count = Column(Integer, default=0)
    
    # Quality metrics
    readability_trend = Column(JSON)  # Historical readability scores
    word_count_trend = Column(JSON)  # Historical word counts
    completion_rate = Column(Float, default=0.0)  # How much of doc is typically read
    
    # Geographic/team analytics
    viewer_locations = Column(JSON)  # Country/region breakdown
    viewer_roles = Column(JSON)  # Role-based viewing patterns
    team_engagement = Column(JSON)  # Team member interaction patterns
    
    # Time-based analytics
    peak_viewing_hours = Column(JSON)  # When document is most accessed
    seasonal_trends = Column(JSON)  # Monthly/quarterly patterns
    
    # Timestamps
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    analytics_period_start = Column(DateTime(timezone=True))
    analytics_period_end = Column(DateTime(timezone=True))
    
    # Relationships
    document = relationship("Document")
    version = relationship("DocumentVersion")


class DocumentComplianceCheck(Base):
    __tablename__ = "document_compliance_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey('document_versions.id'), nullable=False)
    
    # Compliance framework
    framework = Column(String, nullable=False)  # e.g., "GDPR", "HIPAA", "SOX", "ISO27001"
    rule_id = Column(String, nullable=False)  # Specific rule within framework
    rule_description = Column(Text)
    
    # Check results
    status = Column(String, nullable=False)  # passed, failed, warning, not_applicable
    severity = Column(String, default="medium")  # low, medium, high, critical
    confidence = Column(Float, default=1.0)  # 0.0 to 1.0
    
    # Details
    found_issues = Column(JSON)  # List of specific issues found
    suggestions = Column(JSON)  # Recommended fixes
    affected_sections = Column(JSON)  # Which parts of document are affected
    
    # Automated fix
    can_auto_fix = Column(Boolean, default=False)
    auto_fix_applied = Column(Boolean, default=False)
    auto_fix_content = Column(Text)  # What the fix would change
    
    # Timestamps
    checked_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    version = relationship("DocumentVersion")


class DocumentExportJob(Base):
    __tablename__ = "document_export_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey('document_versions.id'), nullable=False)
    
    # Export configuration
    format = Column(String, nullable=False)  # pdf, docx, html, markdown, epub, latex
    template_id = Column(String)  # Custom template for branding
    
    # Branding options
    company_logo = Column(String)  # URL to logo
    company_name = Column(String)
    brand_colors = Column(JSON)  # Primary, secondary colors
    font_family = Column(String, default="Inter")
    
    # Layout options
    page_size = Column(String, default="A4")  # A4, Letter, Legal
    margins = Column(JSON)  # Top, right, bottom, left margins
    header_footer = Column(JSON)  # Header/footer configuration
    table_of_contents = Column(Boolean, default=True)
    
    # Security options
    password_protected = Column(Boolean, default=False)
    watermark_text = Column(String)
    restrict_editing = Column(Boolean, default=False)
    restrict_copying = Column(Boolean, default=False)
    
    # Job status
    status = Column(String, default="queued")  # queued, processing, completed, failed
    progress = Column(Float, default=0.0)  # 0.0 to 1.0
    file_url = Column(String)  # URL to download completed file
    file_size = Column(Integer)  # Size in bytes
    error_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))  # When download link expires
    
    # Author
    requested_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    requested_by = relationship("User")
    
    # Relationships
    version = relationship("DocumentVersion")