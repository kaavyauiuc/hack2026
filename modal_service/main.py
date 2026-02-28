"""
Modal MMS (Massively Multilingual Speech) service.
Provides STT and TTS endpoints using Meta's MMS models.

Deploy with: modal deploy main.py
"""

import io
import modal
import numpy as np

app = modal.App("mms-speech-service")

# Image with all ML dependencies
ml_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "transformers==4.44.2",
        "torch==2.4.0",
        "torchaudio==2.4.0",
        "soundfile==0.12.1",
        "numpy==1.26.4",
        "accelerate==0.34.2",
    )
)

SUPPORTED_LANGUAGES = ["spa", "fra", "deu", "cmn", "jpn", "por", "eng"]

# ─────────────────────────────────────────────
# STT — facebook/mms-1b-all
# ─────────────────────────────────────────────

@app.cls(
    gpu="a10g",
    image=ml_image,
    keep_warm=1,
    timeout=120,
)
class MMSSTT:
    @modal.enter()
    def load_model(self):
        from transformers import Wav2Vec2ForCTC, AutoProcessor
        import torch

        model_id = "facebook/mms-1b-all"
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.model = Wav2Vec2ForCTC.from_pretrained(model_id)
        self.model.eval()
        if torch.cuda.is_available():
            self.model = self.model.cuda()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    @modal.web_endpoint(method="POST")
    async def transcribe(self, request):
        """
        Accepts multipart/form-data with:
          - audio: audio file bytes (WAV preferred, 16kHz mono)
          - language: MMS language code (e.g. 'spa', 'fra')
        Returns: {"transcript": "..."}
        """
        import torch
        import torchaudio
        import soundfile as sf
        from fastapi import Request
        from fastapi.responses import JSONResponse

        form = await request.form()
        audio_file = form.get("audio")
        language = form.get("language", "spa")

        if audio_file is None:
            return JSONResponse({"error": "No audio file provided"}, status_code=400)

        if language not in SUPPORTED_LANGUAGES:
            return JSONResponse(
                {"error": f"Unsupported language: {language}. Supported: {SUPPORTED_LANGUAGES}"},
                status_code=400,
            )

        audio_bytes = await audio_file.read()

        # Load audio and resample to 16kHz mono
        audio_buffer = io.BytesIO(audio_bytes)
        waveform, sample_rate = torchaudio.load(audio_buffer)

        # Convert to mono
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        # Resample to 16kHz if needed
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate, new_freq=16000
            )
            waveform = resampler(waveform)

        audio_array = waveform.squeeze().numpy()

        # Set target language and load adapter
        self.processor.tokenizer.set_target_lang(language)
        self.model.load_adapter(language)

        inputs = self.processor(
            audio_array,
            sampling_rate=16000,
            return_tensors="pt",
        )

        with torch.no_grad():
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            logits = self.model(**inputs).logits

        predicted_ids = torch.argmax(logits, dim=-1)
        transcript = self.processor.batch_decode(predicted_ids)[0]

        return JSONResponse({"transcript": transcript})


# ─────────────────────────────────────────────
# TTS — facebook/mms-tts-{lang}
# ─────────────────────────────────────────────

LANG_TO_MODEL = {
    "spa": "facebook/mms-tts-spa",
    "fra": "facebook/mms-tts-fra",
    "deu": "facebook/mms-tts-deu",
    "cmn": "facebook/mms-tts-cmn",
    "jpn": "facebook/mms-tts-jpn",
    "por": "facebook/mms-tts-por",
    "eng": "facebook/mms-tts-eng",
}


@app.cls(
    gpu="a10g",
    image=ml_image,
    keep_warm=1,
    timeout=120,
)
class MMSTTS:
    @modal.enter()
    def load_models(self):
        from transformers import VitsTokenizer, VitsModel
        import torch

        self.models = {}
        self.tokenizers = {}

        for lang, model_id in LANG_TO_MODEL.items():
            tokenizer = VitsTokenizer.from_pretrained(model_id)
            model = VitsModel.from_pretrained(model_id)
            model.eval()
            if torch.cuda.is_available():
                model = model.cuda()
            self.models[lang] = model
            self.tokenizers[lang] = tokenizer

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    @modal.web_endpoint(method="POST")
    async def synthesize(self, request):
        """
        Accepts JSON: {"text": "...", "language": "spa"}
        Returns: WAV audio bytes (Content-Type: audio/wav)
        """
        import torch
        import soundfile as sf
        from fastapi import Request
        from fastapi.responses import Response, JSONResponse

        body = await request.json()
        text = body.get("text", "")
        language = body.get("language", "spa")

        if not text:
            return JSONResponse({"error": "No text provided"}, status_code=400)

        if language not in SUPPORTED_LANGUAGES:
            return JSONResponse(
                {"error": f"Unsupported language: {language}"},
                status_code=400,
            )

        tokenizer = self.tokenizers[language]
        model = self.models[language]

        inputs = tokenizer(text=text, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)

        waveform = outputs.waveform[0].cpu().numpy()
        sample_rate = model.config.sampling_rate

        # Write to WAV in memory
        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, waveform, sample_rate, format="WAV")
        wav_bytes = wav_buffer.getvalue()

        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"},
        )
