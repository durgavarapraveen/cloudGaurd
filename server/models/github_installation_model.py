import uuid

from sqlalchemy import String, Boolean, Table, Column, ForeignKey, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from uuid6 import uuid7
from .Base import Base
from sqlalchemy.sql import func

class GitHubInstallation(Base):
    
    __tablename__ = "github_installation"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7
    )
    
    organization_id:  Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "organization.id",
            ondelete="CASCADE"
        ),
        nullable=False,
    )
    
    installation_id: Mapped[int] = mapped_column(
        String(50),
        nullable=False
    )
    
    account_type: Mapped[int] = mapped_column(
        String(100),
        nullable=True
    )
    
    account_login: Mapped[int] = mapped_column(
        String(100),
        nullable=True
    )
    
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    organization = relationship(
        "Organization",
        back_populates="github_installation",
    )