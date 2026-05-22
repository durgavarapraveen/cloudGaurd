import uuid

from sqlalchemy import String, Boolean, Table, Column, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base
from sqlalchemy.sql import func

class Organization(Base):
    
    __tablename__ = "organization"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )
    
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    slug: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True
    )
    
    description:  Mapped[str] = mapped_column(
        String(250),
        nullable=False
    )
    
    owner_id:  Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "rootUsers.id",
            ondelete="SET NULL"
        ),
        nullable=True,
    )
    
    is_active: Mapped[Boolean] = mapped_column(
        Boolean,
        default=False
    )
    
    is_deleted: Mapped[Boolean] = mapped_column(
        Boolean,
        default=False
    )
    
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    
    owner = relationship(
        "RootUsers",
        back_populates="organization",
        # uselist=False
    )
    
    users = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    roles = relationship(
        "Role",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    permissions = relationship(
        "Permission",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    user_groups = relationship(
        "UserGroups",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    cloud_accounts = relationship(
        "CloudAccounts",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    scans = relationship(
        "Scans",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    findings = relationship(
        "Findings",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    resources = relationship(
        "Resources",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    summary = relationship(
        "Summary",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
    resource_summary = relationship(
        "ResourceSummary",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    
