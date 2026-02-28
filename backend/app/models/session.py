from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Message(BaseModel):
    speaker: str        # "user" or "tutor"
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Transcript(BaseModel):
    session_id: str
    lesson_id: str
    user_id: str
    messages: List[Message] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
