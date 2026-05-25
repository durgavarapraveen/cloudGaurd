import uuid

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Boolean,
    String,
    Time
)

from sqlalchemy.dialects.postgresql import UUID

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from uuid6 import uuid7

from .Base import Base
from sqlalchemy.sql import func

class ResourceSchedular(Base):
    
    __tablename__ = "resource_schedular"
    
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
            ondelete="cascade"
        ),
        nullable=False
    )
    
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    fetch_time: Mapped[Time] = mapped_column(
        Time,
        nullable=False
    )
    
    frequency: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    
    stop_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    
    is_active: Mapped[Boolean] = mapped_column(
        Boolean,
        default=True
    )
    
    last_scan: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    resource_summary = relationship(
        "ResourceSummary",
        back_populates="resource_schedular"
    )
    
    organization = relationship(
        "Organization",
        back_populates="resource_schedular",
    )