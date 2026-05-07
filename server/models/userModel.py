import uuid

from sqlalchemy import String, Boolean, Table, Column, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from uuid6 import uuid7

class Base(DeclarativeBase):
    pass

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id")),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id"))
)

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
        String(255),
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

    roles = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users"
    )