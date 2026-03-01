"""
Gemini AI service — drop-in replacement for claude_service.py.
Uses google-genai (google.genai) with gemini-2.5-flash.
claude_service.py is preserved for when Claude credits are restored.
"""

import os
import uuid
from typing import AsyncGenerator, List, Literal, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv

from app.models import LessonPlan, Evaluation
from app.prompts.planner import PLANNER_SYSTEM_PROMPT
from app.prompts.tutor import build_tutor_system_prompt
from app.prompts.evaluator import EVALUATOR_SYSTEM_PROMPT

load_dotenv()

MODEL = "gemini-2.5-flash"


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


# ─────────────────────────────────────────────
# Structured output schemas (no session/lesson IDs — injected after)
# ─────────────────────────────────────────────

class _LessonPlanOutput(BaseModel):
    title: str
    objectives: List[str]
    activities: List[str]
    success_criteria: List[str]
    target_cefr_level: str


class _EvaluationOutput(BaseModel):
    cefr_estimate: Literal["A1", "A2", "B1", "B2", "C1", "C2"]
    achieved_objectives: List[str]
    partially_achieved: List[str]
    missed_objectives: List[str]
    weaknesses: List[str]
    confidence_score: float
    next_recommendation: str
    learning_interest_signals: List[str]


# ─────────────────────────────────────────────
# Planner
# ─────────────────────────────────────────────

def plan_lesson(user_profile: dict) -> LessonPlan:
    """Generate a CEFR-aligned lesson plan using Gemini structured output."""
    client = _get_client()
    lesson_id = str(uuid.uuid4())

    # Build recent session history string (last 5, most recent first)
    history = user_profile.get("history", [])
    recent = list(reversed(history[-5:])) if history else []
    if recent:
        history_lines = []
        for h in recent:
            date = str(h.get("date", ""))[:10]
            title = h.get("lesson_title") or "Unknown topic"
            cefr = h.get("cefr_estimate", "")
            history_lines.append(f"  - {date}: \"{title}\" (assessed: {cefr})")
        history_str = "- Recent sessions (most recent first):\n" + "\n".join(history_lines)
        history_str += "\n  → Do NOT repeat these topics. Build on them or advance to the next logical step."
    else:
        history_str = "- Recent sessions: None (this is the learner's first session)"

    prompt = (
        f"{PLANNER_SYSTEM_PROMPT}\n\n"
        f"Create a lesson plan for this learner:\n"
        f"- Target language: {user_profile.get('target_language')}\n"
        f"- Native language: {user_profile.get('native_language')}\n"
        f"- Current CEFR level: {user_profile.get('current_cefr_level', 'A1')}\n"
        f"- Strengths: {', '.join(user_profile.get('strengths', [])) or 'None identified yet'}\n"
        f"- Weaknesses: {', '.join(user_profile.get('weaknesses', [])) or 'None identified yet'}\n"
        f"- Preferred topics (from past sessions): {', '.join(user_profile.get('preferred_topics', [])) or 'None yet'}\n"
        f"  → Incorporate at least one preferred topic if relevant to the CEFR level.\n"
        f"{history_str}"
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_LessonPlanOutput,
        ),
    )

    data = response.parsed.model_dump()
    data["lesson_id"] = lesson_id
    return LessonPlan(**data)


# ─────────────────────────────────────────────
# Tutor (async streaming)
# ─────────────────────────────────────────────

async def stream_tutor_response(
    user_profile: dict,
    lesson_plan: dict,
    conversation_history: List[dict],
    user_message: str,
    last_session: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """Stream the tutor's reply as text chunks (same interface as claude_service)."""
    client = _get_client()

    system_prompt = build_tutor_system_prompt(
        target_language=user_profile.get("target_language", "spa"),
        native_language=user_profile.get("native_language", "eng"),
        cefr_level=user_profile.get("current_cefr_level", "A1"),
        lesson_plan=lesson_plan,
        last_session=last_session,
    )

    # Convert history: "assistant" role → "model" for Gemini
    contents = []
    for msg in conversation_history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    stream = await client.aio.models.generate_content_stream(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=512,
        ),
    )

    async for chunk in stream:
        if chunk.text:
            yield chunk.text


# ─────────────────────────────────────────────
# Evaluator
# ─────────────────────────────────────────────

def evaluate_session(session_id: str, transcript: dict, lesson_plan: dict) -> Evaluation:
    """Evaluate a completed session using structured Gemini output."""
    client = _get_client()

    messages_text = "\n".join(
        f"[{msg['speaker'].upper()}]: {msg['text']}"
        for msg in transcript.get("messages", [])
    )
    objectives_text = "\n".join(
        f"- {obj}" for obj in lesson_plan.get("objectives", [])
    )

    prompt = (
        f"{EVALUATOR_SYSTEM_PROMPT}\n\n"
        f"Please evaluate this language learning session.\n\n"
        f"Session ID: {session_id}\n\n"
        f"Lesson objectives:\n{objectives_text}\n\n"
        f"Full transcript:\n{messages_text}"
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_EvaluationOutput,
        ),
    )

    data = response.parsed.model_dump()
    data["session_id"] = session_id
    return Evaluation(**data)


# ─────────────────────────────────────────────
# Translator
# ─────────────────────────────────────────────

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text from source_lang to target_lang."""
    client = _get_client()
    lang_names = {
        "spa": "Spanish", "fra": "French", "deu": "German",
        "cmn": "Mandarin Chinese", "jpn": "Japanese", "por": "Portuguese",
        "hin": "Hindi", "eng": "English",
    }
    src = lang_names.get(source_lang, source_lang)
    tgt = lang_names.get(target_lang, target_lang)

    response = client.models.generate_content(
        model=MODEL,
        contents=(
            f"Translate the following {src} text to {tgt}. "
            f"Output ONLY the translation, no explanation.\n\n{text}"
        ),
    )
    return response.text.strip()
