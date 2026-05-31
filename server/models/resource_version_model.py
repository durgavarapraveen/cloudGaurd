# models/ResourceVersion.py

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from uuid6 import uuid7
from .Base import Base


class ResourceVersion(Base):

    __tablename__ = "resource_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False
    )

    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    # Snapshot of what changed
    configuration: Mapped[dict] = mapped_column(JSONB, default=dict)
    tags: Mapped[dict] = mapped_column(JSONB, default=dict)
    resource_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    hashValue: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # What fields changed from previous version
    changed_fields: Mapped[dict] = mapped_column(JSONB, default=dict)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    resource = relationship(
        "Resources",
        back_populates="versions"
    )