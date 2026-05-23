# models/Resources.py

import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Integer
)

from sqlalchemy.dialects.postgresql import UUID, JSONB

from sqlalchemy.dialects.postgresql import (
    UUID,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from uuid6 import uuid7

from .Base import Base
from sqlalchemy.sql import func

class ResourceSummary(Base):
    
    __tablename__ = "resource_summary"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )
    
    cloud_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cloud_accounts.id", ondelete="CASCADE"),
        nullable=False
    )
    
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "organization.id",
            ondelete="cascade"
        ),
        nullable=False
    )
    
    total_resources_fetched_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    updated_resources_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    
    updated_resource_ids: Mapped[list[dict]] = mapped_column(
        JSONB,
        nullable=False,
        default=list
    )

    newly_added_resource_ids: Mapped[list[dict]] = mapped_column(
        JSONB,
        nullable=False,
        default=list
    )

    newly_added_resources_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    
    fetched_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    organization = relationship(
        "Organization",
        back_populates="resource_summary",
    )
    
    resources = relationship(
        "Resources",
        back_populates="resource_summary",
        cascade="all, delete-orphan"
    )
    
    cloud_account = relationship(
        "CloudAccounts",
        back_populates="resource_summary"
    )
    
    
    