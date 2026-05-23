import uuid

from sqlalchemy import String, Boolean, Table, Column, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base
from sqlalchemy.sql import func



from .associations import user_roles, userGroup_users

class User(Base):

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    username: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    password: Mapped[str] = mapped_column(
        String(1024),
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )
    
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False
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
        back_populates="users",
    )

    roles = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users"
    )
    
    groups = relationship(
        "UserGroups",
        secondary=userGroup_users,
        back_populates="users"
    )
    
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    