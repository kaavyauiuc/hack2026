"""
Thin dispatch layer for video animation (talking-head lip-sync).
Reads VIDEO_BACKEND env var (default: "local") and delegates to:
  "local"  →  local_video.py   (subprocess SadTalker, dev mode)
  "modal"  →  modal_video.py   (HTTP to Modal GPU endpoint)
"""

import os
from dotenv import load_dotenv

load_dotenv()

_BACKEND = os.getenv("VIDEO_BACKEND", "local").strip().lower()

if _BACKEND == "modal":
    from app.services.modal_video import animate
else:
    from app.services.local_video import animate

__all__ = ["animate"]
