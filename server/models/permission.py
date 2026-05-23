import uuid

from sqlalchemy import Boolean, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base
from .associations import role_permissions

class Permission(Base):

    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "name",
            name="uq_permission_organization_name",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
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
        back_populates="permissions",
    )

    roles = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions",
    )
