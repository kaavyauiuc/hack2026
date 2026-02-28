"""
HTTP client for Modal MMS STT and TTS endpoints.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

TIMEOUT = 60.0  # Modal cold starts can be slow


async def transcribe_audio(audio_bytes: bytes, language: str) -> str:
    """
    Sends audio bytes to Modal MMS STT endpoint.
    Returns transcript string.
    """
    url = os.getenv("MODAL_STT_URL")
    if not url:
        raise RuntimeError("MODAL_STT_URL environment variable is not set")

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            url,
            files={"audio": ("audio.wav", audio_bytes, "audio/wav")},
            data={"language": language},
        )
        response.raise_for_status()
        return response.json()["transcript"]


async def synthesize_speech(text: str, language: str) -> bytes:
    """
    Sends text to Modal MMS TTS endpoint.
    Returns WAV audio bytes.
    """
    url = os.getenv("MODAL_TTS_URL")
    if not url:
        raise RuntimeError("MODAL_TTS_URL environment variable is not set")

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            url,
            json={"text": text, "language": language},
        )
        response.raise_for_status()
        return response.content
