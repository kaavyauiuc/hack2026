"""
FastAPI entry point for the Language Learning app backend.
Run with: uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import users_router, sessions_router, speech_router, video_router

app = FastAPI(
    title="Language Learning API",
    description="AI-powered language tutoring with CEFR assessment",
    version="1.0.0",
)

# Allow React dev server (Vite default port 5173) and any localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(sessions_router)
app.include_router(speech_router)
app.include_router(video_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
