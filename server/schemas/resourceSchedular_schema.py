from pydantic import BaseModel, Field
from datetime import datetime, time


class CreateNewScheduler(BaseModel):

    name: str = Field(..., max_length=100)

    fetch_time: time

    frequency: int = Field(..., gt=0)

    stop_date: datetime