from pydantic import BaseModel, Field

class CreateNewRootUserRequest(BaseModel):

    username: str = Field(min_length=3, max_length=50)

    password: str = Field(min_length=8, max_length=128)
    
    role: str = Field(min_length=3)
    
class LoginRootUserRequest(BaseModel):

    username: str = Field(min_length=3, max_length=50)

    password: str = Field(min_length=8, max_length=128)
    