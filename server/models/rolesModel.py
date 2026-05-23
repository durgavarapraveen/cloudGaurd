import uuid

from sqlalchemy import String, Table, Column, ForeignKey, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base

from .associations import user_roles, role_permissions

class Role(Base):

    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    name: Mapped[str] = mapped_column(
        String(50),
    )

    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles"
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
        back_populates="roles",
    )

    users = relationship(
        "User",
        secondary=user_roles,
        back_populates="roles"
    )
