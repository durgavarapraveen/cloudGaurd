import uuid

from sqlalchemy import (
    String,
    Boolean,
    ForeignKey,
    DateTime,
    JSON,
    UniqueConstraint
)

from sqlalchemy.orm import (
    relationship,
    Mapped,
    mapped_column,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from uuid6 import uuid7

from .Base import Base


class CloudAccounts(Base):

    __tablename__ = "cloud_accounts"
    
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "provider",
            "account_name",
            name="uq_provider_accountName"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid7,
    )

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    provider: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )
    # aws | azure | gcp | oci

    account_name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    account_identifier: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )
    # AWS   -> account_id
    # Azure -> subscription_id
    # GCP   -> project_id
    # OCI   -> tenancy_ocid

    region: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    # =========================
    # CREDENTIALS
    # =========================

    credentials: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    """
    Example:

    AWS:
    {
        "access_key": "...",
        "secret_key": "..."
    }

    Azure:
    {
        "tenant_id": "...",
        "client_id": "...",
        "client_secret": "..."
    }

    GCP:
    {
        "service_account_json": {...}
    }

    OCI:
    {
        "user_ocid": "...",
        "fingerprint": "...",
        "private_key": "..."
    }
    """

    # =========================
    # STATUS
    # =========================

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    scan_status: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )
    # pending | running | success | failed

    last_scan_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_error: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    # =========================
    # TIMESTAMPS
    # =========================

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
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
        back_populates="cloud_accounts",
    )
    #1:N
    scans = relationship(
        "Scans",
        back_populates="cloud_account",
        cascade="all, delete-orphan"
    )
    
    findings = relationship(
        "Findings",
        back_populates="cloud_account",
        cascade="all, delete-orphan"
    )
    
    resources = relationship(
        "Resources",
        back_populates="cloud_account",
        cascade="all, delete-orphan"
    )
    
    resource_summary = relationship(
        "ResourceSummary",
        back_populates="cloud_account",
        cascade="all, delete-orphan"
    )

    drift_resource = relationship(
        "DriftResources",
        back_populates="cloud_account",
        cascade="all, delete-orphan"
    )
    
    resource_relationships = relationship(
        "ResourceRelationShip",
        back_populates="cloud_account",
        cascade="all, delete-orphan"
    )
    
    resource_last_fetch = relationship(
        "ResourceLastFetched",
        back_populates="cloud_account",
        cascade="all, delete-orphan"
    )