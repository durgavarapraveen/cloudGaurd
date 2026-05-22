from datetime import datetime
from typing import Any

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from typing_extensions import Literal


class CreateNewCloudAccount(BaseModel):

    provider: Literal["aws", "azure", "gcp", "oci"]

    account_name: str = Field(
        min_length=3,
        max_length=100,
    )

    account_identifier: str = Field(
        min_length=3,
        max_length=256,
    )

    region: str | None = Field(
        default=None,
        max_length=100,
    )

    credentials: dict[str, Any]

    @field_validator("account_name")
    @classmethod
    def validate_name(cls, value: str):
        return value.strip()
    
class CloudAccountResponse(BaseModel):

    id: str

    provider: str

    account_name: str

    account_identifier: str

    region: str | None

    is_active: bool

    scan_status: str | None

    last_scan_at: datetime | None

    created_at: datetime

    updated_at: datetime

    class Config:
        from_attributes = True