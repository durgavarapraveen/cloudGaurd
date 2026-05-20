import uuid

from sqlalchemy import String, Boolean, Table, Column, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base

from .associations import userGroup_permissions, userGroup_users

class UserGroups(Base):

    __tablename__ = "user_groups"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    name: Mapped[str] = mapped_column(
        String(50),
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
    
    organization = relationship(
        "Organization",
        back_populates="user_groups",
    )
    
    users = relationship(
        "User",
        secondary=userGroup_users,
        back_populates="groups"
    )
    
    permissions = relationship(
        "Permission",
        secondary=userGroup_permissions
    )
    
    
    
    
