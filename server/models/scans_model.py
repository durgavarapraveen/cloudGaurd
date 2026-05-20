# models/Scans.py

import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    DateTime,
    Integer,
    ForeignKey
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
from sqlalchemy.sql import func

from uuid6 import uuid7

from .Base import Base


class Scans(Base):

    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    cloud_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cloud_accounts.id"),
        nullable=False
    )

    scan_status: Mapped[str] = mapped_column(
        String(50),
        default="completed",
        nullable=False
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    scan_duration_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    regions_scanned: Mapped[dict] = mapped_column(
        JSONB,
        default=list
    )

    services_scanned: Mapped[dict] = mapped_column(
        JSONB,
        default=list
    )

    scan_metadata: Mapped[dict] = mapped_column(
        JSONB,
        default=dict
    )

    total_resources: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    total_checks: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    total_passed: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    total_failed: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    total_warning: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    critical_count: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    high_count: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    medium_count: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    low_count: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    info_count: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
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
    
    organization = relationship(
        "Organization",
        back_populates="scans",
    )

    cloud_account = relationship(
        "CloudAccounts",
        back_populates="scans"
    )

    findings = relationship(
        "Findings",
        back_populates="scan",
        # uselist=False,
        cascade="all, delete-orphan",
        
    )
    
    summary = relationship(
        "Summary",
        back_populates="scans",
        uselist=False,
        cascade="all, delete-orphan"
    )