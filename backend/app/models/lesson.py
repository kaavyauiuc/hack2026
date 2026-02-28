from pydantic import BaseModel, Field
from typing import List


class LessonPlan(BaseModel):
    lesson_id: str
    title: str
    objectives: List[str]           # learning objectives for this session
    activities: List[str]           # conversation activities / prompts
    success_criteria: List[str]     # measurable success markers
    target_cefr_level: str          # CEFR level this lesson targets
