import os
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from app.core.database import init_db
from app.core.logging import setup_logging
from app.api.endpoints import router
from app.services.audio_processor import AudioProcessor
from app.services.verse_matcher import VerseMatcher
from app.services.arabic_matcher import ArabicMatcher

# Setup logging
log_file = Path("logs") / "app.log"
logger = setup_logging("INFO", str(log_file))

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Quran Verse Identifier API")

    # Initialize database
    await init_db()

    # Initialize services
    app.state.audio_processor = AudioProcessor()
    app.state.verse_matcher = VerseMatcher()
    app.state.arabic_matcher = ArabicMatcher()
    app.state.arabic_matcher.initialize()

    logger.info("Application startup complete (AudioProcessor, VerseMatcher, ArabicMatcher initialized)")
    yield
    logger.info("Application shutdown")

app = FastAPI(
    title="Quran Verse Identifier API",
    description="API for identifying Quran verses from audio recordings",
    version="1.0.0",
    lifespan=lifespan
)

from fastapi.staticfiles import StaticFiles

# CORS Configuration
cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
allow_all = cors_origins_env.strip() == "*"
cors_origins = ["*"] if allow_all else [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if not allow_all else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "quran-verse-identifier"}

# Mount frontend static build if available
static_dir = None
for candidate in [
    Path(__file__).parent.parent / "static",
    Path(__file__).parent.parent.parent / "static",
    Path(__file__).parent.parent / "frontend_build",
    Path(__file__).parent.parent.parent / "frontend" / "build",
]:
    if candidate.exists() and (candidate / "index.html").exists():
        static_dir = candidate
        break

if static_dir:
    logger.info(f"Serving frontend static build from: {static_dir}")
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Quran Verse Identifier API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)