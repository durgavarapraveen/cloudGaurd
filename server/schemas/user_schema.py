from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field
class CreateUserRequest(BaseModel):

    username: str = Field(min_length=3, max_length=50)

    email: EmailStr

    password: str = Field(min_length=8, max_length=128)
    
    roles: list[str] = Field(default_factory=list)
    
    organizationId: str


class UserResponse(BaseModel):

    id: str

    username: str

    email: EmailStr
    
class UserLoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(min_length=8)

class RefreshTokenRequest(BaseModel):
    refresh_token: str
    
class CreateUserByAdmin(BaseModel):
    username: str = Field(min_length=3, max_length=50)

    email: EmailStr
    
    roles: list[str] = Field(default_factory=list)
    
class CreateUserByRootUser(BaseModel):
    username: str = Field(min_length=3, max_length=50)

    email: EmailStr
    
    organizationId: uuid.UUID
    


# ──────────────────────────────────────────────────────────────
#  Response models
#
#  Routes that return ORM User / RootUsers rows must declare one of these as
#  their response_model. The ORM rows carry the Argon2 password hash, and
#  FastAPI serialises every attribute unless a response model restricts it.
# ──────────────────────────────────────────────────────────────


class UserPublic(BaseModel):
    """A user, without the password hash."""

    id: uuid.UUID

    username: str

    email: EmailStr

    is_active: bool

    organization_id: uuid.UUID | None = None

    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationPublic(BaseModel):

    id: uuid.UUID

    name: str

    slug: str

    description: str | None = None

    is_active: bool | None = None

    model_config = ConfigDict(from_attributes=True)


class RootUserPublic(BaseModel):
    """A platform operator and the organizations they own, without the hash."""

    id: uuid.UUID

    username: str

    role: str | None = None

    organization: list[OrganizationPublic] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
