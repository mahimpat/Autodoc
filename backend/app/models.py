from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    stripe_customer_id = Column(String, nullable=True)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    template = Column(String, nullable=False)
    content = Column(JSON, nullable=True)  # outline/sections JSON
    created_at = Column(DateTime, server_default=func.now())
    stripe_customer_id = Column(String, nullable=True)

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
