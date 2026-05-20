from pydantic import BaseModel, Field

class CreateNewOrganization(BaseModel):
    
    name: str = Field(max_length=100)
    
    slug: str = Field(max_length=100)
    
    description: str = Field(max_length=250)