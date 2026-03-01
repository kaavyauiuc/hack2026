"""
Modal Wav2Lip video service — optimised build.

Optimisations vs naive subprocess approach:
  - A100 GPU (vs A10G)
  - Model loaded once in setup(), lives in GPU memory
  - Face detection on avatar precomputed once in setup(), cached
  - Inference called directly (no subprocess / Python startup overhead)

Deploy:
    modal deploy main.py
"""

import tempfile
from pathlib import Path

import modal
from fastapi import File, UploadFile
from fastapi.responses import JSONResponse, Response

app = modal.App("wav2lip-video-service")

WAV2LIP_PATH = "/wav2lip"
CHECKPOINT_DIR = "/wav2lip/checkpoints"

AVATAR_URL = (
    "https://img.freepik.com/free-photo/happy-young-woman-standing-isolated-white-wall_171337-18037.jpg?semt=ais_user_personalization&w=740&q=80"
)


def _download_wav2lip_checkpoint():
    import os, shutil, subprocess
    from huggingface_hub import hf_hub_download

    ckpt_dir = "/wav2lip/checkpoints"
    os.makedirs(ckpt_dir, exist_ok=True)
    dest = f"{ckpt_dir}/wav2lip_gan.pth"

    sources = [
        dict(repo_id="numz/wav2lip_studio",  filename="Wav2lip/wav2lip_gan.pth"),
        dict(repo_id="vumichien/Wav2Lip",    filename="checkpoints/wav2lip_gan.pth", repo_type="space"),
        dict(repo_id="numz/wav2lip",         filename="wav2lip_gan.pth"),
        dict(repo_id="Kdawg/Wav2Lip",        filename="wav2lip_gan.pth"),
    ]
    for kw in sources:
        try:
            p = hf_hub_download(**kw, local_dir="/tmp/hfdl")
            shutil.copy(p, dest)
            print(f"✓ wav2lip_gan.pth from {kw['repo_id']}")
            return
        except Exception as e:
            print(f"  ✗ {kw['repo_id']}: {e}")

    print("Trying gdown fallback …")
    r = subprocess.run(["gdown", "1j9smQPeH_RVASaVCZdHuW6x_1pz-5TzQ", "-O", dest])
    if r.returncode != 0:
        raise RuntimeError("All wav2lip_gan.pth download sources failed")


image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "git", "ffmpeg",
        "libsm6", "libxext6", "libgl1-mesa-glx", "libglib2.0-0",
        "wget",
    )
    .pip_install(
        "torch==2.0.1",
        "torchvision==0.15.2",
        index_url="https://download.pytorch.org/whl/cu118",
    )
    .pip_install(
        "librosa==0.10.1",
        "numpy==1.23.5",
        "opencv-python==4.8.1.78",
        "tqdm",
        "scipy",
        "huggingface_hub",
        "gdown",
        "fastapi",
        "python-multipart",
    )
    .run_commands(
        f"git clone https://github.com/Rudrabha/Wav2Lip {WAV2LIP_PATH}",
        f"wget -q -O /avatar.png '{AVATAR_URL}'",
        # Patch audio.py: librosa 0.10+ made sr/n_fft keyword-only
        (
            f"sed -i 's/librosa.filters.mel(hp.sample_rate, hp.n_fft,/"
            f"librosa.filters.mel(sr=hp.sample_rate, n_fft=hp.n_fft,/' "
            f"{WAV2LIP_PATH}/audio.py"
        ),
        # s3fd face-detection model
        (
            f"mkdir -p {WAV2LIP_PATH}/face_detection/detection/sfd && "
            f"wget -q -O {WAV2LIP_PATH}/face_detection/detection/sfd/s3fd.pth "
            "'https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth'"
        ),
    )
    .run_function(_download_wav2lip_checkpoint)
)

# ── constants (mirror inference.py) ────────────────────────────────────────────
IMG_SIZE = 96
MEL_STEP_SIZE = 16
FPS = 25
MEL_IDX_MULT = 80.0 / FPS
PADY1, PADY2, PADX1, PADX2 = 0, 10, 0, 0
WAV2LIP_BATCH = 128


