from datetime import datetime
from typing import Any

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from typing_extensions import Literal

class CreateNewDrift(BaseModel):
    resource_id: str
    