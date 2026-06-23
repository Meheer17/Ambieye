"""
main.py — AmbiEye Eye Tracking Server v3
-----------------------------------------
Streaming chunk-based analysis: the app sends 3-second video chunks
continuously during the game. Each chunk is analysed immediately.
At the end, the app calls /finalise-session with all chunk results
to get the averaged final verdict.

Endpoints:
  GET  /health                  — ping check
  POST /analyse-chunk           — analyse one 3-second video chunk, return raw numbers
  POST /finalise-session        — average all chunk results → final verdict + summary
  POST /analyse-eye-movement    — legacy: full video upload (kept for compatibility)
  POST /debug-video             — per-frame debug info
"""

import uuid
import logging
import tempfile
import asyncio
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import List

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import aiofiles

from eye_analyzer import (
    analyse_video_dict,
    FACE_CASCADE_PATH,
    EYE_CASCADE_PATH,
    MOVEMENT_THRESHOLD_PX,
)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── Thread pool for CPU-bound OpenCV work ─────────────────────────────────────
# Allows multiple chunks to be analysed concurrently without blocking the
# async event loop.
_executor = ThreadPoolExecutor(max_workers=4)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="AmbiEye Eye Tracking Server", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "ambieye_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Pydantic models ───────────────────────────────────────────────────────────

class ChunkResult(BaseModel):
    """Raw numbers from one analysed chunk — no verdict yet."""
    chunk_index: int
    total_frames: int
    frames_with_eyes: int
    movement_count: int
    avg_movement: float
    success: bool


class FinaliseRequest(BaseModel):
    """Sent by the app after the game ends with all accumulated chunk results."""
    game_id: int = 0
    game_name: str = ""
    chunks: List[ChunkResult]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _save_upload(video: UploadFile) -> Path:
    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    tmp_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    async with aiofiles.open(tmp_path, "wb") as f:
        while chunk := await video.read(512 * 1024):  # 512 KB chunks
            await f.write(chunk)
    return tmp_path


def _analyse_sync(path: str) -> dict:
    """Runs analyse_video_dict synchronously — called in thread pool."""
    return analyse_video_dict(path)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "message": "AmbiEye Eye Tracking Server v3 — chunk mode"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyse-chunk")
async def analyse_chunk(
    video: UploadFile = File(...),
    chunk_index: int = 0,
    game_id: int = 0,
    game_name: str = "",
):
    """
    Analyse a single short video chunk (typically 3 seconds).

    Returns raw numbers only — no verdict. The app accumulates these
    and calls /finalise-session at the end to get the final verdict.

    The analysis runs in a thread pool so multiple chunks can be
    processed concurrently while the phone is already recording the next one.
    """
    tmp_path = await _save_upload(video)
    try:
        size_kb = tmp_path.stat().st_size / 1024
        logger.info(
            "Chunk %d: game=%s size=%.0fKB",
            chunk_index, game_name, size_kb
        )

        # Run OpenCV analysis in thread pool — non-blocking
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(_executor, _analyse_sync, str(tmp_path))

        logger.info(
            "Chunk %d result: movements=%d eye_frames=%d/%d",
            chunk_index,
            raw.get("movement_count", 0),
            raw.get("frames_with_eyes", 0),
            raw.get("total_frames", 0),
        )

        return JSONResponse(content={
            "chunk_index": chunk_index,
            "game_id": game_id,
            "game_name": game_name,
            "total_frames": raw.get("total_frames", 0),
            "frames_with_eyes": raw.get("frames_with_eyes", 0),
            "movement_count": raw.get("movement_count", 0),
            "avg_movement": raw.get("avg_movement", 0.0),
            "success": raw.get("success", False),
            # Pass through verdict/summary so the app can show live feedback
            "verdict": raw.get("verdict", "none"),
            "summary": raw.get("summary", ""),
        })

    except Exception as e:
        logger.exception("Chunk analysis error")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            tmp_path.unlink()
        except Exception:
            pass


