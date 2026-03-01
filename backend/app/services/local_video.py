"""
Local SadTalker video backend.
Runs inference via subprocess against a locally-cloned SadTalker repo.

Requirements:
  - SadTalker cloned and deps installed at SADTALKER_PATH (default: ./SadTalker)
  - Python environment at SADTALKER_PATH has SadTalker's requirements installed

Both functions are async-safe: the subprocess runs in a ThreadPoolExecutor
so FastAPI's event loop is never blocked.
"""

import asyncio
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

_executor = ThreadPoolExecutor(max_workers=1)


def _run_sadtalker(audio_bytes: bytes) -> bytes:
    sadtalker_dir = os.getenv("SADTALKER_PATH", "./SadTalker")
    sadtalker_path = Path(sadtalker_dir).resolve()

    if not sadtalker_path.exists():
        raise RuntimeError(
            f"SadTalker not found at {sadtalker_path} — clone it and set "
            "SADTALKER_PATH, or use VIDEO_BACKEND=modal"
        )

    avatar_path = sadtalker_path / "examples" / "source_image" / "art_0.png"
    if not avatar_path.exists():
        raise RuntimeError(
            f"Avatar image not found at {avatar_path} — "
            "check your SadTalker clone is complete"
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        audio_file = tmp / "input.wav"
        audio_file.write_bytes(audio_bytes)

        result_dir = tmp / "results"
        result_dir.mkdir()

        cmd = [
            "python",
            str(sadtalker_path / "inference.py"),
            "--driven_audio", str(audio_file),
            "--source_image", str(avatar_path),
            "--result_dir", str(result_dir),
            "--still",
            "--preprocess", "full",
            "--enhancer", "gfpgan",
        ]

        proc = subprocess.run(
            cmd,
            cwd=str(sadtalker_path),
            capture_output=True,
            text=True,
            timeout=300,
        )

        if proc.returncode != 0:
            raise RuntimeError(
                f"SadTalker inference failed (exit {proc.returncode}):\n"
                f"{proc.stderr[-1000:]}"
            )

        # SadTalker writes <name>_enhanced.mp4 or <name>.mp4 into result_dir
        mp4_files = sorted(result_dir.glob("*.mp4"))
        if not mp4_files:
            raise RuntimeError(
                "SadTalker ran successfully but produced no MP4 output. "
                f"stdout: {proc.stdout[-500:]}"
            )

        return mp4_files[-1].read_bytes()


async def animate(audio_bytes: bytes) -> bytes:
    """Run SadTalker locally in a thread pool; return MP4 bytes."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_sadtalker, audio_bytes)
