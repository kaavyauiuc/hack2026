from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class SessionSummary(BaseModel):
    session_id: str
    date: datetime
    cefr_estimate: str
    lesson_title: Optional[str] = None
    duration_minutes: Optional[float] = None
    language: Optional[str] = None   # e.g. "spa", "fra" — set when appended per-language


class LanguageProgress(BaseModel):
    language: str                 # "spa", "fra", ...
    current_cefr_level: str = "A1"
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    preferred_topics: List[str] = Field(default_factory=list)
    history: List[SessionSummary] = Field(default_factory=list)


class UserProfile(BaseModel):
    user_id: str
    name: str
    native_language: str
    active_language: str          # currently selected language code
    languages: List[LanguageProgress] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class UserProfileCreate(BaseModel):
    name: str
    target_language: str
    native_language: str
    current_cefr_level: str = "A1"
