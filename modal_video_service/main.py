"""
Modal SadTalker video service.
Accepts WAV audio, returns a talking-head MP4 using SadTalker.

Deploy:
    modal deploy main.py

Then set in backend/.env:
    VIDEO_BACKEND=modal
    MODAL_VIDEO_URL=<printed animate endpoint URL>
"""

import tempfile
from pathlib import Path

import modal
from fastapi import File, UploadFile
from fastapi.responses import JSONResponse, Response

app = modal.App("sadtalker-video-service")

# ---------------------------------------------------------------------------
# Persistent volume — checkpoints download once, survive container restarts
# ---------------------------------------------------------------------------
volume = modal.Volume.from_name("sadtalker-checkpoints", create_if_missing=True)
VOLUME_PATH = "/checkpoints"
SADTALKER_PATH = "/sadtalker"

# ---------------------------------------------------------------------------
# Container image
# Clones SadTalker and installs all deps at image-build time (cached layer).
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "git",
        "ffmpeg",
        "libsm6",
        "libxext6",
        "libgl1-mesa-glx",
        "libglib2.0-0",
        "wget",
        "unzip",
    )
    .pip_install(
        "torch==2.0.1",
        "torchvision==0.15.2",
        "torchaudio==2.0.2",
        index_url="https://download.pytorch.org/whl/cu118",
    )
    .run_commands(
        # Clone SadTalker
        f"git clone https://github.com/OpenTalker/SadTalker {SADTALKER_PATH}",
        # Install SadTalker's own requirements
        f"cd {SADTALKER_PATH} && pip install -r requirements.txt",
        # GFPGAN enhancer (face restoration)
        "pip install gfpgan",
        # huggingface_hub for reliable checkpoint downloads
        "pip install huggingface_hub",
    )
)


# ---------------------------------------------------------------------------
# SadTalker service class
# ---------------------------------------------------------------------------
@app.cls(
    gpu="a10g",
    image=image,
    volumes={VOLUME_PATH: volume},
    timeout=120,
    keep_warm=1,
)
class SadTalkerService:

    @modal.enter()
    def setup(self):
        """
        Download SadTalker + GFPGAN checkpoints into the persistent Volume on
        first boot, then symlink them where SadTalker expects to find them.
        Subsequent boots skip the download (files already in volume).
        """
        import os
        import subprocess

        ckpt_vol = Path(VOLUME_PATH) / "checkpoints"
        gfpgan_vol = Path(VOLUME_PATH) / "gfpgan" / "weights"

        # --- SadTalker checkpoints ---
        sentinel = ckpt_vol / "SadTalker_V0.0.2_256.safetensors"
        if not sentinel.exists():
            print("Downloading SadTalker checkpoints from HuggingFace …")
            ckpt_vol.mkdir(parents=True, exist_ok=True)
            from huggingface_hub import snapshot_download

            snapshot_download(
                repo_id="vinthony/SadTalker",
                local_dir=str(ckpt_vol),
                ignore_patterns=["*.git*", "README*"],
            )
            volume.commit()

        # Symlink so SadTalker's code finds them at its expected path
        sadtalker_ckpt = Path(SADTALKER_PATH) / "checkpoints"
        if not sadtalker_ckpt.exists():
            sadtalker_ckpt.symlink_to(ckpt_vol)

        # --- GFPGAN weights ---
        gfpgan_sentinel = gfpgan_vol / "GFPGANv1.4.pth"
        if not gfpgan_sentinel.exists():
            print("Downloading GFPGAN weights …")
            gfpgan_vol.mkdir(parents=True, exist_ok=True)
            subprocess.run(
                [
                    "wget",
                    "-q",
                    "-O",
                    str(gfpgan_vol / "GFPGANv1.4.pth"),
                    "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth",
                ],
                check=True,
            )
            volume.commit()

        # Symlink GFPGAN weights into SadTalker's expected path
        sadtalker_gfpgan = Path(SADTALKER_PATH) / "gfpgan" / "weights"
        sadtalker_gfpgan.parent.mkdir(parents=True, exist_ok=True)
        if not sadtalker_gfpgan.exists():
            sadtalker_gfpgan.symlink_to(gfpgan_vol)

        print("SadTalker setup complete.")

    @modal.web_endpoint(method="POST")
    async def animate(self, audio: UploadFile = File(...)):
        """
        POST multipart/form-data
          audio: WAV file bytes

        Returns: MP4 bytes (video/mp4)
        """
        import subprocess

        audio_bytes = await audio.read()

        avatar_path = Path(SADTALKER_PATH) / "examples" / "source_image" / "art_0.png"
        if not avatar_path.exists():
            return JSONResponse(
                {"error": f"Avatar image not found at {avatar_path}"},
                status_code=500,
            )

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            audio_file = tmp / "input.wav"
            audio_file.write_bytes(audio_bytes)

            result_dir = tmp / "results"
            result_dir.mkdir()

            cmd = [
                "python",
                str(Path(SADTALKER_PATH) / "inference.py"),
                "--driven_audio", str(audio_file),
                "--source_image", str(avatar_path),
                "--result_dir", str(result_dir),
                "--still",
                "--preprocess", "crop",
            ]

            proc = subprocess.run(
                cmd,
                cwd=SADTALKER_PATH,
                capture_output=True,
                text=True,
                timeout=240,
            )

            if proc.returncode != 0:
                return JSONResponse(
                    {"error": f"SadTalker failed: {proc.stderr[-800:]}"},
                    status_code=500,
                )

            mp4_files = sorted(result_dir.glob("*.mp4"))
            if not mp4_files:
                return JSONResponse(
                    {"error": "SadTalker produced no output MP4"},
                    status_code=500,
                )

            mp4_bytes = mp4_files[-1].read_bytes()

        return Response(
            content=mp4_bytes,
            media_type="video/mp4",
            headers={"Content-Disposition": "attachment; filename=animation.mp4"},
        )
