import uuid
import asyncio
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.models import Transcript, Message, SessionSummary
from app.services import db_service, claude_service

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


# ─────────────────────────────────────────────
# POST /session/start
# ─────────────────────────────────────────────

@router.post("/start")
async def start_session(body: StartSessionRequest):
    user = await db_service.get_user(body.user_id)
    if not user:
        raise HTTPException(404, "User not found")

    # Generate lesson plan via Claude Planner
    lesson_plan = claude_service.plan_lesson(user)
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

    # Build context from last session for the opening message
    last_session_ctx = None
    history = user.get("history", [])
    if history:
        last = history[-1]
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

    # Get tutor's opening message (non-streaming, just first message)
    full_text = ""
    async for chunk in claude_service.stream_tutor_response(
        user_profile=user,
        lesson_plan=lesson_dict,
        conversation_history=[],
        user_message=opening_prompt,
        last_session=last_session_ctx,
    ):
        full_text += chunk

    # Store tutor's opening message
    opening_msg = Message(speaker="tutor", text=full_text)
    await db_service.append_message(session_id, opening_msg.model_dump())

    translation = await asyncio.to_thread(claude_service.translate_text, full_text, user["target_language"], user["native_language"])

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

    # Append user message
    user_msg = Message(speaker="user", text=body.text)
    await db_service.append_message(body.session_id, user_msg.model_dump())

    # Build conversation history for Claude (alternating user/assistant)
    history = []
    for msg in session.get("messages", []):
        role = "user" if msg["speaker"] == "user" else "assistant"
        history.append({"role": role, "content": msg["text"]})

    # Collect full tutor response to store it, while streaming to client
    collected = []

    async def generate():
        async for chunk in claude_service.stream_tutor_response(
            user_profile=user,
            lesson_plan=lesson_plan,
            conversation_history=history,
            user_message=body.text,
        ):
            collected.append(chunk)
            yield f"data: {json.dumps(chunk)}\n\n"

        # After stream ends, persist tutor message
        full_response = "".join(collected)
        tutor_msg = Message(speaker="tutor", text=full_response)
        await db_service.append_message(body.session_id, tutor_msg.model_dump())
        translation = await asyncio.to_thread(claude_service.translate_text, full_response, user["target_language"], user["native_language"])
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

    # Mark session as ended
    await db_service.end_session(body.session_id)

    # Evaluate via Gemini Evaluator (defensive: keep existing profile on failure)
    user = await db_service.get_user(body.user_id)
    try:
        evaluation = claude_service.evaluate_session(
            session_id=body.session_id,
            transcript=session,
            lesson_plan=lesson_plan,
        )
        eval_dict = evaluation.model_dump()
        await db_service.save_evaluation(eval_dict)
        # Only promote the new CEFR level if model is confident enough
        new_cefr = (
            evaluation.cefr_estimate
            if evaluation.confidence_score >= 0.4
            else (user or {}).get("current_cefr_level", "A1")
        )
        new_weaknesses = list(dict.fromkeys(evaluation.weaknesses + (user or {}).get("weaknesses", [])))[:10]
        new_strengths = list(dict.fromkeys(evaluation.achieved_objectives + (user or {}).get("strengths", [])))[:10]
    except Exception:
        evaluation = None
        eval_dict = {}
        new_cefr = (user or {}).get("current_cefr_level", "A1")
        new_weaknesses = (user or {}).get("weaknesses", [])
        new_strengths = (user or {}).get("strengths", [])

    if user:
        await db_service.update_user(body.user_id, {
            "current_cefr_level": new_cefr,
            "weaknesses": new_weaknesses,
            "strengths": new_strengths,
        })

        # Append session to history — include lesson title so planner can avoid repeats
        summary = SessionSummary(
            session_id=body.session_id,
            date=datetime.utcnow(),
            cefr_estimate=new_cefr,
            lesson_title=lesson_plan.get("title"),
        )
        await db_service.append_session_to_history(body.user_id, summary.model_dump())

    return eval_dict or {"session_id": body.session_id, "cefr_estimate": new_cefr}


# ─────────────────────────────────────────────
# GET /session/history/{user_id}
# ─────────────────────────────────────────────

@router.get("/history/{user_id}")
async def get_session_history(user_id: str):
    user = await db_service.get_user(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user.get("history", [])
