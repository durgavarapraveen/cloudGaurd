# models/Resources.py

from sqlalchemy import (
    String,
    Boolean
)
from sqlalchemy.dialects.postgresql import (
    UUID,
)
from sqlalchemy.orm import (
    mapped_column,
)

from .Base import Base

class RelationShipRule(Base):

    __tablename__ = "relationship_rules"

    id = mapped_column(UUID(as_uuid=True), primary_key=True)

    source_type = mapped_column(String)

    relation = mapped_column(String)

    target_type = mapped_column(String)

    source_field = mapped_column(String)

    target_field = mapped_column(
        String,
        default="resource_id"
    )

    is_array = mapped_column(Boolean, default=False)

    enabled = mapped_column(Boolean, default=True)
    