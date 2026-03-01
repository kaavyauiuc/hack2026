from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.services import video_service

router = APIRouter(prefix="/video", tags=["video"])


@router.post("/animate")
async def animate_avatar(audio: UploadFile = File(...)):
    """
    Accepts a WAV audio file (the tutor's TTS output).
    Returns MP4 video bytes of the avatar lip-synced to that audio.
    Backend selected by VIDEO_BACKEND env var ("modal" or "local").
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "audio file is empty")

    try:
        mp4_bytes = await video_service.animate(audio_bytes)
    except Exception as e:
        raise HTTPException(500, str(e))

    return Response(
        content=mp4_bytes,
        media_type="video/mp4",
        headers={"Content-Disposition": "inline; filename=avatar.mp4"},
    )
