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
from enum import Enum

from .Base import Base
from sqlalchemy.sql import func

class DriftStatus(str, Enum):
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in-progress"
    RESOLVED = "resolved"
    IGNORED = 'ignored'

class DriftResources(Base):

    __tablename__ = "drift_resources"
    
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
    
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "resources.id",
        ),
        nullable=False
    )
    
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now()
    )
    
    resolved_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now()
    )
    
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="new"
    )
    
    assigned_to_id: Mapped[uuid.UUID] = mapped_column(
        "assigned_to",
        UUID(as_uuid=True),
        ForeignKey(
            "user_groups.id",
        ),
        nullable=True
    )
    
    issue_with_resource: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        default="new"
    )
    
    organization = relationship(
        "Organization",
        back_populates="drift_resource",
    )
    
    resource = relationship(
        "Resources",
        back_populates="drift_resource",
    )
    
    cloud_account = relationship(
        "CloudAccounts",
        back_populates="drift_resource",
    )
    
    assigned_to = relationship(
        "UserGroups",
        back_populates="drift_resource",
    )
    
    comments = relationship(
        "Comments",
        back_populates="drift_resource",
        cascade="all, delete-orphan"
    )