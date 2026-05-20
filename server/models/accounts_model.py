import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    DateTime,
    UniqueConstraint
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7

from .Base import Base


class Accounts(Base):

    __tablename__ = "accounts"

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "account_id",
            name="uq_provider_account"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False
    )

    provider: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    account_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    account_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
