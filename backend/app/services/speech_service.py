"""
Thin dispatch layer for speech services.
Reads SPEECH_BACKEND env var (default: "local") and delegates to the
appropriate implementation:
  "local"  →  local_speech.py  (in-process MMS, CPU, dev mode)
  "modal"  →  modal_service.py (HTTP to Modal GPU endpoints, prod mode)
"""

import os
from dotenv import load_dotenv

load_dotenv()

_BACKEND = os.getenv("SPEECH_BACKEND", "local").strip().lower()

if _BACKEND == "modal":
    from app.services.modal_service import transcribe_audio, synthesize_speech
else:
    from app.services.local_speech import transcribe_audio, synthesize_speech

__all__ = ["transcribe_audio", "synthesize_speech"]
