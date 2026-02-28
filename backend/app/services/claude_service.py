"""
Claude AI service — Planner, Tutor (streaming), and Evaluator.
Uses Anthropic Python SDK with tool use for structured JSON outputs.
"""

import os
import uuid
import json
from typing import AsyncGenerator, List, Optional

import anthropic
from dotenv import load_dotenv

from app.models import LessonPlan, Evaluation
from app.prompts.planner import PLANNER_SYSTEM_PROMPT, LESSON_PLAN_TOOL
from app.prompts.tutor import build_tutor_system_prompt
from app.prompts.evaluator import EVALUATOR_SYSTEM_PROMPT, EVALUATION_TOOL

load_dotenv()

MODEL = "claude-sonnet-4-6"


def _get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=api_key)


# ─────────────────────────────────────────────
# Planner
# ─────────────────────────────────────────────

def plan_lesson(user_profile: dict) -> LessonPlan:
    """
    Calls Claude with the planner system prompt and user profile.
    Forces tool use to produce a structured LessonPlan.
    Retries once on invalid schema.
    """
    client = _get_client()
    lesson_id = str(uuid.uuid4())

    user_message = (
        f"Create a lesson plan for this learner:\n"
        f"- Target language: {user_profile.get('target_language')}\n"
        f"- Native language: {user_profile.get('native_language')}\n"
        f"- Current CEFR level: {user_profile.get('current_cefr_level', 'A1')}\n"
        f"- Strengths: {', '.join(user_profile.get('strengths', [])) or 'None identified yet'}\n"
        f"- Weaknesses: {', '.join(user_profile.get('weaknesses', [])) or 'None identified yet'}\n"
        f"Use lesson_id: {lesson_id}"
    )

    for attempt in range(2):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=PLANNER_SYSTEM_PROMPT,
            tools=[LESSON_PLAN_TOOL],
            tool_choice={"type": "tool", "name": "create_lesson_plan"},
            messages=[{"role": "user", "content": user_message}],
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "create_lesson_plan":
                try:
                    return LessonPlan(**block.input)
                except Exception as e:
                    if attempt == 1:
                        raise ValueError(f"Invalid lesson plan schema after retry: {e}")
                    break

    raise ValueError("Claude did not return a valid lesson plan")


# ─────────────────────────────────────────────
# Translator
# ─────────────────────────────────────────────

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translates text from source_lang to target_lang using Claude."""
    client = _get_client()
    lang_names = {
        "spa": "Spanish", "fra": "French", "deu": "German",
        "cmn": "Mandarin Chinese", "jpn": "Japanese", "por": "Portuguese",
        "hin": "Hindi", "eng": "English",
    }
    src = lang_names.get(source_lang, source_lang)
    tgt = lang_names.get(target_lang, target_lang)
    response = client.messages.create(
        model=MODEL, max_tokens=512,
        messages=[{"role": "user", "content":
            f"Translate the following {src} text to {tgt}. Output ONLY the translation, no explanation.\n\n{text}"}]
    )
    return response.content[0].text.strip()


# ─────────────────────────────────────────────
# Tutor (streaming)
# ─────────────────────────────────────────────

async def stream_tutor_response(
    user_profile: dict,
    lesson_plan: dict,
    conversation_history: List[dict],
    user_message: str,
    last_session: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Streams the tutor's response as Server-Sent Events (SSE) text chunks.
    Yields raw text delta strings.
    """
    client = _get_client()

    system_prompt = build_tutor_system_prompt(
        target_language=user_profile.get("target_language", "spa"),
        native_language=user_profile.get("native_language", "eng"),
        cefr_level=user_profile.get("current_cefr_level", "A1"),
        lesson_plan=lesson_plan,
        last_session=last_session,
    )

    messages = conversation_history + [{"role": "user", "content": user_message}]

    with client.messages.stream(
        model=MODEL,
        max_tokens=512,
        system=system_prompt,
        messages=messages,
    ) as stream:
        for text_chunk in stream.text_stream:
            yield text_chunk


# ─────────────────────────────────────────────
# Evaluator
# ─────────────────────────────────────────────

def evaluate_session(session_id: str, transcript: dict, lesson_plan: dict) -> Evaluation:
    """
    Evaluates a completed session using the full transcript and lesson plan.
    Forces tool use to produce a structured Evaluation.
    """
    client = _get_client()

    # Format transcript for Claude
    messages_text = "\n".join(
        f"[{msg['speaker'].upper()}]: {msg['text']}"
        for msg in transcript.get("messages", [])
    )

    objectives_text = "\n".join(
        f"- {obj}" for obj in lesson_plan.get("objectives", [])
    )

    user_message = (
        f"Please evaluate this language learning session.\n\n"
        f"Session ID: {session_id}\n\n"
        f"Lesson objectives:\n{objectives_text}\n\n"
        f"Full transcript:\n{messages_text}"
    )

    for attempt in range(2):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=EVALUATOR_SYSTEM_PROMPT,
            tools=[EVALUATION_TOOL],
            tool_choice={"type": "tool", "name": "submit_evaluation"},
            messages=[{"role": "user", "content": user_message}],
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "submit_evaluation":
                try:
                    data = {**block.input, "session_id": session_id}
                    return Evaluation(**data)
                except Exception as e:
                    if attempt == 1:
                        raise ValueError(f"Invalid evaluation schema after retry: {e}")
                    break

    raise ValueError("Claude did not return a valid evaluation")
