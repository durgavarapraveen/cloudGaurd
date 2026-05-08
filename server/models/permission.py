import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base

class Permission(Base):

    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True
    )
    
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )