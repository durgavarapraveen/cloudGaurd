# models/Resources.py

import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Boolean
)

from sqlalchemy.dialects.postgresql import (
    UUID,
    JSONB
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from uuid6 import uuid7

from .Base import Base
from sqlalchemy.sql import func


class Resources(Base):

    __tablename__ = "resources"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "cloud_account_id",
            "resource_id",
            "region",
            name="uq_resource_region"
        ),
    )

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

    service: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    resource_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    resource_id: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    resource_name: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    arn: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    region: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    tags: Mapped[dict] = mapped_column(
        JSONB,
        default=dict
    )

    configuration: Mapped[dict] = mapped_column(
        JSONB,
        default=dict
    )

    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now()
    )

    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now()
    )
    
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "organization.id",
            ondelete="cascade"
        ),
        nullable=False
    )
    
    hashValue:  Mapped[str | None] = mapped_column(
        String(512),
        nullable=True
    )
    
    is_deleted: Mapped[Boolean] = mapped_column(
        Boolean,
        default=False
    )
    
    organization = relationship(
        "Organization",
        back_populates="resources",
    )

    cloud_account = relationship(
        "CloudAccounts",
        back_populates="resources",
    )

    findings = relationship(
        "Findings",
        back_populates="resource"
    )
    
    resource_summary = relationship(
        "ResourceSummary",
        back_populates="resources"
    )
    
    resource_summary_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resource_summary.id", ondelete="CASCADE"),
        nullable=False
    )
    
    drift_resource = relationship(
        "DriftResources",
        back_populates="resource"
    )
    
    # Inside your Resources model

    outgoing_relationships = relationship(
        "ResourceRelationShip",
        foreign_keys="ResourceRelationShip.source_id",
        back_populates="source",
        cascade="all, delete-orphan"
    )

    incoming_relationships = relationship(
        "ResourceRelationShip",
        foreign_keys="ResourceRelationShip.target_id",
        back_populates="target",
        cascade="all, delete-orphan"
    )