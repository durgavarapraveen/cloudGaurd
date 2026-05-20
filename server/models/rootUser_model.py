import uuid

from sqlalchemy import String, Boolean, Table, Column, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base
from sqlalchemy.sql import func


class RootUsers(Base):
    
    __table__ = "rootUsers"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )
    
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    organization: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "organization.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )
    
    organizations = relationship(
        "Organization",
        back_populates="rootUsers"
    )