"""
Local in-process MMS STT and TTS using the same Meta models as Modal.
STT: facebook/mms-1b-all  (~4 GB, CPU, 15-40s per clip)
TTS: facebook/mms-tts-{lang}  (~150 MB per language)

Both functions are async-safe: CPU inference runs in a ThreadPoolExecutor
so FastAPI's event loop is never blocked.
"""

import asyncio
import io
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import soundfile as sf

# ── shared thread pool ────────────────────────────────────────────────────────
_executor = ThreadPoolExecutor(max_workers=2)

# ── STT singleton ─────────────────────────────────────────────────────────────
_stt_model = None
_stt_processor = None


def _load_stt():
    global _stt_model, _stt_processor
    if _stt_model is None:
        from transformers import AutoProcessor, Wav2Vec2ForCTC

        model_id = "facebook/mms-1b-all"
        _stt_processor = AutoProcessor.from_pretrained(model_id)
        _stt_model = Wav2Vec2ForCTC.from_pretrained(model_id)
        _stt_model.eval()
    return _stt_processor, _stt_model


def _run_stt(audio_bytes: bytes, language: str) -> str:
    import torch

    processor, model = _load_stt()

    # The route already normalizes to 16 kHz mono WAV via ffmpeg,
    # so read directly with soundfile — no torchaudio backend needed.
    audio_array, sample_rate = sf.read(io.BytesIO(audio_bytes), dtype="float32")
    if audio_array.ndim > 1:
        audio_array = audio_array.mean(axis=1)
    if sample_rate != 16000:
        # Fallback resampling with numpy (linear interp) if somehow not 16k
        target_len = int(len(audio_array) * 16000 / sample_rate)
        audio_array = np.interp(
            np.linspace(0, len(audio_array), target_len),
            np.arange(len(audio_array)),
            audio_array,
        ).astype("float32")

    # Switch language adapter
    processor.tokenizer.set_target_lang(language)
    model.load_adapter(language)

    inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")

    with torch.no_grad():
        logits = model(**inputs).logits

    predicted_ids = torch.argmax(logits, dim=-1)
    return processor.batch_decode(predicted_ids)[0]


async def transcribe_audio(audio_bytes: bytes, language: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_stt, audio_bytes, language)


# ── TTS singletons (one per language) ────────────────────────────────────────
LANG_TO_MODEL = {
    "spa": "facebook/mms-tts-spa",
    "fra": "facebook/mms-tts-fra",
    "deu": "facebook/mms-tts-deu",
    "cmn": "facebook/mms-tts-cmn",
    "jpn": "facebook/mms-tts-jpn",
    "por": "facebook/mms-tts-por",
    "eng": "facebook/mms-tts-eng",
}

_tts_models: dict = {}
_tts_tokenizers: dict = {}


def _load_tts(language: str):
    if language not in _tts_models:
        from transformers import VitsModel, VitsTokenizer

        model_id = LANG_TO_MODEL[language]
        _tts_tokenizers[language] = VitsTokenizer.from_pretrained(model_id)
        m = VitsModel.from_pretrained(model_id)
        m.eval()
        _tts_models[language] = m
    return _tts_tokenizers[language], _tts_models[language]


def _run_tts(text: str, language: str) -> bytes:
    import torch

    tokenizer, model = _load_tts(language)

    inputs = tokenizer(text=text, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    waveform = outputs.waveform[0].cpu().numpy()
    sample_rate = model.config.sampling_rate

    wav_buffer = io.BytesIO()
    sf.write(wav_buffer, waveform, sample_rate, format="WAV")
    return wav_buffer.getvalue()


async def synthesize_speech(text: str, language: str) -> bytes:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_tts, text, language)
