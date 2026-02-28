from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class SessionSummary(BaseModel):
    session_id: str
    date: datetime
    cefr_estimate: str
    lesson_title: Optional[str] = None
    duration_minutes: Optional[float] = None


class UserProfile(BaseModel):
    user_id: str
    name: str
    target_language: str           # e.g. "spa", "fra"
    native_language: str           # e.g. "eng"
    current_cefr_level: str = "A1" # A1, A2, B1, B2, C1, C2
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    history: List[SessionSummary] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class UserProfileCreate(BaseModel):
    name: str
    target_language: str
    native_language: str
    current_cefr_level: str = "A1"
