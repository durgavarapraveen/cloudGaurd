from pydantic import BaseModel, Field


class CreateNewGroup(BaseModel):

    name: str = Field(..., max_length=100)
    
    description: str

    permissions: list[str]