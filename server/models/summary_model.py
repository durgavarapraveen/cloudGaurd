

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

class Summary(Base):
    
    __tablename__ = "summary"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
    )

    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scans.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    organization = relationship(
        "Organization",
        back_populates="summary",
    )

    scans = relationship(
        "Scans",
        back_populates="summary",
    )
