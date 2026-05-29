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

class ResourceRelationShip(Base):

    __tablename__ = "resource_relationship"

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

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "organization.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False
    )

    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False
    )

    relation: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    organization = relationship(
        "Organization",
        back_populates="resource_relationship",
    )

    source = relationship(
        "Resources",
        foreign_keys=[source_id],
        back_populates="outgoing_relationships",
    )

    target = relationship(
        "Resources",
        foreign_keys=[target_id],
        back_populates="incoming_relationships",
    )