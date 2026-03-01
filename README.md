# Rosetta

An AI language tutor that listens, speaks, and shows up — with a talking avatar, real-time CEFR assessment, and lessons that adapt to how you actually learn.

---

## What it does

You talk to a tutor. The tutor talks back — in the language you're learning, at exactly your level — with its mouth moving in sync. After every session, your fluency gets assessed and your passport fills with stamps.

**Languages supported:** Spanish · French · German · Mandarin · Japanese · Portuguese · Hindi · English

---

## The stack

| Layer | Technology |
|---|---|
| Tutor brain | Gemini 2.5 Flash (google-genai) |
| Speech-to-text | Google Cloud Speech-to-Text |
| Text-to-speech | Google Cloud Text-to-Speech |
| Talking-head video | Wav2Lip on Modal A100 GPU |
| Backend | FastAPI + Motor |
| Database | MongoDB Atlas |
| Frontend | React + Vite |

---

## How Gemini powers the whole session

Gemini 2.5 Flash does three distinct jobs in sequence, each using structured output with a Pydantic response schema so the response is always valid JSON:

### 1. Lesson planning
Before a session starts, Gemini reads the user's CEFR level, past session history, known weaknesses, and preferred topics — then generates a personalised lesson plan with objectives, activities, and success criteria. It's instructed not to repeat topics from recent sessions and to build on the last assessment.

```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=_LessonPlanOutput,  # Pydantic model
    ),
)
```

### 2. Streaming tutor
During the session, every user message is streamed through Gemini with the lesson plan injected as system context. The tutor responds in the target language, corrects errors inline, and keeps the conversation at the right CEFR difficulty. Responses stream token-by-token to the frontend over SSE.

```python
stream = await client.aio.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents=contents,          # full conversation history
    config=types.GenerateContentConfig(system_instruction=system_prompt),
)
async for chunk in stream:
    yield chunk.text
```

### 3. Session evaluation
When the session ends, Gemini reads the full transcript against the lesson objectives and returns a structured CEFR estimate, achieved objectives, weaknesses, and a recommendation for the next session — again using structured output so the response maps directly to a Pydantic model and gets stored in MongoDB.

---

## How the talking avatar works

The avatar pipeline is the most technically involved part of the project.

### The problem
Generating a lip-synced talking-head video is GPU-intensive. Running it naively with SadTalker took ~48 seconds per response — too slow to be useful.

### The solution: Wav2Lip on Modal, heavily optimised

**1. Model choice**
We switched from SadTalker to [Wav2Lip](https://github.com/Rudrabha/Wav2Lip), a model purpose-built for lip-sync. It's lighter, faster, and doesn't need GFPGAN face restoration.

**2. Deployed on Modal A100**
The Modal service (`modal_video_service/main.py`) runs on an A100 GPU. Checkpoints are baked into the container image at build time so there's no download on startup.

**3. Precomputed face detection**
The avatar image never changes between requests. So in `@modal.enter()` — which runs once per container — we load the Wav2Lip model into GPU memory and run face detection on the avatar, caching the crop and bounding box coordinates.

```python
@modal.enter()
def setup(self):
    # Load model weights into GPU memory once
    model = Wav2LipModel()
    model.load_state_dict(state)
    self.model = model.to("cuda").eval()

    # Precompute face detection — never runs again per container
    preds = detector.get_detections_for_batch(np.array([avatar]))
    self.face_det_result = [face_crop, (y1, y2, x1, x2)]
```

**4. Direct inference, no subprocess**
Instead of spawning a Python subprocess for each request (2–3s overhead), `animate()` calls the model directly with the cached face crop and live mel spectrogram.

**Result:** ~18s cold start (model load + face detection, once per container), **~1.3s warm** (just mel spectrogram + GPU inference + ffmpeg mux).

**5. Async, non-blocking UX**
The video is generated in parallel with audio playback. The user hears the tutor immediately via Google TTS; the avatar animates when the video arrives (~1–2s later on a warm container).

---

## Architecture

```
Browser
  │
  ├── mic/text input
  │       │
  │       ▼
  │   FastAPI /session/message  ──►  Gemini 2.5 Flash (streaming SSE)
  │       │                               ▲
  │       │                         lesson plan + history context
  │       │
  ├── audio plays immediately
  │   Google TTS  ◄──  /speech/tts  ◄──  tutor text
  │
  └── avatar animates ~1s later
      Modal A100  ◄──  /video/animate  ◄──  TTS audio blob
          │
          Wav2Lip inference (warm: 1.3s)
          └── MP4 → AvatarPanel overlays on static image
```

---

## Session flow

```
Onboarding → set native lang, target lang, starting CEFR
     │
     ▼
Session start
  → Gemini plans lesson (CEFR + history + weaknesses)
  → tutor sends opening message
  → Google TTS speaks it
  → Wav2Lip avatar animates
     │
     ▼  (repeat)
User speaks or types
  → Google STT transcribes
  → Gemini streams tutor reply (SSE)
  → TTS + avatar animate in parallel
     │
     ▼
Session end
  → Gemini evaluates full transcript
  → CEFR level updated in MongoDB
  → Strengths, weaknesses, next recommendation stored
     │
     ▼
Dashboard
  → Passport stamps fill up to current CEFR tier
  → Session history with per-session CEFR assessments
```

---

## Running locally

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Modal video service (optional, set VIDEO_BACKEND=local to skip)
cd modal_video_service
pip install modal
modal deploy main.py
```

### Environment variables (`backend/.env`)

```
ANTHROPIC_API_KEY=        # optional, Claude fallback
GEMINI_API_KEY=           # Gemini 2.5 Flash — lesson planning, tutor, eval
GOOGLE_API_KEY=           # Google Cloud STT + TTS
MONGODB_URI=              # MongoDB Atlas connection string
SPEECH_BACKEND=google     # "google" or "modal"
VIDEO_BACKEND=modal       # "modal" or "local"
MODAL_VIDEO_URL=          # printed by `modal deploy main.py`
```

---

## Key files

```
backend/
  app/
    services/
      gemini_service.py     # planner, streaming tutor, evaluator, translator
      google_service.py     # STT + TTS via Google Cloud REST
      video_service.py      # dispatches to modal_video or local_video
      modal_video.py        # HTTP client → Modal animate endpoint
    routes/
      sessions.py           # SSE streaming endpoint
      speech.py             # STT + TTS routes
      video.py              # /video/animate
    prompts/                # planner, tutor, evaluator system prompts

modal_video_service/
  main.py                   # Wav2Lip on Modal A100 — full deployment

frontend/
  src/
    pages/
      Session.jsx           # main conversation UI
      Dashboard.jsx         # passport badges + session history
    components/
      AvatarPanel.jsx       # static image → talking video crossfade
```