@app.cls(
    gpu="a100",
    image=image,
    timeout=120,
    min_containers=1,
)
class Wav2LipService:

    @modal.enter()
    def setup(self):
        """
        Runs once per container:
          1. Load model weights into GPU memory.
          2. Detect face in avatar image and cache crop + coords.
        Every animate() call skips both of these expensive steps.
        """
        import sys
        sys.path.insert(0, WAV2LIP_PATH)

        import cv2
        import numpy as np
        import torch
        import face_detection as fd
        from models import Wav2Lip as Wav2LipModel

        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = device

        # ── 1. Load model ──────────────────────────────────────────────────────
        print("Loading Wav2Lip GAN model …")
        ckpt = torch.load(f"{CHECKPOINT_DIR}/wav2lip_gan.pth", map_location=device)
        state = {k.replace("module.", ""): v for k, v in ckpt["state_dict"].items()}
        model = Wav2LipModel()
        model.load_state_dict(state)
        self.model = model.to(device).eval()
        print("Model loaded.")

        # ── 2. Precompute face detection on avatar ─────────────────────────────
        print("Pre-computing face detection for avatar …")
        detector = fd.FaceAlignment(fd.LandmarksType._2D, flip_input=False, device=device)
        avatar = cv2.imread("/avatar.png")
        h, w = avatar.shape[:2]

        preds = detector.get_detections_for_batch(np.array([avatar]))
        if preds[0] is None:
            raise RuntimeError(
                "No face detected in /avatar.png — use a clear front-facing face photo."
            )

        rect = preds[0]
        y1 = max(0, int(rect[1]) - PADY1)
        y2 = min(h,  int(rect[3]) + PADY2)
        x1 = max(0, int(rect[0]) - PADX1)
        x2 = min(w,  int(rect[2]) + PADX2)

        face_crop = cv2.resize(avatar[y1:y2, x1:x2], (IMG_SIZE, IMG_SIZE))

        # face_det_results format expected by datagen logic:
        # list of [face_crop_resized, (y1, y2, x1, x2)]
        self.face_det_result = [face_crop, (y1, y2, x1, x2)]
        self.avatar = avatar
        print(f"Face detected at ({x1},{y1})→({x2},{y2}). Setup complete.")

    @modal.fastapi_endpoint(method="POST")
    async def animate(self, audio: UploadFile = File(...)):
        """
        POST multipart/form-data { audio: WAV bytes }
        Returns MP4 bytes.

        Hot path (model + face det already in memory):
          - mel spectrogram
          - batch GPU inference
          - ffmpeg mux
        """
        import subprocess
        import sys
        sys.path.insert(0, WAV2LIP_PATH)

        import cv2
        import numpy as np
        import torch
        import audio as wav2lip_audio

        audio_bytes = await audio.read()

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            audio_path = tmp / "input.wav"
            audio_path.write_bytes(audio_bytes)
            temp_avi  = tmp / "temp.avi"
            outfile   = tmp / "result.mp4"

            # ── mel spectrogram ────────────────────────────────────────────────
            wav = wav2lip_audio.load_wav(str(audio_path), 16000)
            mel = wav2lip_audio.melspectrogram(wav)

            mel_chunks = []
            i = 0
            while True:
                s = int(i * MEL_IDX_MULT)
                if s + MEL_STEP_SIZE > mel.shape[1]:
                    mel_chunks.append(mel[:, mel.shape[1] - MEL_STEP_SIZE:])
                    break
                mel_chunks.append(mel[:, s : s + MEL_STEP_SIZE])
                i += 1

            # ── batch inference ────────────────────────────────────────────────
            face_crop, coords = self.face_det_result
            avatar = self.avatar

            img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []
            result_frames = []

            def _run_batch():
                imgs = np.asarray(img_batch)                    # (B, 96, 96, 3)
                mels = np.asarray(mel_batch)[:, :, :, np.newaxis]  # (B, 80, 16) → (B, 80, 16, 1)

                masked = imgs.copy()
                masked[:, IMG_SIZE // 2:] = 0
                imgs_in = np.concatenate((masked, imgs), axis=3)  # (B, 96, 96, 6)

                img_t = torch.FloatTensor(
                    np.transpose(imgs_in, (0, 3, 1, 2))
                ).to(self.device) / 255.0
                mel_t = torch.FloatTensor(
                    np.transpose(mels, (0, 3, 1, 2))
                ).to(self.device)

                with torch.no_grad():
                    pred = self.model(mel_t, img_t)

                pred = (pred.permute(0, 2, 3, 1).cpu().numpy() * 255).astype(np.uint8)

                y1, y2, x1, x2 = coords
                for p, frame in zip(pred, frame_batch):
                    p_resized = cv2.resize(p, (x2 - x1, y2 - y1))
                    out_frame = frame.copy()
                    out_frame[y1:y2, x1:x2] = p_resized
                    result_frames.append(out_frame)

            for mel_chunk in mel_chunks:
                img_batch.append(face_crop)
                mel_batch.append(mel_chunk)
                frame_batch.append(avatar.copy())
                coords_batch.append(coords)

                if len(img_batch) >= WAV2LIP_BATCH:
                    _run_batch()
                    img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []

            if img_batch:
                _run_batch()
                img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []

            if not result_frames:
                return JSONResponse({"error": "No frames generated"}, status_code=500)

            # ── write video + mux audio ────────────────────────────────────────
            h, w = avatar.shape[:2]
            writer = cv2.VideoWriter(
                str(temp_avi),
                cv2.VideoWriter_fourcc(*"DIVX"),
                FPS,
                (w, h),
            )
            for frame in result_frames:
                writer.write(frame)
            writer.release()

            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", str(temp_avi),
                    "-i", str(audio_path),
                    "-c:v", "libx264", "-c:a", "aac",
                    "-strict", "experimental",
                    str(outfile),
                ],
                capture_output=True,
                check=True,
            )

            mp4_bytes = outfile.read_bytes()

        return Response(
            content=mp4_bytes,
            media_type="video/mp4",
            headers={"Content-Disposition": "attachment; filename=animation.mp4"},
        )
