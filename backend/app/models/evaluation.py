from pydantic import BaseModel, Field
from typing import List, Optional


class Evaluation(BaseModel):
    session_id: str
    cefr_estimate: str                      # e.g. "B1"
    achieved_objectives: List[str]
    partially_achieved: List[str]
    missed_objectives: List[str]
    weaknesses: List[str]
    confidence_score: float                  # 0.0 – 1.0
    next_recommendation: str
