from pydantic import BaseModel, EmailStr, Field

class CreateRoleRequest(BaseModel):

    name: str = Field(min_length=3, max_length=50)

    permissions: list[str] = Field(default_factory=list)