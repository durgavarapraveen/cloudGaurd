# models/Findings.py

import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    DateTime,
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

from uuid6 import uuid7

from .Base import Base


class Findings(Base):

    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scans.id", ondelete="CASCADE"),
        nullable=False
    )

    # policy_id: Mapped[uuid.UUID | None] = mapped_column(
    #     UUID(as_uuid=True),
    #     ForeignKey("policies.id"),
    #     nullable=True
    # )

    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id"),
        nullable=True
    )

    cloud_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
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

    region: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    severity: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    rule_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    rule_title: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    resource_identifier: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    resource_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    expected_value: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
    )

    actual_value: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
    )

    operator: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    remediation: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    compliance_framework: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    finding_metadata: Mapped[dict] = mapped_column(
        JSONB,
        default=dict
    )

    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships

    scan = relationship(
        "Scans",
        back_populates="findings"
    )

    resource = relationship(
        "Resources",
        back_populates="findings"
    )