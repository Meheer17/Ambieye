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
from fastapi import FastAPI, File, UploadFile, HTTPException, Body, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import aiofiles

import database

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

# Initialize database schema (zero seeded data)
database.init_db()

# ── Real-Time WebSocket Connection Manager ────────────────────────────────────
class RealtimeConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("[WS] New client connected. Active: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("[WS] Client disconnected. Active: %d", len(self.active_connections))

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

realtime_manager = RealtimeConnectionManager()

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


class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    fullName: str
    username: str
    email: str
    password: str
    phone: str = ""
    dateOfBirth: str = ""
    age: str = ""
    gender: str = ""
    fatherName: str = ""
    motherName: str = ""
    address: str = ""
    userType: str = "patient"


# Preconfigured demo users for all 4 roles in the NER Dementia Care Ecosystem
DEMO_USERS = {
    "mahi": {
        "id": "1",
        "fullName": "Bhaben Barman (Senior)",
        "username": "mahi",
        "email": "bhaben@dementia.ner.in",
        "role": "patient",
        "mode": "elderly",
        "age": "72",
        "gender": "Male",
        "condition": "Mild Cognitive Impairment (Early Stage)",
    },
    "caregiver": {
        "id": "2",
        "fullName": "Anita Barman (Caregiver)",
        "username": "caregiver",
        "email": "anita@caregiver.ner.in",
        "role": "caregiver",
        "mode": "caregiver",
        "patientName": "Bhaben Barman",
        "relation": "Daughter",
    },
    "asha_worker": {
        "id": "3",
        "fullName": "Priya Das (ASHA Community)",
        "username": "asha_worker",
        "email": "priya.asha@nhm.gov.in",
        "role": "doctor",
        "mode": "asha",
        "region": "Kamrup Rural, Assam",
    },
    "mahit": {
        "id": "4",
        "fullName": "Dr. Mahit Sharma (Neurologist)",
        "username": "mahit",
        "email": "dr.mahit@gnrc.in",
        "role": "doctor",
        "mode": "specialist",
        "specialization": "Geriatric Neurology & Dementia Care",
    },
}

# Ensure all 4 core ecosystem roles are synchronized in SQLite with proper roles
for _demo_key, _demo_data in DEMO_USERS.items():
    try:
        database.create_or_update_user(_demo_data)
    except Exception as _e:
        logger.warning("Could not sync demo user %s: %s", _demo_key, _e)


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
    return {
        "status": "ok",
        "message": "AmbiEye Eye Tracking & NER Dementia Care Server v3 — chunk & auth mode",
        "supported_roles": ["elderly (mahi)", "caregiver (caregiver)", "asha (asha_worker)", "specialist (mahit)"],
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


def _handle_auth_login(payload: LoginRequest):
    u = payload.username.strip().lower()
    
    if u in DEMO_USERS:
        user = database.create_or_update_user(DEMO_USERS[u])
    else:
        user = database.get_user_by_username(u)
        if not user:
            is_care = "care" in u
            is_doc = "doc" in u or "asha" in u or "mahit" in u
            user = database.create_or_update_user({
                "id": str(abs(hash(u)) % 10000),
                "fullName": payload.username.title(),
                "username": payload.username,
                "email": f"{payload.username}@dementia.ner.in",
                "role": "caregiver" if is_care else ("doctor" if is_doc else "patient"),
                "mode": "caregiver" if is_care else ("specialist" if is_doc else "elderly"),
            })

    if u == "caregiver" or "care" in u:
        user["role"] = "caregiver"
        user["mode"] = "caregiver"

    return {
        "access_token": f"token_{user['username']}_{uuid.uuid4().hex[:8]}",
        "refresh_token": f"refresh_{user['username']}_{uuid.uuid4().hex[:8]}",
        "user": user,
    }


@app.post("/auth/login")
@app.post("/api/auth/login")
async def auth_login(payload: LoginRequest):
    return _handle_auth_login(payload)


@app.post("/auth/signup")
@app.post("/api/auth/signup")
async def auth_signup(payload: SignupRequest):
    user = database.create_or_update_user({
        "id": str(abs(hash(payload.username)) % 10000),
        "fullName": payload.fullName,
        "username": payload.username,
        "email": payload.email,
        "role": payload.userType or "patient",
        "age": payload.age,
        "gender": payload.gender,
    })
    return {
        "access_token": f"token_{user['username']}_{uuid.uuid4().hex[:8]}",
        "refresh_token": f"refresh_{user['username']}_{uuid.uuid4().hex[:8]}",
        "user": user,
    }


@app.get("/auth/verify")
@app.get("/api/auth/verify")
async def auth_verify(request: Request):
    auth_header = request.headers.get("authorization", "").lower()
    # Check if known username is in the authorization header
    with database.get_db_connection() as conn:
        users = conn.execute("SELECT * FROM users").fetchall()
        for u_row in sorted(users, key=lambda r: len(r["username"]), reverse=True):
            if u_row["username"].lower() in auth_header:
                u_dict = dict(u_row)
                if u_dict["username"].lower() == "caregiver" or "care" in u_dict["username"].lower():
                    u_dict["role"] = "caregiver"
                    u_dict["mode"] = "caregiver"
                return {"status": 200, "user": u_dict}
    # If no token or unrecognized, default to mahi
    default_user = database.get_user_by_username("mahi")
    return {"status": 200, "user": default_user}


@app.get("/api/doctor/dashboard")
@app.get("/doctor/dashboard")
async def doctor_dashboard():
    return {
        "totalPatients": 28,
        "activeToday": 14,
        "mmseCompleted": 42,
        "alerts": [
            {"patient": "Bhaben Barman", "issue": "Word Recall latency elevated (+18%)", "date": "Today"},
            {"patient": "Renuka Devi", "issue": "Medication skipped morning dose", "date": "Yesterday"},
        ],
    }


@app.get("/api/patient/dashboard")
@app.get("/patient/dashboard")
async def patient_dashboard():
    return {
        "streakDays": 5,
        "todayCompleted": 3,
        "totalActivities": 5,
        "mood": "Calm 😌",
    }


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

    result_payload = {
        "success": True,
        "verdict": verdict,
        "summary": summary,
        "movement_count": total_movements,
        "avg_movement": round(avg_movement, 1),
        "total_frames": total_frames,
        "frames_with_eyes": frames_with_eyes,
        "chunks_analysed": len(successful),
        "movements_per_chunk": round(movements_per_chunk, 1),
    }

    # Persist session to SQLite database
    session_record = {
        "game_id": req.game_id,
        "game_name": req.game_name or "Eye Tracking Assessment",
        "movement_count": total_movements,
        "avg_movement": round(avg_movement, 1),
        "fixation_ratio": round(eye_ratio, 2),
        "verdict": verdict,
        "summary": summary,
        "details": result_payload,
    }
    database.save_cognitive_session(session_record, user_id="mahi")

    # Real-time WebSocket broadcast to Doctor & Caregiver dashboards
    await realtime_manager.broadcast({
        "type": "COGNITIVE_SESSION",
        "user_id": "mahi",
        "data": session_record,
    })

    return JSONResponse(content=result_payload)


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


# ══════════════════════════════════════════════════════════════════════════════
# FEDERATED LEARNING & ON-DEVICE ML PIPELINE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════
from federated_fl import fl_coordinator


@app.post("/federated/train-round")
async def trigger_federated_round(payload: dict = None):
    """
    Simulates a decentralized Federated Learning training round across edge clients
    (Elder client + Memory clinic node + Community ASHA node).
    Aggregates weights using FedAvg and injects Differential Privacy Laplace noise.
    """
    if payload is None:
        payload = {}

    client_id = payload.get("client_id", "elder-bhaben-node-1")
    custom_features = payload.get("features", None)

    # 1. Local edge training on primary client
    client1_update = fl_coordinator.train_local_client(
        client_id=client_id,
        epochs=4,
        custom_features=custom_features
    )

    # 2. Local edge training on decentralized companion nodes
    client2_update = fl_coordinator.train_local_client("memory-clinic-node-2", epochs=3)
    client3_update = fl_coordinator.train_local_client("asha-community-node-3", epochs=3)

    # 3. FedAvg Aggregation on Central Coordinator
    round_result = fl_coordinator.aggregate_fedavg([client1_update, client2_update, client3_update])

    return JSONResponse(content={
        "success": True,
        "message": "Federated Learning round completed with Differential Privacy.",
        "round_summary": round_result,
    })


@app.get("/federated/status")
async def get_federated_status():
    """
    Returns current global federated model status, training round, accuracy, and history.
    """
    return JSONResponse(content={
        "success": True,
        "round": fl_coordinator.current_round,
        "epsilon_privacy": fl_coordinator.epsilon_privacy,
        "privacy_guarantee": f"Differential Privacy Active (epsilon={fl_coordinator.epsilon_privacy})",
        "recent_history": fl_coordinator.history[-5:],
    })


@app.post("/federated/predict")
async def predict_cognitive_stability(payload: dict):
    """
    Evaluates real-time patient telemetry against the federated global model.
    Expected features: [reaction_time_s, accuracy_pct, saccades_per_min, sleep_hrs, wakes_count, mood_score, hydration_ratio]
    """
    features = payload.get("features", [2.3, 88.0, 14.5, 7.2, 1.0, 4.5, 0.8])
    result = fl_coordinator.predict_stability(features)
    return JSONResponse(content={"success": True, **result})


# ══════════════════════════════════════════════════════════════════════════════
# REST API COMPATIBILITY ENDPOINTS (/api/...)
# ══════════════════════════════════════════════════════════════════════════════

# In-memory store for queries and game results
_QUERIES_DB = [
    {
        "id": "q-1",
        "question": "Is mild evening restlessness normal during weather changes?",
        "response": "Yes, temperature and lighting shifts can cause mild sensory disorientation. Ensuring warm courtyard tea and soothing lighting helps significantly.",
        "status": "answered",
        "doctorName": "Dr. Ananya Sharma",
        "createdAt": "2026-09-12T10:30:00Z",
        "updatedAt": "2026-09-12T14:15:00Z",
    },
    {
        "id": "q-2",
        "question": "Should we increase morning garden walking duration from 15 to 25 mins?",
        "response": "20-25 mins of gentle walking in sunlight is wonderful for circadian rhythm and nighttime sleep quality. Just keep a water bottle handy.",
        "status": "answered",
        "doctorName": "Dr. Ananya Sharma",
        "createdAt": "2026-09-11T09:00:00Z",
        "updatedAt": "2026-09-11T12:00:00Z",
    },
]

_GAME_RESULTS_DB = []


@app.get("/api/patient/queries")
async def get_patient_queries():
    return JSONResponse(content={"success": True, "queries": _QUERIES_DB})


@app.post("/api/patient/queries")
async def create_patient_query(payload: dict = Body(...)):
    new_q = {
        "id": f"q-{uuid.uuid4().hex[:6]}",
        "question": payload.get("question", ""),
        "urgency": payload.get("urgency", "medium"),
        "status": "pending",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    _QUERIES_DB.insert(0, new_q)
    return JSONResponse(content={"success": True, "query": new_q})


@app.get("/api/patient/profile")
async def get_patient_profile():
    return JSONResponse(content={
        "success": True,
        "profile": {
            "id": "p-bhaben-1",
            "name": "Bhaben Barman",
            "age": 74,
            "gender": "Male",
            "primaryCaregiver": "Anita Barman (Daughter)",
            "primaryDoctor": "Dr. Ananya Sharma",
            "conditions": ["Mild Cognitive Impairment (Early Alzheimer's)", "Hypertension"],
            "bloodGroup": "B+",
            "emergencyContact": "+91 98640 12345",
        },
        "stats": {
            "totalQueries": len(_QUERIES_DB),
            "answeredQueries": sum(1 for q in _QUERIES_DB if q.get("status") == "answered"),
            "pendingQueries": sum(1 for q in _QUERIES_DB if q.get("status") == "pending"),
        }
    })


@app.get("/api/patient/dashboard")
async def get_patient_dashboard():
    return JSONResponse(content={
        "success": True,
        "stats": {
            "totalQueries": len(_QUERIES_DB),
            "answeredQueries": sum(1 for q in _QUERIES_DB if q.get("status") == "answered"),
            "pendingQueries": sum(1 for q in _QUERIES_DB if q.get("status") == "pending"),
            "gamesPlayed": len(_GAME_RESULTS_DB),
        },
        "recentQueries": _QUERIES_DB[:3],
    })


@app.post("/api/games/results")
async def save_game_result_api(payload: dict = Body(...)):
    _GAME_RESULTS_DB.append(payload)
    return JSONResponse(content={"success": True, "message": "Game result saved", "result": payload})


@app.get("/api/games/history")
async def get_game_history_api():
    return JSONResponse(content={"success": True, "history": _GAME_RESULTS_DB})


@app.get("/api/games/today")
async def get_today_games_api():
    return JSONResponse(content={"success": True, "games": _GAME_RESULTS_DB[-5:]})


# ══════════════════════════════════════════════════════════════════════════════
# REAL IOT HARDWARE & WEARABLE TELEMETRY ENDPOINTS (SQLITE BACKED)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/iot/telemetry")
async def ingest_iot_telemetry(payload: dict = Body(...)):
    """
    Ingests real-time telemetry from wearable hardware (Smart Band, Pulse Oximeter, ESP32),
    persists directly to SQLite, and broadcasts in real-time to active WebSocket clients.
    """
    user_id = payload.get("user_id", "mahi")
    saved_telemetry = database.save_iot_telemetry(payload, user_id=user_id)
    logger.info("Ingested & Persisted IoT Telemetry: HR=%d SpO2=%d (User: %s)", saved_telemetry["heart_rate"], saved_telemetry["spo2"], user_id)
    
    # Broadcast to connected Caregiver and Doctor mobile devices
    await realtime_manager.broadcast({
        "type": "IOT_TELEMETRY",
        "user_id": user_id,
        "data": saved_telemetry,
    })
    
    return JSONResponse(content={"success": True, "message": "Telemetry recorded in database", "current": saved_telemetry})


@app.get("/api/iot/latest")
async def get_latest_iot_telemetry(user_id: str = "mahi"):
    """
    Returns latest sensor readings and geofence status from SQLite database.
    """
    telemetry = database.get_latest_telemetry(user_id=user_id)
    geofence = database.get_latest_geofence(user_id=user_id)
    return JSONResponse(content={
        "success": True,
        "telemetry": telemetry,
        "geofence": geofence,
    })


@app.post("/api/iot/beacon")
async def ingest_beacon_geofence(payload: dict = Body(...)):
    """
    Ingests live GPS / BLE Beacon proximity for wandering deterrence into SQLite.
    """
    user_id = payload.get("user_id", "mahi")
    saved_geofence = database.save_beacon_geofence(payload, user_id=user_id)
    
    await realtime_manager.broadcast({
        "type": "BEACON_GEOFENCE",
        "user_id": user_id,
        "data": saved_geofence,
    })
    
    return JSONResponse(content={"success": True, "geofence": saved_geofence})


@app.get("/api/iot/history")
async def get_iot_history(user_id: str = "mahi"):
    """
    Returns historical vitals trends from SQLite for caregiver analytics.
    """
    history = database.get_telemetry_history(user_id=user_id)
    return JSONResponse(content={"success": True, "history": history})


@app.get("/api/iot/wearable-status")
async def get_wearable_status(user_id: str = "mahi"):
    """
    Returns connection heartbeat of paired sensors from SQLite.
    """
    telemetry = database.get_latest_telemetry(user_id=user_id)
    return JSONResponse(content={
        "success": True,
        "paired": True,
        "connected": telemetry.get("connected", False),
        "device_name": telemetry.get("device_name", "No Sensor Connected"),
        "battery_pct": telemetry.get("battery_pct", 0),
        "last_sync": telemetry.get("last_sync_timestamp", None),
    })


# ══════════════════════════════════════════════════════════════════════════════
# MEDICATION REMINDERS & ROUTINE (REAL-TIME SQLITE PERSISTED)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/reminders")
async def get_reminders_api(user_id: str = "mahi"):
    """Returns patient routine and medication reminders from database."""
    reminders = database.get_reminders(user_id=user_id)
    return JSONResponse(content={"success": True, "reminders": reminders})


@app.post("/api/reminders")
async def create_reminder_api(payload: dict = Body(...)):
    """Creates a new reminder in SQLite and broadcasts to all clients."""
    user_id = payload.get("user_id", "mahi")
    reminder = database.create_reminder(user_id, payload)
    
    await realtime_manager.broadcast({
        "type": "REMINDER_CREATED",
        "user_id": user_id,
        "data": reminder,
    })
    
    return JSONResponse(content={"success": True, "reminder": reminder})


@app.post("/api/reminders/toggle")
async def toggle_reminder_api(payload: dict = Body(...)):
    """Toggles completion state of a reminder in SQLite."""
    reminder_id = payload.get("id")
    completed = payload.get("completed", True)
    user_id = payload.get("user_id", "mahi")
    updated = database.toggle_reminder(reminder_id, completed, user_id=user_id)
    
    await realtime_manager.broadcast({
        "type": "REMINDER_TOGGLED",
        "user_id": user_id,
        "data": updated,
    })
    
    return JSONResponse(content={"success": True, "reminder": updated})


@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder_api(reminder_id: str, user_id: str = "mahi"):
    """Deletes a reminder from SQLite."""
    deleted = database.delete_reminder(reminder_id, user_id=user_id)
    if deleted:
        await realtime_manager.broadcast({
            "type": "REMINDER_DELETED",
            "user_id": user_id,
            "reminder_id": reminder_id,
        })
    return JSONResponse(content={"success": deleted})


# ══════════════════════════════════════════════════════════════════════════════
# SOS EMERGENCY & CAREGIVER ALERTS (REAL-TIME SQLITE PERSISTED)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/alerts/sos")
async def trigger_sos_alert(payload: dict = Body(...)):
    """Logs an emergency SOS panic event and broadcasts to all connected clients."""
    user_id = payload.get("user_id", "mahi")
    title = payload.get("title", "Emergency SOS Triggered")
    message = payload.get("message", "Immediate assistance requested by senior.")
    alert_id = database.create_caregiver_alert("sos", title, message, severity="high", user_id=user_id)
    logger.warning("Emergency SOS Alert created #%d for user %s", alert_id, user_id)
    
    await realtime_manager.broadcast({
        "type": "SOS_ALERT",
        "user_id": user_id,
        "data": {
            "alert_id": alert_id,
            "title": title,
            "message": message,
            "severity": "high",
        }
    })
    
    return JSONResponse(content={"success": True, "alert_id": alert_id, "message": "Emergency SOS recorded and dispatched"})


@app.get("/api/alerts")
async def get_alerts_api(user_id: str = "mahi"):
    """Returns active caregiver alerts from SQLite."""
    alerts = database.get_active_alerts(user_id=user_id)
    return JSONResponse(content={"success": True, "alerts": alerts})


# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET REAL-TIME STREAMING ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/realtime")
async def websocket_realtime_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time bidirectional telemetry, wandering alerts,
    and instant status updates across Caregiver and Patient mobile apps.
    """
    await realtime_manager.connect(websocket)
    try:
        while True:
            # Keep-alive heartbeat & incoming message handling
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Client ping/heartbeat
                if msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        realtime_manager.disconnect(websocket)
    except Exception as e:
        logger.error("[WS] Unexpected error: %s", e)
        realtime_manager.disconnect(websocket)



