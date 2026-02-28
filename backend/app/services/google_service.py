"""
Google Cloud Speech-to-Text and Text-to-Speech via REST API with API key auth.
No extra packages required — uses httpx (already in requirements).

Required env var:
  GOOGLE_API_KEY — a Google Cloud API key with Speech-to-Text and
                   Text-to-Speech APIs enabled.
"""

import base64
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

_STT_URL = "https://speech.googleapis.com/v1/speech:recognize"
_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
_TIMEOUT = 30.0

# Map MMS 3-letter codes → BCP-47 language codes expected by Google APIs
_LANG_MAP: dict[str, str] = {
    "spa": "es-ES",
    "fra": "fr-FR",
    "deu": "de-DE",
    "cmn": "zh-CN",
    "jpn": "ja-JP",
    "por": "pt-BR",
    "hin": "hi-IN",
    "eng": "en-US",
}


def _api_key() -> str:
    key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GOOGLE_API_KEY environment variable is not set")
    return key


async def transcribe_audio(wav_bytes: bytes, language: str) -> str:
    """
    Send 16 kHz mono LINEAR16 WAV bytes to Google STT.
    Returns the top transcript string, or "" if nothing was recognized.
    """
    lang_code = _LANG_MAP.get(language, "en-US")
    audio_b64 = base64.b64encode(wav_bytes).decode()

    payload = {
        "config": {
            "encoding": "LINEAR16",
            "sampleRateHertz": 16000,
            "languageCode": lang_code,
        },
        "audio": {"content": audio_b64},
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(_STT_URL, params={"key": _api_key()}, json=payload)
        resp.raise_for_status()

    results = resp.json().get("results", [])
    if not results:
        return ""
    return results[0]["alternatives"][0]["transcript"]


async def synthesize_speech(text: str, language: str) -> bytes:
    """
    Send text to Google TTS and return MP3 bytes.
    """
    lang_code = _LANG_MAP.get(language, "en-US")

    payload = {
        "input": {"text": text},
        "voice": {
            "languageCode": lang_code,
            "ssmlGender": "NEUTRAL",
        },
        "audioConfig": {"audioEncoding": "MP3"},
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(_TTS_URL, params={"key": _api_key()}, json=payload)
        resp.raise_for_status()

    audio_b64 = resp.json()["audioContent"]
    return base64.b64decode(audio_b64)
