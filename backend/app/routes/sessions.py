import uuid
import asyncio
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.models import Transcript, Message, SessionSummary
from app.services import db_service, gemini_service as claude_service

router = APIRouter(prefix="/session", tags=["sessions"])


class StartSessionRequest(BaseModel):
    user_id: str


class MessageRequest(BaseModel):
    session_id: str
    user_id: str
    text: str


class EndSessionRequest(BaseModel):
    session_id: str
    user_id: str


def _get_active_lang_progress(user: dict) -> Optional[dict]:
    """Return the LanguageProgress dict for the active language, or None."""
    active = user.get("active_language")
    for lang in user.get("languages", []):
        if lang.get("language") == active:
            return lang
    return None


# ─────────────────────────────────────────────
# POST /session/start
# ─────────────────────────────────────────────

@router.post("/start")
async def start_session(body: StartSessionRequest):
    user = await db_service.get_user(body.user_id)
    if not user:
        raise HTTPException(404, "User not found")

    # Build a user_for_session dict that exposes target_language for the LLM services
    active_lang = user.get("active_language")
    lang_progress = _get_active_lang_progress(user)

    user_for_session = {
        **user,
        "target_language": active_lang,
        "current_cefr_level": (lang_progress or {}).get("current_cefr_level", "A1"),
        "strengths": (lang_progress or {}).get("strengths", []),
        "weaknesses": (lang_progress or {}).get("weaknesses", []),
    }

    # Generate lesson plan via Claude Planner
    lesson_plan = claude_service.plan_lesson(user_for_session)
    lesson_dict = lesson_plan.model_dump()
    await db_service.save_lesson_plan(lesson_dict)

    # Create session document
    session_id = str(uuid.uuid4())
    transcript = Transcript(
        session_id=session_id,
        lesson_id=lesson_plan.lesson_id,
        user_id=body.user_id,
        started_at=datetime.utcnow(),
    )
    await db_service.create_session(transcript.model_dump())

    # Build context from last session (active language only)
    last_session_ctx = None
    lang_history = (lang_progress or {}).get("history", [])
    if lang_history:
        last = lang_history[-1]
        last_eval = await db_service.get_evaluation(last["session_id"])
        last_session_ctx = {
            "title": last.get("lesson_title") or "previous lesson",
            "recommendation": (last_eval or {}).get("next_recommendation", ""),
        }

    opening_prompt = (
        "[Session started. Greet the student warmly, briefly recap last session "
        "and introduce today's focus, then begin the first activity.]"
        if last_session_ctx else
        "[Session started. Greet the student and introduce today's lesson.]"
    )

    # Get tutor's opening message
    full_text = ""
    async for chunk in claude_service.stream_tutor_response(
        user_profile=user_for_session,
        lesson_plan=lesson_dict,
        conversation_history=[],
        user_message=opening_prompt,
        last_session=last_session_ctx,
    ):
        full_text += chunk

    opening_msg = Message(speaker="tutor", text=full_text)
    await db_service.append_message(session_id, opening_msg.model_dump())

    translation = await asyncio.to_thread(
        claude_service.translate_text, full_text, active_lang, user["native_language"]
    )

    return {
        "session_id": session_id,
        "lesson_id": lesson_plan.lesson_id,
        "lesson_title": lesson_plan.title,
        "objectives": lesson_plan.objectives,
        "tutor_message": full_text,
        "tutor_translation": translation,
    }


# ─────────────────────────────────────────────
# POST /session/message  (streaming)
# ─────────────────────────────────────────────

