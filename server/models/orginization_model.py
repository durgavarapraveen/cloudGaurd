import uuid

from sqlalchemy import String, Boolean, Table, Column, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base
from sqlalchemy.sql import func

class Organization(Base):
    
    __table__ = "organization"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )
    
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    slug: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    
    description:  Mapped[str] = mapped_column(
        String(250),
        nullable=False
    )
    
    owner_id:  Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "rootUsers.id",
            ondelete="SET NULL"
        ),
        nullable=False,
    )
    
    is_active: Mapped[Boolean] = mapped_column(
        Boolean,
        default=False
    )
    
    is_delete: Mapped[Boolean] = mapped_column(
        Boolean,
        default=False
    )
    
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    
    root_users = relationship(
        "RootUsers",
        back_populates="organization"
    )