@app.post("/finalise-session")
async def finalise_session(req: FinaliseRequest):
    """
    Average all chunk results and return the final verdict.

    Called once after the game ends with the list of ChunkResult objects
    accumulated during the session.
    """
    if not req.chunks:
        return JSONResponse(content={
            "success": False,
            "verdict": "none",
            "summary": "No chunks were analysed.",
            "movement_count": 0,
            "avg_movement": 0.0,
            "total_frames": 0,
            "frames_with_eyes": 0,
            "chunks_analysed": 0,
        })

    successful = [c for c in req.chunks if c.success]

    if not successful:
        return JSONResponse(content={
            "success": True,
            "verdict": "no_face",
            "summary": (
                "No face was detected in any chunk. "
                "Make sure the front camera is facing the child and the room is well lit."
            ),
            "movement_count": 0,
            "avg_movement": 0.0,
            "total_frames": sum(c.total_frames for c in req.chunks),
            "frames_with_eyes": 0,
            "chunks_analysed": len(req.chunks),
        })

    # Aggregate across all successful chunks
    total_frames     = sum(c.total_frames for c in successful)
    frames_with_eyes = sum(c.frames_with_eyes for c in successful)
    total_movements  = sum(c.movement_count for c in successful)
    avg_movement     = (
        sum(c.avg_movement * c.frames_with_eyes for c in successful)
        / max(frames_with_eyes, 1)
    )

    # Movements per chunk (normalised) — more meaningful than raw total
    movements_per_chunk = total_movements / len(successful)
    eye_ratio = frames_with_eyes / max(total_frames, 1)

    logger.info(
        "Finalise: %d chunks, total_movements=%d, movements_per_chunk=%.1f, eye_ratio=%.2f",
        len(successful), total_movements, movements_per_chunk, eye_ratio
    )

    # Verdict based on per-chunk averages
    if movements_per_chunk >= 3 and eye_ratio >= 0.25:
        verdict = "good"
        summary = (
            f"Eyes are moving well! Detected {total_movements} total eye movements "
            f"across {len(successful)} chunks "
            f"({movements_per_chunk:.1f} per chunk, avg {avg_movement:.0f}px shift)."
        )
    elif movements_per_chunk >= 1 or eye_ratio >= 0.15:
        verdict = "partial"
        summary = (
            f"Some eye movement detected — {total_movements} movements across "
            f"{len(successful)} chunks ({movements_per_chunk:.1f} per chunk). "
            f"Encourage the child to follow the ball more closely."
        )
    else:
        verdict = "none"
        summary = (
            f"Very little eye movement detected ({total_movements} total movements, "
            f"{movements_per_chunk:.1f} per chunk). "
            f"The child may not be following the ball, or the camera angle needs adjusting."
        )

    return JSONResponse(content={
        "success": True,
        "verdict": verdict,
        "summary": summary,
        "movement_count": total_movements,
        "avg_movement": round(avg_movement, 1),
        "total_frames": total_frames,
        "frames_with_eyes": frames_with_eyes,
        "chunks_analysed": len(successful),
        "movements_per_chunk": round(movements_per_chunk, 1),
    })


@app.post("/analyse-eye-movement")
async def analyse_eye_movement(
    video: UploadFile = File(...),
    game_id: int = 0,
    game_name: str = "",
):
    """Legacy full-video endpoint — kept for compatibility."""
    tmp_path = await _save_upload(video)
    try:
        size_mb = tmp_path.stat().st_size / (1024 * 1024)
        logger.info("Legacy full video: game=%s size=%.2f MB", game_name, size_mb)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, _analyse_sync, str(tmp_path))
        return JSONResponse(content={"game_id": game_id, "game_name": game_name, **result})
    except Exception as e:
        logger.exception("Analysis error")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            tmp_path.unlink()
        except Exception:
            pass


@app.post("/debug-video")
async def debug_video(video: UploadFile = File(...)):
    """Per-frame debug info — see what OpenCV detects in each frame."""
    tmp_path = await _save_upload(video)
    try:
        face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
        eye_cascade  = cv2.CascadeClassifier(EYE_CASCADE_PATH)

        cap = cv2.VideoCapture(str(tmp_path))
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video")

        fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        step   = max(1, int(round(fps / 10)))

        frames_info = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1
            if frame_idx % step != 0:
                continue

            h, w = frame.shape[:2]
            scale = min(1.0, 640 / w)
            if scale < 1.0:
                frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)

            frame_data: dict = {"frame": frame_idx, "faces": [], "eyes": []}

            faces = []
            for mn, ms in [(5, 80), (4, 60), (3, 50), (2, 40)]:
                faces = face_cascade.detectMultiScale(gray, 1.1, mn, minSize=(ms, ms))
                if len(faces) > 0:
                    break

            for fx, fy, fw, fh in faces:
                frame_data["faces"].append({"x": int(fx), "y": int(fy), "w": int(fw), "h": int(fh)})
                eye_region = gray[fy: fy + int(fh * 0.55), fx: fx + fw]
                eyes = []
                for mn, ms in [(4, 20), (3, 15), (2, 12)]:
                    eyes = eye_cascade.detectMultiScale(eye_region, 1.05, mn, minSize=(ms, ms))
                    if len(eyes) > 0:
                        break
                for ex, ey, ew, eh in eyes:
                    frame_data["eyes"].append({
                        "x_face": int(ex), "y_face": int(ey),
                        "w": int(ew), "h": int(eh),
                        "centre_x": int(ex + ew // 2),
                        "centre_y": int(ey + eh // 2),
                    })

            frames_info.append(frame_data)

        cap.release()

        faces_found = sum(1 for f in frames_info if f["faces"])
        eyes_found  = sum(1 for f in frames_info if f["eyes"])

        return JSONResponse(content={
            "video_info": {"fps": fps, "total_frames": total, "width": width, "height": height, "frames_sampled": len(frames_info)},
            "summary": {
                "frames_with_face": faces_found,
                "frames_with_eyes": eyes_found,
                "face_detection_rate": round(faces_found / max(len(frames_info), 1), 2),
                "eye_detection_rate":  round(eyes_found  / max(len(frames_info), 1), 2),
            },
            "frames": frames_info[:50],
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Debug error")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            tmp_path.unlink()
        except Exception:
            pass
