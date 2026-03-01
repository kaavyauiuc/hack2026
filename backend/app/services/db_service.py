"""
MongoDB operations using Motor (async driver).
All functions accept/return plain dicts or Pydantic models.
"""

import os
from datetime import datetime
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

_client: Optional[AsyncIOMotorClient] = None


def get_db():
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise RuntimeError("MONGODB_URI environment variable is not set")
        _client = AsyncIOMotorClient(uri)
    return _client["language_learning"]


# ─────────────────────────────────────────────
# User operations
# ─────────────────────────────────────────────

async def create_user(user_dict: dict) -> str:
    db = get_db()
    await db.users.insert_one({**user_dict})
    return user_dict["user_id"]


async def get_user(user_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return doc


async def update_user(user_id: str, updates: dict) -> bool:
    """Generic top-level field updater (kept for backwards compatibility)."""
    db = get_db()
    updates["last_updated"] = datetime.utcnow()
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": updates},
    )
    return result.modified_count > 0


async def update_user_info(user_id: str, updates: dict) -> bool:
    """Update top-level scalar fields (name, native_language, active_language)."""
    db = get_db()
    updates["last_updated"] = datetime.utcnow()
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": updates},
    )
    return result.modified_count > 0


async def set_active_language(user_id: str, language: str) -> bool:
    db = get_db()
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"active_language": language, "last_updated": datetime.utcnow()}},
    )
    return result.modified_count > 0


async def add_language(user_id: str, progress_dict: dict) -> bool:
    """Push a new LanguageProgress subdocument onto languages array."""
    db = get_db()
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$push": {"languages": progress_dict},
            "$set": {"last_updated": datetime.utcnow()},
        },
    )
    return result.modified_count > 0


async def remove_language(user_id: str, language: str) -> bool:
    """Pull the LanguageProgress entry for the given language code."""
    db = get_db()
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$pull": {"languages": {"language": language}},
            "$set": {"last_updated": datetime.utcnow()},
        },
    )
    return result.modified_count > 0


async def update_user_language_progress(user_id: str, language: str, updates: dict) -> bool:
    """
    $set fields inside languages.$[lang] using arrayFilters.
    `updates` keys should be the sub-field names without the languages path prefix,
    e.g. {"current_cefr_level": "B1", "strengths": [...], "weaknesses": [...]}.
    """
    db = get_db()
    set_payload = {f"languages.$[lang].{k}": v for k, v in updates.items()}
    set_payload["last_updated"] = datetime.utcnow()
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": set_payload},
        array_filters=[{"lang.language": language}],
    )
    return result.modified_count > 0


async def append_to_language_history(user_id: str, language: str, summary: dict) -> bool:
    """Push a SessionSummary dict into the matching language's history array."""
    db = get_db()
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$push": {"languages.$[lang].history": summary},
            "$set": {"last_updated": datetime.utcnow()},
        },
        array_filters=[{"lang.language": language}],
    )
    return result.modified_count > 0


async def append_session_to_history(user_id: str, summary: dict) -> bool:
    """Legacy flat-history push — kept for compatibility but no longer used."""
    db = get_db()
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$push": {"history": summary},
            "$set": {"last_updated": datetime.utcnow()},
        },
    )
    return result.modified_count > 0


# ─────────────────────────────────────────────
# Lesson plan operations
# ─────────────────────────────────────────────

async def save_lesson_plan(lesson_dict: dict) -> str:
    db = get_db()
    await db.lesson_plans.insert_one({**lesson_dict})
    return lesson_dict["lesson_id"]


async def get_lesson_plan(lesson_id: str) -> Optional[dict]:
    db = get_db()
    return await db.lesson_plans.find_one({"lesson_id": lesson_id}, {"_id": 0})


# ─────────────────────────────────────────────
# Session / transcript operations
# ─────────────────────────────────────────────

async def create_session(transcript_dict: dict) -> str:
    db = get_db()
    await db.sessions.insert_one({**transcript_dict})
    return transcript_dict["session_id"]


async def get_session(session_id: str) -> Optional[dict]:
    db = get_db()
    return await db.sessions.find_one({"session_id": session_id}, {"_id": 0})


async def append_message(session_id: str, message_dict: dict) -> bool:
    db = get_db()
    result = await db.sessions.update_one(
        {"session_id": session_id},
        {"$push": {"messages": message_dict}},
    )
    return result.modified_count > 0


async def end_session(session_id: str) -> bool:
    db = get_db()
    result = await db.sessions.update_one(
        {"session_id": session_id},
        {"$set": {"ended_at": datetime.utcnow()}},
    )
    return result.modified_count > 0


async def get_user_sessions(user_id: str) -> List[dict]:
    db = get_db()
    cursor = db.sessions.find({"user_id": user_id}, {"_id": 0}).sort("started_at", -1)
    return await cursor.to_list(length=100)


# ─────────────────────────────────────────────
# Evaluation operations
# ─────────────────────────────────────────────

async def save_evaluation(evaluation_dict: dict) -> str:
    db = get_db()
    await db.evaluations.insert_one({**evaluation_dict})
    return evaluation_dict["session_id"]


async def get_evaluation(session_id: str) -> Optional[dict]:
    db = get_db()
    return await db.evaluations.find_one({"session_id": session_id}, {"_id": 0})
