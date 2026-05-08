from pydantic import BaseModel, EmailStr, Field

class CreateUserRequest(BaseModel):

    username: str = Field(min_length=3, max_length=50)

    email: EmailStr

    password: str = Field(min_length=8, max_length=128)
    
    roles: list[str] = Field(default_factory=list)


class UserResponse(BaseModel):

    id: str

    username: str

    email: EmailStr
    
class UserLoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(min_length=8)