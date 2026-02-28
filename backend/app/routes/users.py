import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.models import UserProfile, UserProfileCreate
from app.services import db_service

router = APIRouter(prefix="/user", tags=["users"])


@router.post("/profile", response_model=UserProfile)
async def create_user_profile(body: UserProfileCreate):
    user_id = str(uuid.uuid4())
    profile = UserProfile(
        user_id=user_id,
        name=body.name,
        target_language=body.target_language,
        native_language=body.native_language,
        current_cefr_level=body.current_cefr_level,
        last_updated=datetime.utcnow(),
    )
    await db_service.create_user(profile.model_dump())
    return profile


@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    doc = await db_service.get_user(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**doc)
