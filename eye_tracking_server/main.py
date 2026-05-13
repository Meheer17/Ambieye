"""
main.py — AmbiEye Eye Tracking FastAPI Server
---------------------------------------------
Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

The app sends a video file to POST /analyse-eye-movement.
The server analyses it with OpenCV and returns a JSON result.
"""

import os
import uuid
import logging
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiofiles

from eye_analyzer import analyse_video_dict

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AmbiEye Eye Tracking Server",
    description="Receives eye exercise videos and analyses eye movement using OpenCV.",
    version="1.0.0",
)

# Allow requests from the React Native app (any origin during development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "ambieye_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/")
async def root():
    return {"status": "ok", "message": "AmbiEye Eye Tracking Server is running"}


@app.get("/health")
async def health():
    """Simple health check — the app pings this to verify the server is reachable."""
    return {"status": "ok"}


@app.post("/analyse-eye-movement")
async def analyse_eye_movement(
    video: UploadFile = File(..., description="Video file of the child's face during exercise"),
    game_id: int = 0,
    game_name: str = "",
):
    """
    Receive a video, save it temporarily, run OpenCV analysis, return results.

    Expected multipart fields:
      - video: the video file (mp4, mov, avi, etc.)
      - game_id: integer game identifier (optional)
      - game_name: string game name (optional)
    """
    # Validate content type loosely
    content_type = video.content_type or ""
    if not (content_type.startswith("video/") or content_type == "application/octet-stream"):
        logger.warning("Unexpected content type: %s", content_type)
        # Don't reject — mobile apps sometimes send wrong MIME types

    # Save to a temp file
    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    tmp_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"

    try:
        async with aiofiles.open(tmp_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # 1 MB chunks
                await f.write(chunk)

        file_size_mb = tmp_path.stat().st_size / (1024 * 1024)
        logger.info(
            "Received video: game_id=%d name=%s size=%.2f MB path=%s",
            game_id, game_name, file_size_mb, tmp_path
        )

        # Run analysis (synchronous — runs in the same thread; fine for a local server)
        result = analyse_video_dict(str(tmp_path))

        logger.info("Analysis result: %s", result)
        return JSONResponse(content={
            "game_id": game_id,
            "game_name": game_name,
            **result,
        })

    except Exception as e:
        logger.exception("Error during analysis")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Always clean up the temp file
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass
