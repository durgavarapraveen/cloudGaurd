# models/Resources.py

import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Boolean,
    Enum as SAEnum,
)

from sqlalchemy.dialects.postgresql import (
    UUID,
    JSONB
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from uuid6 import uuid7
from .Base import Base
from sqlalchemy.sql import func


# ─────────────────────────────────────────────────────────────
# ENUM — all valid relationship types
# Add new types here as you expand to more services
# ─────────────────────────────────────────────────────────────

class RelationshipType(str, enum.Enum):

    # Network relationships
    BELONGS_TO          = "belongs_to"          # EC2 → VPC, Subnet → VPC
    CONTAINS            = "contains"            # VPC → Subnet, Subnet → EC2
    CONNECTS_TO         = "connects_to"         # EC2 → RDS via SG
    PROTECTED_BY        = "protected_by"        # EC2 → SecurityGroup
    ROUTES_TO           = "routes_to"           # RouteTable → IGW

    # IAM relationships
    ATTACHED_TO         = "attached_to"         # Policy → Role/User/Group
    ASSUMES             = "assumes"             # Role → TrustPolicy principal
    MEMBER_OF           = "member_of"           # User → Group
    GRANTED_BY          = "granted_by"          # Permission → Policy

    # Storage relationships
    MOUNTED_ON          = "mounted_on"          # EBS → EC2
    BACKED_UP_TO        = "backed_up_to"        # RDS → S3 snapshot
    LOGS_TO             = "logs_to"             # Resource → S3/CloudWatch
    ENCRYPTED_BY        = "encrypted_by"        # S3/RDS → KMS Key

    # Compute relationships
    RUNS_ON             = "runs_on"             # Lambda → VPC
    TRIGGERED_BY        = "triggered_by"        # Lambda → EventBridge/S3
    USES_ROLE           = "uses_role"           # EC2/Lambda → IAM Role
    DEPLOYED_IN         = "deployed_in"         # ECS Task → Subnet
    HAS                 = "has"

    # DNS / Routing
    RESOLVES_TO         = "resolves_to"         # Route53 → ALB/CloudFront
    FRONTED_BY          = "fronted_by"          # ALB → EC2/ECS
    DISTRIBUTES_TO      = "distributes_to"      # CloudFront → S3/ALB

    # Cross-account
    TRUSTS_ACCOUNT      = "trusts_account"      # Role → External Account
    REPLICATES_TO       = "replicates_to"       # S3 → S3 cross-region
    REFERENCES          = "references"


# ─────────────────────────────────────────────────────────────
# MODEL
# ─────────────────────────────────────────────────────────────

class ResourceRelationShip(Base):  # fixed typo: RelationShip → Relationship

    __tablename__ = "resource_relationship"

    __table_args__ = (
        # Prevent exact duplicate relationships
        UniqueConstraint(
            "source_id",
            "target_id",
            "relation",
            "cloud_account_id",
            name="uq_resource_relationship"
        ),
        # Index for fast graph traversal queries
        # (defined here so they live with the model)
    )

    # ── Primary Key ───────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=lambda: uuid7()
    )

    # ── Foreign Keys ──────────────────────────────────────────
    cloud_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cloud_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True                    # ← fast "what does X connect to"
    )

    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True                    # ← fast "what connects to X"
    )

    # ── Relationship Type ─────────────────────────────────────
    relation: Mapped[RelationshipType] = mapped_column(
        SAEnum(
            RelationshipType,
            name="relationship_type_enum",
            create_type=True          # creates pg ENUM type automatically
        ),
        nullable=False,
        index=True
    )


    # ── Relationships ─────────────────────────────────────────
    organization = relationship(
        "Organization",
        back_populates="resource_relationships",
    )

    cloud_account = relationship(              # ← was missing
        "CloudAccounts",
        back_populates="resource_relationships",
    )

    source = relationship(
        "Resources",
        foreign_keys=[source_id],
        back_populates="outgoing_relationships",
    )

    target = relationship(
        "Resources",
        foreign_keys=[target_id],
        back_populates="incoming_relationships",
    )