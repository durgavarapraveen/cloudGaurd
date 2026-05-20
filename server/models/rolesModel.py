import uuid

from sqlalchemy import String, Table, Column, ForeignKey, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base

role_permissions = Table(
    "role_permissions",
    Base.metadata,

    Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE")
    ),

    Column(
        "permission_id",
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE")
    )
)

class Role(Base):

    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True
    )

    users = relationship(
        "User",
        secondary="user_roles",
        back_populates="roles"
    )

    permissions = relationship(
        "Permission",
        secondary=role_permissions
    )
    
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )
