"""
main.py — AmbiEye Eye Tracking FastAPI Server
---------------------------------------------
Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
  GET  /health                  — ping check
  POST /analyse-eye-movement    — upload video, get analysis JSON
  POST /debug-video             — same but returns per-frame debug info
"""

import uuid
import logging
import tempfile
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiofiles

from eye_analyzer import analyse_video_dict, FACE_CASCADE_PATH, EYE_CASCADE_PATH

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG,          # DEBUG so we see per-frame logs
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AmbiEye Eye Tracking Server",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "ambieye_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def _save_upload(video: UploadFile) -> Path:
    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    tmp_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    async with aiofiles.open(tmp_path, "wb") as f:
        while chunk := await video.read(1024 * 1024):
            await f.write(chunk)
    return tmp_path


@app.get("/")
async def root():
    return {"status": "ok", "message": "AmbiEye Eye Tracking Server v2 is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyse-eye-movement")
async def analyse_eye_movement(
    video: UploadFile = File(...),
    game_id: int = 0,
    game_name: str = "",
):
    tmp_path = await _save_upload(video)
    try:
        size_mb = tmp_path.stat().st_size / (1024 * 1024)
        logger.info("Received video: game=%s size=%.2f MB", game_name, size_mb)

        result = analyse_video_dict(str(tmp_path))
        logger.info("Result: %s", result)

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
    """
    Debug endpoint — returns per-frame detection info so you can see
    exactly what OpenCV is finding (or not finding) in your video.

    Returns JSON with:
      - video_info: fps, total_frames, resolution
      - frames: list of per-frame results
      - summary: aggregate stats
    """
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

        step = max(1, int(round(fps / 10)))  # sample at 10fps

        frames_info = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1
            if frame_idx % step != 0:
                continue

            # Resize
            h, w = frame.shape[:2]
            scale = min(1.0, 640 / w)
            if scale < 1.0:
                frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)

            frame_data: dict = {"frame": frame_idx, "faces": [], "eyes": []}

            # Face detection
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
            "video_info": {
                "fps": fps, "total_frames": total,
                "width": width, "height": height,
                "frames_sampled": len(frames_info),
            },
            "summary": {
                "frames_with_face": faces_found,
                "frames_with_eyes": eyes_found,
                "face_detection_rate": round(faces_found / max(len(frames_info), 1), 2),
                "eye_detection_rate":  round(eyes_found  / max(len(frames_info), 1), 2),
            },
            "frames": frames_info[:50],  # cap at 50 frames to keep response small
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