@router.post("/message")
async def send_message(body: MessageRequest):
    user = await db_service.get_user(body.user_id)
    if not user:
        raise HTTPException(404, "User not found")

    session = await db_service.get_session(body.session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    lesson_plan = await db_service.get_lesson_plan(session["lesson_id"])
    if not lesson_plan:
        raise HTTPException(404, "Lesson plan not found")

    active_lang = user.get("active_language")
    lang_progress = _get_active_lang_progress(user)
    user_for_session = {
        **user,
        "target_language": active_lang,
        "current_cefr_level": (lang_progress or {}).get("current_cefr_level", "A1"),
        "strengths": (lang_progress or {}).get("strengths", []),
        "weaknesses": (lang_progress or {}).get("weaknesses", []),
    }

    # Append user message
    user_msg = Message(speaker="user", text=body.text)
    await db_service.append_message(body.session_id, user_msg.model_dump())

    # Build conversation history
    history = []
    for msg in session.get("messages", []):
        role = "user" if msg["speaker"] == "user" else "assistant"
        history.append({"role": role, "content": msg["text"]})

    collected = []

    async def generate():
        async for chunk in claude_service.stream_tutor_response(
            user_profile=user_for_session,
            lesson_plan=lesson_plan,
            conversation_history=history,
            user_message=body.text,
        ):
            collected.append(chunk)
            yield f"data: {json.dumps(chunk)}\n\n"

        full_response = "".join(collected)
        tutor_msg = Message(speaker="tutor", text=full_response)
        await db_service.append_message(body.session_id, tutor_msg.model_dump())
        translation = await asyncio.to_thread(
            claude_service.translate_text, full_response, active_lang, user["native_language"]
        )
        yield f"data: [TRANSLATION]:{json.dumps(translation)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ─────────────────────────────────────────────
# POST /session/end
# ─────────────────────────────────────────────

@router.post("/end")
async def end_session(body: EndSessionRequest):
    session = await db_service.get_session(body.session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    lesson_plan = await db_service.get_lesson_plan(session["lesson_id"])
    if not lesson_plan:
        raise HTTPException(404, "Lesson plan not found")

    await db_service.end_session(body.session_id)

    user = await db_service.get_user(body.user_id)
    active_lang = (user or {}).get("active_language", "spa")
    lang_progress = _get_active_lang_progress(user or {})

    try:
        evaluation = claude_service.evaluate_session(
            session_id=body.session_id,
            transcript=session,
            lesson_plan=lesson_plan,
        )
        eval_dict = evaluation.model_dump()
        await db_service.save_evaluation(eval_dict)

        new_cefr = (
            evaluation.cefr_estimate
            if evaluation.confidence_score >= 0.4
            else (lang_progress or {}).get("current_cefr_level", "A1")
        )
        existing_weaknesses = (lang_progress or {}).get("weaknesses", [])
        existing_strengths = (lang_progress or {}).get("strengths", [])
        existing_prefs = (lang_progress or {}).get("preferred_topics", [])
        new_weaknesses = list(dict.fromkeys(evaluation.weaknesses + existing_weaknesses))[:10]
        new_strengths = list(dict.fromkeys(evaluation.achieved_objectives + existing_strengths))[:10]
        new_prefs = list(dict.fromkeys(
            (getattr(evaluation, "learning_interest_signals", None) or []) + existing_prefs
        ))[:15]
    except Exception:
        evaluation = None
        eval_dict = {}
        new_cefr = (lang_progress or {}).get("current_cefr_level", "A1")
        new_weaknesses = (lang_progress or {}).get("weaknesses", [])
        new_strengths = (lang_progress or {}).get("strengths", [])
        new_prefs = (lang_progress or {}).get("preferred_topics", [])

    if user:
        await db_service.update_user_language_progress(body.user_id, active_lang, {
            "current_cefr_level": new_cefr,
            "weaknesses": new_weaknesses,
            "strengths": new_strengths,
            "preferred_topics": new_prefs,
        })

        summary = SessionSummary(
            session_id=body.session_id,
            date=datetime.utcnow(),
            cefr_estimate=new_cefr,
            lesson_title=lesson_plan.get("title"),
            language=active_lang,
        )
        await db_service.append_to_language_history(body.user_id, active_lang, summary.model_dump())

    return eval_dict or {"session_id": body.session_id, "cefr_estimate": new_cefr}


# ─────────────────────────────────────────────
# GET /session/history/{user_id}
# ─────────────────────────────────────────────

@router.get("/history/{user_id}")
async def get_session_history(user_id: str, language: Optional[str] = Query(default=None)):
    user = await db_service.get_user(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    languages = user.get("languages", [])

    if language:
        # Return history for a specific language
        for lang in languages:
            if lang.get("language") == language:
                return lang.get("history", [])
        return []

    # Return all history combined, each entry tagged with language
    combined = []
    for lang in languages:
        lang_code = lang.get("language")
        for entry in lang.get("history", []):
            combined.append({**entry, "language": lang_code})
    # Sort by date descending
    combined.sort(key=lambda x: x.get("date", ""), reverse=True)
    return combined
