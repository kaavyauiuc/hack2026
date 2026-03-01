import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models import UserProfile, UserProfileCreate, LanguageProgress
from app.services import db_service

router = APIRouter(prefix="/user", tags=["users"])


# ─────────────────────────────────────────────
# POST /user/profile  — create a new user
# ─────────────────────────────────────────────

@router.post("/profile", response_model=UserProfile)
async def create_user_profile(body: UserProfileCreate):
    user_id = str(uuid.uuid4())
    initial_progress = LanguageProgress(
        language=body.target_language,
        current_cefr_level=body.current_cefr_level,
    )
    profile = UserProfile(
        user_id=user_id,
        name=body.name,
        native_language=body.native_language,
        active_language=body.target_language,
        languages=[initial_progress],
        last_updated=datetime.utcnow(),
    )
    await db_service.create_user(profile.model_dump())
    return profile


# ─────────────────────────────────────────────
# GET /user/profile/{user_id}
# ─────────────────────────────────────────────

@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    doc = await db_service.get_user(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**doc)


# ─────────────────────────────────────────────
# PATCH /user/profile/{user_id}  — edit name, native_language, active_language
# ─────────────────────────────────────────────

class PatchProfileBody(BaseModel):
    name: Optional[str] = None
    native_language: Optional[str] = None
    active_language: Optional[str] = None


@router.patch("/profile/{user_id}", response_model=UserProfile)
async def patch_user_profile(user_id: str, body: PatchProfileBody):
    doc = await db_service.get_user(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    # Validate active_language exists in user's languages list
    if "active_language" in updates:
        enrolled = [l["language"] for l in doc.get("languages", [])]
        if updates["active_language"] not in enrolled:
            raise HTTPException(status_code=400, detail="Language not enrolled")

    if updates:
        await db_service.update_user_info(user_id, updates)

    refreshed = await db_service.get_user(user_id)
    return UserProfile(**refreshed)


# ─────────────────────────────────────────────
# POST /user/language/{user_id}  — enrol a new language
# ─────────────────────────────────────────────

class AddLanguageBody(BaseModel):
    language: str
    current_cefr_level: str = "A1"


@router.post("/language/{user_id}", response_model=UserProfile)
async def add_language(user_id: str, body: AddLanguageBody):
    doc = await db_service.get_user(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    enrolled = [l["language"] for l in doc.get("languages", [])]
    if body.language in enrolled:
        raise HTTPException(status_code=409, detail="Language already enrolled")

    progress = LanguageProgress(
        language=body.language,
        current_cefr_level=body.current_cefr_level,
    )
    await db_service.add_language(user_id, progress.model_dump())

    refreshed = await db_service.get_user(user_id)
    return UserProfile(**refreshed)


# ─────────────────────────────────────────────
# DELETE /user/language/{user_id}/{language}
# ─────────────────────────────────────────────

@router.delete("/language/{user_id}/{language}", response_model=UserProfile)
async def remove_language(user_id: str, language: str):
    doc = await db_service.get_user(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    enrolled = [l["language"] for l in doc.get("languages", [])]
    if language not in enrolled:
        raise HTTPException(status_code=404, detail="Language not enrolled")

    if len(enrolled) <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last enrolled language")

    await db_service.remove_language(user_id, language)

    # If removed language was active, switch to first remaining
    if doc.get("active_language") == language:
        remaining = [l for l in enrolled if l != language]
        await db_service.update_user_info(user_id, {"active_language": remaining[0]})

    refreshed = await db_service.get_user(user_id)
    return UserProfile(**refreshed)
