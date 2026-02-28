import io
import subprocess
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from app.services import speech_service

router = APIRouter(prefix="/speech", tags=["speech"])

SUPPORTED_LANGUAGES = {"spa", "fra", "deu", "cmn", "jpn", "por", "eng"}


def _normalize_to_wav_16k(audio_bytes: bytes) -> bytes:
    """Convert any browser audio (webm, opus, mp4, wav) to 16kHz mono WAV via ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".input", delete=False) as tmp_in:
        tmp_in.write(audio_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path + ".wav"
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", tmp_in_path,
                "-ar", "16000",
                "-ac", "1",
                "-f", "wav",
                tmp_out_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode())
        with open(tmp_out_path, "rb") as f:
            return f.read()
    finally:
        os.unlink(tmp_in_path)
        if os.path.exists(tmp_out_path):
            os.unlink(tmp_out_path)


@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: str = Form("spa"),
):
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {language}")

    raw_bytes = await audio.read()
    try:
        wav_bytes = _normalize_to_wav_16k(raw_bytes)
    except Exception as e:
        raise HTTPException(400, f"Audio conversion failed: {e}")

    transcript = await speech_service.transcribe_audio(wav_bytes, language)
    return {"transcript": transcript}


@router.post("/tts")
async def text_to_speech(body: dict):
    text = body.get("text", "").strip()
    language = body.get("language", "spa")

    if not text:
        raise HTTPException(400, "text is required")
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {language}")

    audio_bytes = await speech_service.synthesize_speech(text, language)
    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=speech.wav"},
    )
