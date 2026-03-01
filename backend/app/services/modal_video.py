"""
Modal SadTalker video backend.
POSTs WAV bytes to the Modal SadTalkerService.animate web endpoint
and returns MP4 bytes.
"""

import os

import httpx


async def animate(audio_bytes: bytes) -> bytes:
    """POST WAV bytes to Modal SadTalker endpoint; return MP4 bytes."""
    url = os.getenv("MODAL_VIDEO_URL")
    if not url:
        raise RuntimeError(
            "MODAL_VIDEO_URL is not set — deploy SadTalkerService on Modal "
            "and set the env var to its /animate endpoint URL"
        )

    async with httpx.AsyncClient(timeout=240) as client:
        resp = await client.post(
            url,
            files={"audio": ("audio.wav", audio_bytes, "audio/wav")},
        )
    resp.raise_for_status()
    return resp.content
