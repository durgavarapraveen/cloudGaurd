from sqlalchemy import Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from .Base import Base


user_roles = Table(
    "user_roles",
    Base.metadata,

    Column(
        "user_id",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE")
    ),

    Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE")
    )
)


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

userGroup_users = Table(
    "userGroup_users",
    Base.metadata,

    Column(
        "userGroup_id",
        UUID(as_uuid=True),
        ForeignKey("user_groups.id", ondelete="CASCADE")
    ),

    Column(
        "user_id",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE")
    )
)

userGroup_permissions = Table(
    "userGroup_permissions",
    Base.metadata,

    Column(
        "userGroup_id",
        UUID(as_uuid=True),
        ForeignKey("user_groups.id", ondelete="CASCADE")
    ),

    Column(
        "permission_id",
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE")
    )
)
