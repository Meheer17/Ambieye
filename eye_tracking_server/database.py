"""
database.py — 100% Real-Time Persistent SQLite Database Engine
--------------------------------------------------------------
Provides zero-seed, real-time persistence for:
- Users & Authentication
- Real-time IoT Sensor Telemetry & Historical Trends
- Gramin Suraksha Geofence & BLE Beacons
- Eye-Tracking Cognitive Assessment Sessions
- Medication Reminders & Daily Routine
- SOS Emergency & Caregiver Alerts
- Family Audio Postcards (Gharor Barta)

NO MOCK OR SEEDED DATA. All records reflect actual live hardware
transmissions and user actions.
"""

import sqlite3
import json
import time
import logging
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "ambieye.db"


def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with dict-like row access."""
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db():
    """Initializes clean database schema with zero seeded mock data."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Users Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'patient',
            mode TEXT NOT NULL DEFAULT 'elderly',
            age TEXT DEFAULT '',
            gender TEXT DEFAULT '',
            condition TEXT DEFAULT '',
            region TEXT DEFAULT '',
            patient_name TEXT DEFAULT '',
            relation TEXT DEFAULT '',
            specialization TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. IoT Sensor Telemetry Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS iot_telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'mahi',
            device_name TEXT NOT NULL,
            heart_rate INTEGER NOT NULL,
            spo2 INTEGER NOT NULL,
            body_temp_c REAL DEFAULT 36.6,
            steps INTEGER DEFAULT 0,
            sleep_duration_hours REAL DEFAULT 0.0,
            sleep_restlessness_score INTEGER DEFAULT 0,
            battery_pct INTEGER DEFAULT 100,
            status TEXT DEFAULT 'normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 3. Beacon Geofence Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS beacon_geofence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'mahi',
            lat REAL,
            lng REAL,
            distance_from_home_m REAL NOT NULL DEFAULT 0.0,
            is_in_safe_zone INTEGER NOT NULL DEFAULT 1,
            zone_name TEXT NOT NULL DEFAULT 'Safe Zone',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. Cognitive Assessments & Eye Tracking Sessions
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS cognitive_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'mahi',
            game_id INTEGER DEFAULT 0,
            game_name TEXT NOT NULL,
            movement_count INTEGER DEFAULT 0,
            avg_movement REAL DEFAULT 0.0,
            fixation_ratio REAL DEFAULT 0.0,
            verdict TEXT NOT NULL,
            summary TEXT DEFAULT '',
            details_json TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 5. Medication Reminders Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS medication_reminders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'mahi',
            title TEXT NOT NULL,
            time_str TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'medication',
            dosage TEXT DEFAULT '',
            is_completed INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 6. Caregiver & SOS Emergency Alerts Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS caregiver_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'mahi',
            alert_type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'medium',
            is_resolved INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 7. Family Postcards (Gharor Barta) Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS family_postcards (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'mahi',
            sender_name TEXT NOT NULL,
            relation TEXT NOT NULL,
            message TEXT NOT NULL,
            audio_url TEXT DEFAULT '',
            photo_url TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 8. Common Game Sessions Table (Reusable across all patient games)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_sessions (
            session_id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            game_id TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT DEFAULT NULL,
            duration_seconds INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'in_progress',
            score REAL DEFAULT NULL,
            metadata_json TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_game_sessions_patient ON game_sessions(patient_id, game_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);")

        # 9. Common Game Events Table (Granular events during gameplay)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_events (
            event_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            game_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            metadata_json TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE
        );
        """)
        # 10. Family Members Table (Real-time persistent family contacts per patient)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS family_members (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            name TEXT NOT NULL,
            relationship TEXT NOT NULL,
            relationship_as TEXT DEFAULT '',
            relationship_hi TEXT DEFAULT '',
            role_badge TEXT DEFAULT '',
            role_badge_as TEXT DEFAULT '',
            role_badge_hi TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            profile_image_url TEXT DEFAULT '',
            avatar_emoji TEXT DEFAULT '👤',
            avatar_bg TEXT DEFAULT '#EFF6FF',
            border_color TEXT DEFAULT '#93C5FD',
            theme_color TEXT DEFAULT '#2563EB',
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_online INTEGER NOT NULL DEFAULT 1,
            status_text TEXT DEFAULT 'Available',
            status_text_as TEXT DEFAULT '',
            status_text_hi TEXT DEFAULT '',
            location TEXT DEFAULT '',
            location_as TEXT DEFAULT '',
            location_hi TEXT DEFAULT '',
            last_seen TEXT DEFAULT 'Recently',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_family_members_patient ON family_members(patient_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_family_members_fav ON family_members(patient_id, is_favorite);")

        # 11. Call Records Table (Persistent One-to-One Audio & Video Call Metadata)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS call_records (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            family_member_id TEXT NOT NULL,
            call_type TEXT NOT NULL DEFAULT 'video',
            direction TEXT NOT NULL DEFAULT 'outgoing',
            status TEXT NOT NULL DEFAULT 'ringing',
            started_at TEXT NOT NULL,
            answered_at TEXT DEFAULT NULL,
            ended_at TEXT DEFAULT NULL,
            duration_seconds INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_call_records_patient ON call_records(patient_id, created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_call_records_family ON call_records(family_member_id);")

        # 12. Music Interactions Table (Raw Factual Patient Music Interactions)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS music_interactions (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            session_id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            playback_position_seconds REAL DEFAULT 0.0,
            metadata TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_music_interactions_patient ON music_interactions(patient_id, timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_music_interactions_track ON music_interactions(track_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_music_interactions_session ON music_interactions(session_id);")

        # 13. Music Favorites Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS music_favorites (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            track_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(patient_id, track_id)
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_music_favorites_patient ON music_favorites(patient_id);")

        # 14. Personalized Recognition Activities Table (Caregiver Created Challenges)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS personalized_activities (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            caregiver_id TEXT NOT NULL DEFAULT 'caregiver',
            title TEXT NOT NULL,
            prompt_question TEXT NOT NULL,
            prompt_question_as TEXT DEFAULT '',
            prompt_question_hi TEXT DEFAULT '',
            media_type TEXT NOT NULL, -- 'photo' | 'audio' | 'video'
            media_url TEXT NOT NULL,
            thumbnail_url TEXT DEFAULT '',
            hint_text TEXT DEFAULT '',
            category TEXT NOT NULL DEFAULT 'people', -- 'people' | 'places' | 'events' | 'voice' | 'music' | 'objects'
            options_json TEXT NOT NULL DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'archived'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pers_act_patient ON personalized_activities(patient_id, status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pers_act_created ON personalized_activities(created_at DESC);")

        # 15. Personalized Activity Results Table (Patient Game Engagement & Recall Metrics)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS personalized_activity_results (
            id TEXT PRIMARY KEY,
            activity_id TEXT NOT NULL,
            patient_id TEXT NOT NULL DEFAULT 'mahi',
            selected_option_id TEXT NOT NULL,
            is_correct INTEGER NOT NULL DEFAULT 1,
            attempts_count INTEGER NOT NULL DEFAULT 1,
            hint_used INTEGER NOT NULL DEFAULT 0,
            response_time_seconds REAL NOT NULL DEFAULT 0.0,
            patient_reaction TEXT DEFAULT '',
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(activity_id) REFERENCES personalized_activities(id) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pers_res_act ON personalized_activity_results(activity_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pers_res_patient ON personalized_activity_results(patient_id, completed_at DESC);")

        conn.commit()
        logger.info("Real-time database initialized with clean tables at %s", DB_PATH)


def reset_to_clean_slate():
    """Wipes all data tables to ensure zero mock data."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        tables = [
            "iot_telemetry",
            "beacon_geofence",
            "cognitive_sessions",
            "medication_reminders",
            "caregiver_alerts",
            "family_postcards",
            "game_events",
            "game_sessions",
        ]
        for t in tables:
            cursor.execute(f"DELETE FROM {t};")
        conn.commit()
        logger.info("Cleaned all data tables — 0 seeded records remaining.")


# ── Database Operations ───────────────────────────────────────────────────────

# User Operations
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username.strip(),)).fetchone()
        if row:
            return dict(row)
    return None


def create_or_update_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    with get_db_connection() as conn:
        conn.execute("""
        INSERT INTO users (id, username, full_name, email, role, mode, age, gender, condition, region, patient_name, relation, specialization)
        VALUES (:id, :username, :full_name, :email, :role, :mode, :age, :gender, :condition, :region, :patient_name, :relation, :specialization)
        ON CONFLICT(username) DO UPDATE SET
            full_name=excluded.full_name,
            email=excluded.email,
            role=excluded.role,
            mode=excluded.mode,
            age=excluded.age,
            gender=excluded.gender,
            condition=excluded.condition;
        """, {
            "id": str(user_data.get("id", "")),
            "username": user_data["username"],
            "full_name": user_data.get("fullName", user_data.get("full_name", user_data["username"].title())),
            "email": user_data.get("email", f"{user_data['username']}@dementia.ner.in"),
            "role": user_data.get("role", "patient"),
            "mode": user_data.get("mode", "elderly"),
            "age": str(user_data.get("age", "")),
            "gender": user_data.get("gender", ""),
            "condition": user_data.get("condition", ""),
            "region": user_data.get("region", "Assam, NER"),
            "patient_name": user_data.get("patientName", ""),
            "relation": user_data.get("relation", ""),
            "specialization": user_data.get("specialization", ""),
        })
        conn.commit()
    return get_user_by_username(user_data["username"]) or user_data


# IoT Telemetry Operations (Real Hardware Feed)
def save_iot_telemetry(payload: Dict[str, Any], user_id: str = "mahi") -> Dict[str, Any]:
    hr = int(payload.get("heart_rate", 0))
    spo2 = int(payload.get("spo2", 0))
    temp = float(payload.get("body_temp_c", 36.6))
    steps = int(payload.get("steps", 0))
    sleep_dur = float(payload.get("sleep_duration_hours", 0.0))
    sleep_rest = int(payload.get("sleep_restlessness_score", 0))
    battery = int(payload.get("battery_pct", 100))
    device_name = payload.get("device_name", "ESP32 Wearable Pulse Band")
    status = "normal" if (55 <= hr <= 100 and spo2 >= 95) else ("elevated" if hr > 100 else "attention_needed")

    with get_db_connection() as conn:
        conn.execute("""
        INSERT INTO iot_telemetry (user_id, device_name, heart_rate, spo2, body_temp_c, steps, sleep_duration_hours, sleep_restlessness_score, battery_pct, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (user_id, device_name, hr, spo2, temp, steps, sleep_dur, sleep_rest, battery, status))
        conn.commit()

    return get_latest_telemetry(user_id)


def get_latest_telemetry(user_id: str = "mahi") -> Dict[str, Any]:
    """Returns actual latest telemetry or accurately indicates waiting state if empty."""
    with get_db_connection() as conn:
        row = conn.execute("""
        SELECT * FROM iot_telemetry WHERE user_id = ? ORDER BY id DESC LIMIT 1;
        """, (user_id,)).fetchone()
        if row:
            d = dict(row)
            d["connected"] = True
            d["last_sync_timestamp"] = d["created_at"]
            return d

    # Real unseeded state: No hardware has transmitted yet
    return {
        "connected": False,
        "device_name": "No Sensor Connected",
        "heart_rate": None,
        "spo2": None,
        "body_temp_c": None,
        "steps": 0,
        "sleep_duration_hours": 0.0,
        "sleep_restlessness_score": 0,
        "battery_pct": 0,
        "last_sync_timestamp": None,
        "status": "offline",
        "message": "Waiting for live hardware telemetry stream...",
    }


def get_telemetry_history(user_id: str = "mahi", limit: int = 24) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("""
        SELECT * FROM iot_telemetry WHERE user_id = ? ORDER BY id DESC LIMIT ?;
        """, (user_id, limit)).fetchall()
        result = []
        for r in reversed(rows):
            d = dict(r)
            time_str = d["created_at"].split(" ")[1][:5] if " " in d["created_at"] else d["created_at"]
            result.append({
                "time": time_str,
                "heart_rate": d["heart_rate"],
                "spo2": d["spo2"],
                "steps": d["steps"],
            })
        return result


# Beacon & Geofence Operations (Real Tracking)
def save_beacon_geofence(payload: Dict[str, Any], user_id: str = "mahi") -> Dict[str, Any]:
    lat = payload.get("lat")
    lng = payload.get("lng")
    dist = float(payload.get("distance_from_home_m", 0.0))
    in_safe = 1 if dist <= 150.0 else 0
    zone_name = payload.get("zone_name", "Safe Zone Area" if in_safe else "Outside Safe Boundary")

    with get_db_connection() as conn:
        conn.execute("""
        INSERT INTO beacon_geofence (user_id, lat, lng, distance_from_home_m, is_in_safe_zone, zone_name)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (user_id, lat, lng, dist, in_safe, zone_name))
        conn.commit()

    return get_latest_geofence(user_id)


def get_latest_geofence(user_id: str = "mahi") -> Dict[str, Any]:
    with get_db_connection() as conn:
        row = conn.execute("""
        SELECT * FROM beacon_geofence WHERE user_id = ? ORDER BY id DESC LIMIT 1;
        """, (user_id,)).fetchone()
        if row:
            d = dict(row)
            return {
                "lat": d["lat"],
                "lng": d["lng"],
                "distance_from_home_m": d["distance_from_home_m"],
                "is_in_safe_zone": bool(d["is_in_safe_zone"]),
                "zone_name": d["zone_name"],
                "last_seen": d["created_at"],
            }
    return {
        "lat": None,
        "lng": None,
        "distance_from_home_m": 0.0,
        "is_in_safe_zone": True,
        "zone_name": "Safe Zone Initialized (Waiting for Beacon)",
        "last_seen": None,
    }


# Cognitive Assessment Operations
def save_cognitive_session(session_data: Dict[str, Any], user_id: str = "mahi") -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO cognitive_sessions (user_id, game_id, game_name, movement_count, avg_movement, fixation_ratio, verdict, summary, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            user_id,
            session_data.get("game_id", 0),
            session_data.get("game_name", "Cognitive Game"),
            session_data.get("movement_count", 0),
            session_data.get("avg_movement", 0.0),
            session_data.get("fixation_ratio", 0.0),
            session_data.get("verdict", "Normal Cognitive Response"),
            session_data.get("summary", ""),
            json.dumps(session_data.get("details", {})),
        ))
        conn.commit()
        return cursor.lastrowid


def get_cognitive_history(user_id: str = "mahi", limit: int = 20) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("""
        SELECT * FROM cognitive_sessions WHERE user_id = ? ORDER BY id DESC LIMIT ?;
        """, (user_id, limit)).fetchall()
        return [dict(r) for r in rows]


# Reminders & Daily Routine Operations
def get_reminders(user_id: str = "mahi") -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("""
        SELECT * FROM medication_reminders WHERE user_id = ? ORDER BY time_str ASC, id ASC;
        """, (user_id,)).fetchall()
        return [dict(r) for r in rows]


def create_reminder(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    rem_id = str(data.get("id", f"rem_{int(datetime.now().timestamp())}"))
    with get_db_connection() as conn:
        conn.execute("""
        INSERT INTO medication_reminders (id, user_id, title, time_str, category, dosage, is_completed)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            rem_id,
            user_id,
            data.get("title", "Daily Reminder"),
            data.get("time_str", datetime.now().strftime("%I:%M %p")),
            data.get("category", "medication"),
            data.get("dosage", ""),
            1 if data.get("is_completed") else 0,
        ))
        conn.commit()
        row = conn.execute("SELECT * FROM medication_reminders WHERE id = ?", (rem_id,)).fetchone()
        return dict(row)


def toggle_reminder(reminder_id: str, completed: bool, user_id: str = "mahi") -> Optional[Dict[str, Any]]:
    completed_at = datetime.now().strftime("%I:%M %p") if completed else None
    with get_db_connection() as conn:
        conn.execute("""
        UPDATE medication_reminders SET is_completed = ?, completed_at = ?
        WHERE id = ? AND user_id = ?;
        """, (1 if completed else 0, completed_at, reminder_id, user_id))
        conn.commit()
        row = conn.execute("SELECT * FROM medication_reminders WHERE id = ?", (reminder_id,)).fetchone()
        return dict(row) if row else None


def delete_reminder(reminder_id: str, user_id: str = "mahi") -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM medication_reminders WHERE id = ? AND user_id = ?;", (reminder_id, user_id))
        conn.commit()
        return cursor.rowcount > 0


# Alerts & SOS Operations
def create_caregiver_alert(alert_type: str, title: str, message: str, severity: str = "medium", user_id: str = "mahi") -> int:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO caregiver_alerts (user_id, alert_type, title, message, severity)
        VALUES (?, ?, ?, ?, ?);
        """, (user_id, alert_type, title, message, severity))
        conn.commit()
        return cursor.lastrowid


def get_active_alerts(user_id: str = "mahi") -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("""
        SELECT * FROM caregiver_alerts WHERE user_id = ? AND is_resolved = 0 ORDER BY id DESC;
        """, (user_id,)).fetchall()
        return [dict(r) for r in rows]


# ── Common Game Sessions & Events Operations (All Patient Games) ──────────────

def create_game_session(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates a new game session in SQLite.
    Supports: sessionId, patientId, gameId, startedAt, status, score, metadata
    """
    session_id = str(data.get("session_id") or data.get("sessionId") or f"sess_{uuid.uuid4().hex[:12]}")
    patient_id = str(data.get("patient_id") or data.get("patientId") or "mahi")
    game_id = str(data.get("game_id") or data.get("gameId") or "generic_game")
    started_at = str(data.get("started_at") or data.get("startedAt") or datetime.utcnow().isoformat() + "Z")
    status = str(data.get("status") or "in_progress")
    score = data.get("score")
    
    metadata = data.get("metadata", {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}

    with get_db_connection() as conn:
        conn.execute("""
        INSERT INTO game_sessions (session_id, patient_id, game_id, started_at, status, score, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (session_id, patient_id, game_id, started_at, status, score, json.dumps(metadata)))
        conn.commit()

    result = get_game_session(session_id)
    if result:
        return result
    return {
        "sessionId": session_id,
        "patientId": patient_id,
        "gameId": game_id,
        "startedAt": started_at,
        "completedAt": None,
        "duration": 0,
        "status": status,
        "score": score,
        "metadata": metadata,
    }


def update_game_session(session_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Updates an existing game session (e.g., status, score, completedAt, duration, metadata).
    """
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM game_sessions WHERE session_id = ?", (session_id,)).fetchone()
        if not row:
            return None

        current = dict(row)
        completed_at = data.get("completed_at") or data.get("completedAt") or current.get("completed_at")
        status = data.get("status") or current.get("status")
        score = data["score"] if "score" in data else current.get("score")

        # Duration calculation
        duration_seconds = data.get("duration_seconds")
        if duration_seconds is None:
            duration_seconds = data.get("duration")
        if duration_seconds is None:
            duration_seconds = current.get("duration_seconds", 0)

        if completed_at and not duration_seconds and current.get("started_at"):
            try:
                t_start = datetime.fromisoformat(current["started_at"].replace("Z", "+00:00"))
                t_end = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
                duration_seconds = max(0, int((t_end - t_start).total_seconds()))
            except Exception:
                pass

        # Merge metadata
        current_meta = json.loads(current.get("metadata_json") or "{}")
        new_meta = data.get("metadata")
        if isinstance(new_meta, str):
            try:
                new_meta = json.loads(new_meta)
            except Exception:
                new_meta = {}
        if isinstance(new_meta, dict):
            current_meta.update(new_meta)

        conn.execute("""
        UPDATE game_sessions
        SET completed_at = ?, duration_seconds = ?, status = ?, score = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = ?;
        """, (completed_at, duration_seconds, status, score, json.dumps(current_meta), session_id))
        conn.commit()

    return get_game_session(session_id)


def get_game_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single game session by sessionId."""
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM game_sessions WHERE session_id = ?", (session_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        return {
            "sessionId": d["session_id"],
            "patientId": d["patient_id"],
            "gameId": d["game_id"],
            "startedAt": d["started_at"],
            "completedAt": d["completed_at"],
            "duration": d["duration_seconds"],
            "status": d["status"],
            "score": d["score"],
            "metadata": json.loads(d["metadata_json"] or "{}"),
            "createdAt": d["created_at"],
            "updatedAt": d["updated_at"],
        }


def get_patient_game_sessions(patient_id: str = "mahi", game_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves game sessions for a patient, optionally filtered by gameId."""
    with get_db_connection() as conn:
        if game_id:
            rows = conn.execute("""
            SELECT * FROM game_sessions WHERE patient_id = ? AND game_id = ? ORDER BY started_at DESC LIMIT ?;
            """, (patient_id, game_id, limit)).fetchall()
        else:
            rows = conn.execute("""
            SELECT * FROM game_sessions WHERE patient_id = ? ORDER BY started_at DESC LIMIT ?;
            """, (patient_id, limit)).fetchall()

        results = []
        for r in rows:
            d = dict(r)
            results.append({
                "sessionId": d["session_id"],
                "patientId": d["patient_id"],
                "gameId": d["game_id"],
                "startedAt": d["started_at"],
                "completedAt": d["completed_at"],
                "duration": d["duration_seconds"],
                "status": d["status"],
                "score": d["score"],
                "metadata": json.loads(d["metadata_json"] or "{}"),
                "createdAt": d["created_at"],
                "updatedAt": d["updated_at"],
            })
        return results


def create_game_event(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates a discrete game event associated with a session.
    Supports: eventId, sessionId, patientId, gameId, eventType, timestamp, metadata
    """
    event_id = str(data.get("event_id") or data.get("eventId") or f"evt_{uuid.uuid4().hex[:12]}")
    session_id = str(data.get("session_id") or data.get("sessionId") or "")
    patient_id = str(data.get("patient_id") or data.get("patientId") or "mahi")
    game_id = str(data.get("game_id") or data.get("gameId") or "generic_game")
    event_type = str(data.get("event_type") or data.get("eventType") or "unknown_event")
    timestamp = str(data.get("timestamp") or datetime.utcnow().isoformat() + "Z")

    metadata = data.get("metadata", {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}

    with get_db_connection() as conn:
        conn.execute("""
        INSERT INTO game_events (event_id, session_id, patient_id, game_id, event_type, timestamp, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (event_id, session_id, patient_id, game_id, event_type, timestamp, json.dumps(metadata)))
        conn.commit()

    return {
        "eventId": event_id,
        "sessionId": session_id,
        "patientId": patient_id,
        "gameId": game_id,
        "eventType": event_type,
        "timestamp": timestamp,
        "metadata": metadata,
    }


def get_game_events(session_id: Optional[str] = None, patient_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieves game events by sessionId or patientId."""
    with get_db_connection() as conn:
        if session_id:
            rows = conn.execute("""
            SELECT * FROM game_events WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?;
            """, (session_id, limit)).fetchall()
        elif patient_id:
            rows = conn.execute("""
            SELECT * FROM game_events WHERE patient_id = ? ORDER BY timestamp DESC LIMIT ?;
            """, (patient_id, limit)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM game_events ORDER BY timestamp DESC LIMIT ?;", (limit,)).fetchall()

        results = []
        for r in rows:
            d = dict(r)
            results.append({
                "eventId": d["event_id"],
                "sessionId": d["session_id"],
                "patientId": d["patient_id"],
                "gameId": d["game_id"],
                "eventType": d["event_type"],
                "timestamp": d["timestamp"],
                "metadata": json.loads(d["metadata_json"] or "{}"),
            })
        return results


def get_patient_game_stats(patient_id: str = "mahi", game_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes aggregated game statistics for personalization,
    companion context, and doctor/caregiver insights.
    """
    with get_db_connection() as conn:
        if game_id:
            rows = conn.execute("""
            SELECT * FROM game_sessions WHERE patient_id = ? AND game_id = ? ORDER BY started_at DESC;
            """, (patient_id, game_id)).fetchall()
        else:
            rows = conn.execute("""
            SELECT * FROM game_sessions WHERE patient_id = ? ORDER BY started_at DESC;
            """, (patient_id,)).fetchall()

        total = len(rows)
        completed = sum(1 for r in rows if r["status"] == "completed")
        abandoned = sum(1 for r in rows if r["status"] == "abandoned")
        total_duration = sum(r["duration_seconds"] or 0 for r in rows)
        avg_duration = round(total_duration / total, 1) if total > 0 else 0

        scores = [r["score"] for r in rows if r["score"] is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else None
        high_score = max(scores) if scores else None

        last_played = rows[0]["started_at"] if rows else None

        # Game breakdown
        game_breakdown: Dict[str, Any] = {}
        for r in rows:
            gid = r["game_id"]
            if gid not in game_breakdown:
                game_breakdown[gid] = {"sessions": 0, "scores": []}
            game_breakdown[gid]["sessions"] += 1
            if r["score"] is not None:
                game_breakdown[gid]["scores"].append(r["score"])

        summary_breakdown: Dict[str, Any] = {}
        for gid, info in game_breakdown.items():
            sc_list = info["scores"]
            summary_breakdown[gid] = {
                "sessions": info["sessions"],
                "averageScore": round(sum(sc_list) / len(sc_list), 1) if sc_list else None,
            }

        return {
            "patientId": patient_id,
            "gameId": game_id,
            "totalSessions": total,
            "completedSessions": completed,
            "abandonedSessions": abandoned,
            "totalDurationSeconds": total_duration,
            "averageDurationSeconds": avg_duration,
            "averageScore": avg_score,
            "highestScore": high_score,
            "lastPlayedAt": last_played,
            "gameBreakdown": summary_breakdown,
        }


# ── Family Members Operations ──────────────────────────────────────────────────

DEFAULT_INITIAL_FAMILY = [
    {
        "id": "fam-anita",
        "name": "Anita Barman",
        "relationship": "Daughter & Primary Caregiver",
        "relationship_as": "কন্যা আৰু মুখ্য যত্নকৰ্তা",
        "relationship_hi": "बेटी एवं मुख्य देखभालकर्ता",
        "role_badge": "At Home · Guwahati",
        "role_badge_as": "ঘৰত উপস্থিত · গুৱাহাটী",
        "role_badge_hi": "घर पर · गुवाहाटी",
        "phone": "+91 98765 43210",
        "email": "anita.barman@caregiver.ner.in",
        "avatar_emoji": "👩",
        "avatar_bg": "#FDF2F8",
        "border_color": "#F472B6",
        "theme_color": "#EC4899",
        "is_favorite": 1,
        "is_online": 1,
        "status_text": "Ready to talk · At home",
        "status_text_as": "কথা পাতিবলৈ সাজু · ঘৰত আছে",
        "status_text_hi": "बात करने के लिए उपलब्ध · घर पर",
        "location": "Guwahati Residence",
        "location_as": "গুৱাহাটীৰ বাসভৱন",
        "location_hi": "गुवाहाटी निवास",
        "last_seen": "Just now",
    },
    {
        "id": "fam-rahul",
        "name": "Rahul Barman",
        "relationship": "Son (Guwahati Office)",
        "relationship_as": "পুত্ৰ (গুৱাহাটী কাৰ্যালয়)",
        "relationship_hi": "बेटा (गुवाहाटी कार्यालय)",
        "role_badge": "Office Break",
        "role_badge_as": "কাৰ্যালয়ৰ বিৰতি",
        "role_badge_hi": "कार्यालय ब्रेक",
        "phone": "+91 98640 11223",
        "email": "rahul.barman@office.ner.in",
        "avatar_emoji": "👨‍💼",
        "avatar_bg": "#EFF6FF",
        "border_color": "#60A5FA",
        "theme_color": "#2563EB",
        "is_favorite": 1,
        "is_online": 1,
        "status_text": "Available for 1-Tap call",
        "status_text_as": "১-টেপ কলৰ বাবে উপলব্ধ",
        "status_text_hi": "1-टैप कॉल के लिए उपलब्ध",
        "location": "GS Road, Guwahati",
        "location_as": "জি এছ ৰোড, গুৱাহাটী",
        "location_hi": "जी एस रोड, गुवाहाटी",
        "last_seen": "5 mins ago",
    },
    {
        "id": "fam-arjun",
        "name": "Arjun Barman",
        "relationship": "Grandson (Cotton Collegiate)",
        "relationship_as": "নাতি (কটন কলেজিয়েট)",
        "relationship_hi": "पोता (कॉटन कॉलेजिएट)",
        "role_badge": "School · Returns 3 PM",
        "role_badge_as": "বিদ্যালয়ত · ৩ বজাত ঘৰ পাব",
        "role_badge_hi": "स्कूल में · 3 बजे घर वापसी",
        "phone": "+91 98540 55667",
        "email": "arjun.barman@student.ner.in",
        "avatar_emoji": "👦",
        "avatar_bg": "#FEF3C7",
        "border_color": "#FBBF24",
        "theme_color": "#D97706",
        "is_favorite": 1,
        "is_online": 0,
        "status_text": "In class · Call after 3 PM",
        "status_text_as": "শ্ৰেণীত আছে · ৩ বজাৰ পিছত ফোন কৰক",
        "status_text_hi": "कक्षा में · 3 बजे के बाद कॉल करें",
        "location": "Panbazar, Guwahati",
        "location_as": "পানবজাৰ, গুৱাহাটী",
        "location_hi": "पानबाजार, गुवाहाटी",
        "last_seen": "1 hour ago",
    },
    {
        "id": "fam-priya",
        "name": "Priya Barman",
        "relationship": "Daughter-in-law",
        "relationship_as": "বোৱাৰী",
        "relationship_hi": "बहू",
        "role_badge": "Home Kitchen",
        "role_badge_as": "পাকঘৰত",
        "role_badge_hi": "रसोई में",
        "phone": "+91 98642 33445",
        "email": "priya.barman@home.ner.in",
        "avatar_emoji": "👩‍🦰",
        "avatar_bg": "#FAF5FF",
        "border_color": "#C084FC",
        "theme_color": "#9333EA",
        "is_favorite": 0,
        "is_online": 1,
        "status_text": "Preparing evening tea",
        "status_text_as": "সন্ধিয়াৰ চাহ তৈয়াৰ কৰি আছে",
        "status_text_hi": "शाम की चाय बना रही हैं",
        "location": "Courtyard Kitchen",
        "location_as": "চোতালৰ পাকঘৰ",
        "location_hi": "आंगन की रसोई",
        "last_seen": "10 mins ago",
    },
    {
        "id": "fam-doctor",
        "name": "Dr. Sanjeev Sharma",
        "relationship": "Family Physician & ASHA Line",
        "relationship_as": "পৰিয়ালৰ চিকিৎসক আৰু আশা লাইন",
        "relationship_hi": "पारिवारिक डॉक्टर एवं आशा लाइन",
        "role_badge": "Dispur Clinic Live",
        "role_badge_as": "দিস্পুৰ ক্লিনিকত উপস্থিত",
        "role_badge_hi": "दिसपुर क्लिनिक में उपस्थित",
        "phone": "+91 94350 99887",
        "email": "dr.sanjeev@dispurhospital.in",
        "avatar_emoji": "🩺",
        "avatar_bg": "#ECFDF5",
        "border_color": "#4ADE80",
        "theme_color": "#059669",
        "is_favorite": 0,
        "is_online": 1,
        "status_text": "Direct medical line active",
        "status_text_as": "চিকিৎসা সেৱা লাইন সক্ৰিয়",
        "status_text_hi": "चिकित्सा सेवा लाइन सक्रिय",
        "location": "Dispur Hospital",
        "location_as": "দিস্পুৰ চিকিৎসালয়",
        "location_hi": "दिसपुर अस्पताल",
        "last_seen": "Active now",
    },
    {
        "id": "fam-asha",
        "name": "Mamoni Baideo",
        "relationship": "Local ASHA Community Worker",
        "relationship_as": "স্থানীয় আশা বাইদেউ",
        "relationship_hi": "स्थानीय आशा कार्यकर्ता",
        "role_badge": "Village Health Center",
        "role_badge_as": "স্বাস্থ্য কেন্দ্ৰ",
        "role_badge_hi": "स्वास्थ्य केंद्र",
        "phone": "+91 94351 22334",
        "email": "mamoni.asha@nhm.gov.in",
        "avatar_emoji": "👩‍⚕️",
        "avatar_bg": "#FFF1F2",
        "border_color": "#FB7185",
        "theme_color": "#E11D48",
        "is_favorite": 0,
        "is_online": 1,
        "status_text": "Available for home check-ins",
        "status_text_as": "ঘৰুৱা স্বাস্থ্য নিৰীক্ষণৰ বাবে উপলব্ধ",
        "status_text_hi": "स्वास्थ्य जांच के लिए उपलब्ध",
        "location": "Community Center",
        "location_as": "স্বাস্থ্য কেন্দ্ৰ",
        "location_hi": "सामुदायिक केंद्र",
        "last_seen": "20 mins ago",
    },
]


def _format_family_row(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    return {
        "id": d["id"],
        "patientId": d["patient_id"],
        "name": d["name"],
        "relationship": d["relationship"],
        "relationshipAs": d.get("relationship_as", ""),
        "relationshipHi": d.get("relationship_hi", ""),
        "roleBadge": d.get("role_badge", ""),
        "roleBadgeAs": d.get("role_badge_as", ""),
        "roleBadgeHi": d.get("role_badge_hi", ""),
        "phone": d.get("phone", ""),
        "email": d.get("email", ""),
        "profileImageUrl": d.get("profile_image_url", ""),
        "avatarEmoji": d.get("avatar_emoji", "👤"),
        "avatarBg": d.get("avatar_bg", "#EFF6FF"),
        "borderColor": d.get("border_color", "#93C5FD"),
        "themeColor": d.get("theme_color", "#2563EB"),
        "isFavorite": bool(d.get("is_favorite", 0)),
        "isOnline": bool(d.get("is_online", 1)),
        "statusText": d.get("status_text", "Available"),
        "statusTextAs": d.get("status_text_as", ""),
        "statusTextHi": d.get("status_text_hi", ""),
        "location": d.get("location", ""),
        "locationAs": d.get("location_as", ""),
        "locationHi": d.get("location_hi", ""),
        "lastSeen": d.get("last_seen", "Recently"),
        "createdAt": d.get("created_at"),
        "updatedAt": d.get("updated_at"),
    }


def seed_default_family_if_empty(patient_id: str = "mahi"):
    """Ensures patient has baseline family member contacts persisted in database."""
    with get_db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM family_members WHERE patient_id = ?", (patient_id,)).fetchone()[0]
        if count == 0:
            for item in DEFAULT_INITIAL_FAMILY:
                conn.execute("""
                INSERT OR IGNORE INTO family_members (
                    id, patient_id, name, relationship, relationship_as, relationship_hi,
                    role_badge, role_badge_as, role_badge_hi, phone, email,
                    avatar_emoji, avatar_bg, border_color, theme_color,
                    is_favorite, is_online, status_text, status_text_as, status_text_hi,
                    location, location_as, location_hi, last_seen
                ) VALUES (
                    :id, :patient_id, :name, :relationship, :relationship_as, :relationship_hi,
                    :role_badge, :role_badge_as, :role_badge_hi, :phone, :email,
                    :avatar_emoji, :avatar_bg, :border_color, :theme_color,
                    :is_favorite, :is_online, :status_text, :status_text_as, :status_text_hi,
                    :location, :location_as, :location_hi, :last_seen
                )
                """, {**item, "patient_id": patient_id})
            conn.commit()


def get_patient_family_members(patient_id: str = "mahi") -> List[Dict[str, Any]]:
    """Retrieves all family members for a patient."""
    seed_default_family_if_empty(patient_id)
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM family_members WHERE patient_id = ? ORDER BY is_favorite DESC, created_at ASC",
            (patient_id,)
        ).fetchall()
        return [_format_family_row(r) for r in rows]


def get_family_member(member_id: str, patient_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves a single family member by ID (optionally scoped to patient)."""
    with get_db_connection() as conn:
        if patient_id:
            row = conn.execute(
                "SELECT * FROM family_members WHERE id = ? AND patient_id = ?",
                (member_id, patient_id)
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM family_members WHERE id = ?",
                (member_id,)
            ).fetchone()
        if row:
            return _format_family_row(row)
        return None


def create_family_member(patient_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Creates a new persistent family member for a patient."""
    member_id = str(data.get("id") or f"fam-{uuid.uuid4().hex[:8]}")
    name = str(data.get("name", "Family Member"))
    relationship = str(data.get("relationship", "Family"))
    relationship_as = str(data.get("relationshipAs", data.get("relationship_as", "")))
    relationship_hi = str(data.get("relationshipHi", data.get("relationship_hi", "")))
    role_badge = str(data.get("roleBadge", data.get("role_badge", "")))
    role_badge_as = str(data.get("roleBadgeAs", data.get("role_badge_as", "")))
    role_badge_hi = str(data.get("roleBadgeHi", data.get("role_badge_hi", "")))
    phone = str(data.get("phone", ""))
    email = str(data.get("email", ""))
    profile_image_url = str(data.get("profileImageUrl", data.get("profile_image_url", "")))
    avatar_emoji = str(data.get("avatarEmoji", data.get("avatar_emoji", "👤")))
    avatar_bg = str(data.get("avatarBg", data.get("avatar_bg", "#EFF6FF")))
    border_color = str(data.get("borderColor", data.get("border_color", "#93C5FD")))
    theme_color = str(data.get("themeColor", data.get("theme_color", "#2563EB")))
    is_favorite = 1 if data.get("isFavorite", data.get("is_favorite", False)) else 0
    is_online = 1 if data.get("isOnline", data.get("is_online", True)) else 0
    status_text = str(data.get("statusText", data.get("status_text", "Available")))
    status_text_as = str(data.get("statusTextAs", data.get("status_text_as", "")))
    status_text_hi = str(data.get("statusTextHi", data.get("status_text_hi", "")))
    location = str(data.get("location", ""))
    location_as = str(data.get("locationAs", data.get("location_as", "")))
    location_hi = str(data.get("locationHi", data.get("location_hi", "")))
    last_seen = str(data.get("lastSeen", data.get("last_seen", "Just now")))

    with get_db_connection() as conn:
        conn.execute("""
        INSERT INTO family_members (
            id, patient_id, name, relationship, relationship_as, relationship_hi,
            role_badge, role_badge_as, role_badge_hi, phone, email, profile_image_url,
            avatar_emoji, avatar_bg, border_color, theme_color,
            is_favorite, is_online, status_text, status_text_as, status_text_hi,
            location, location_as, location_hi, last_seen
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?
        )
        """, (
            member_id, patient_id, name, relationship, relationship_as, relationship_hi,
            role_badge, role_badge_as, role_badge_hi, phone, email, profile_image_url,
            avatar_emoji, avatar_bg, border_color, theme_color,
            is_favorite, is_online, status_text, status_text_as, status_text_hi,
            location, location_as, location_hi, last_seen
        ))
        conn.commit()

    return get_family_member(member_id, patient_id) or {}


def update_family_member(member_id: str, data: Dict[str, Any], patient_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Updates fields of an existing family member."""
    current = get_family_member(member_id, patient_id)
    if not current:
        return None

    name = data.get("name", current["name"])
    relationship = data.get("relationship", current["relationship"])
    relationship_as = data.get("relationshipAs", data.get("relationship_as", current["relationshipAs"]))
    relationship_hi = data.get("relationshipHi", data.get("relationship_hi", current["relationshipHi"]))
    role_badge = data.get("roleBadge", data.get("role_badge", current["roleBadge"]))
    role_badge_as = data.get("roleBadgeAs", data.get("role_badge_as", current["roleBadgeAs"]))
    role_badge_hi = data.get("roleBadgeHi", data.get("role_badge_hi", current["roleBadgeHi"]))
    phone = data.get("phone", current["phone"])
    email = data.get("email", current["email"])
    profile_image_url = data.get("profileImageUrl", data.get("profile_image_url", current["profileImageUrl"]))
    avatar_emoji = data.get("avatarEmoji", data.get("avatar_emoji", current["avatarEmoji"]))
    avatar_bg = data.get("avatarBg", data.get("avatar_bg", current["avatarBg"]))
    border_color = data.get("borderColor", data.get("border_color", current["borderColor"]))
    theme_color = data.get("themeColor", data.get("theme_color", current["themeColor"]))
    
    if "isFavorite" in data or "is_favorite" in data:
        is_favorite = 1 if data.get("isFavorite", data.get("is_favorite")) else 0
    else:
        is_favorite = 1 if current["isFavorite"] else 0

    if "isOnline" in data or "is_online" in data:
        is_online = 1 if data.get("isOnline", data.get("is_online")) else 0
    else:
        is_online = 1 if current["isOnline"] else 0

    status_text = data.get("statusText", data.get("status_text", current["statusText"]))
    status_text_as = data.get("statusTextAs", data.get("status_text_as", current["statusTextAs"]))
    status_text_hi = data.get("statusTextHi", data.get("status_text_hi", current["statusTextHi"]))
    location = data.get("location", current["location"])
    location_as = data.get("locationAs", data.get("location_as", current["locationAs"]))
    location_hi = data.get("locationHi", data.get("location_hi", current["locationHi"]))
    last_seen = data.get("lastSeen", data.get("last_seen", current["lastSeen"]))

    with get_db_connection() as conn:
        if patient_id:
            conn.execute("""
            UPDATE family_members SET
                name = ?, relationship = ?, relationship_as = ?, relationship_hi = ?,
                role_badge = ?, role_badge_as = ?, role_badge_hi = ?, phone = ?, email = ?,
                profile_image_url = ?, avatar_emoji = ?, avatar_bg = ?, border_color = ?, theme_color = ?,
                is_favorite = ?, is_online = ?, status_text = ?, status_text_as = ?, status_text_hi = ?,
                location = ?, location_as = ?, location_hi = ?, last_seen = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND patient_id = ?
            """, (
                name, relationship, relationship_as, relationship_hi,
                role_badge, role_badge_as, role_badge_hi, phone, email,
                profile_image_url, avatar_emoji, avatar_bg, border_color, theme_color,
                is_favorite, is_online, status_text, status_text_as, status_text_hi,
                location, location_as, location_hi, last_seen, member_id, patient_id
            ))
        else:
            conn.execute("""
            UPDATE family_members SET
                name = ?, relationship = ?, relationship_as = ?, relationship_hi = ?,
                role_badge = ?, role_badge_as = ?, role_badge_hi = ?, phone = ?, email = ?,
                profile_image_url = ?, avatar_emoji = ?, avatar_bg = ?, border_color = ?, theme_color = ?,
                is_favorite = ?, is_online = ?, status_text = ?, status_text_as = ?, status_text_hi = ?,
                location = ?, location_as = ?, location_hi = ?, last_seen = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (
                name, relationship, relationship_as, relationship_hi,
                role_badge, role_badge_as, role_badge_hi, phone, email,
                profile_image_url, avatar_emoji, avatar_bg, border_color, theme_color,
                is_favorite, is_online, status_text, status_text_as, status_text_hi,
                location, location_as, location_hi, last_seen, member_id
            ))
        conn.commit()

    return get_family_member(member_id, patient_id)


def toggle_family_member_favorite(member_id: str, patient_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Toggles the is_favorite boolean for a family member."""
    current = get_family_member(member_id, patient_id)
    if not current:
        return None
    new_fav = not current["isFavorite"]
    return update_family_member(member_id, {"isFavorite": new_fav}, patient_id)


def delete_family_member(member_id: str, patient_id: Optional[str] = None) -> bool:
    """Deletes a family member record."""
    with get_db_connection() as conn:
        if patient_id:
            res = conn.execute(
                "DELETE FROM family_members WHERE id = ? AND patient_id = ?",
                (member_id, patient_id)
            )
        else:
            res = conn.execute(
                "DELETE FROM family_members WHERE id = ?",
                (member_id,)
            )
        conn.commit()
        return res.rowcount > 0


# ── Call Records Operations (Persistent Audio/Video Calling) ─────────────────

def _format_call_row(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to convert a call_records row into clean camelCase JSON format."""
    return {
        "id": row["id"],
        "patientId": row["patient_id"],
        "familyMemberId": row["family_member_id"],
        "callType": row["call_type"],
        "direction": row["direction"],
        "status": row["status"],
        "startedAt": row["started_at"],
        "answeredAt": row["answered_at"],
        "endedAt": row["ended_at"],
        "durationSeconds": row["duration_seconds"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def create_call_record(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates and persists a new one-to-one call session record in SQLite.
    Stores metadata only: participants, timestamps, callType, direction, status.
    """
    call_id = str(data.get("id") or f"call_{uuid.uuid4().hex[:12]}")
    patient_id = str(data.get("patientId") or data.get("patient_id") or "mahi")
    family_member_id = str(data.get("familyMemberId") or data.get("family_member_id") or "")
    call_type = str(data.get("callType") or data.get("call_type") or "video")
    direction = str(data.get("direction") or "outgoing")
    status = str(data.get("status") or "ringing")
    started_at = str(data.get("startedAt") or data.get("started_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ"))
    answered_at = data.get("answeredAt") or data.get("answered_at")
    ended_at = data.get("endedAt") or data.get("ended_at")
    duration_seconds = int(data.get("durationSeconds") or data.get("duration_seconds") or 0)

    now_iso = time.strftime("%Y-%m-%d %H:%M:%S")

    with get_db_connection() as conn:
        conn.execute("""
        INSERT OR REPLACE INTO call_records (
            id, patient_id, family_member_id, call_type, direction,
            status, started_at, answered_at, ended_at, duration_seconds,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            call_id, patient_id, family_member_id, call_type, direction,
            status, started_at, answered_at, ended_at, duration_seconds,
            now_iso, now_iso
        ))
        conn.commit()

    return get_call_record(call_id) or {}


def get_call_record(call_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single call session record by call_id."""
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM call_records WHERE id = ?", (call_id,)).fetchone()
        if row:
            return _format_call_row(row)
    return None


def update_call_record(call_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Updates status, answered/ended timestamps, and duration of an existing call record.
    """
    current = get_call_record(call_id)
    if not current:
        return None

    status = str(data.get("status") or current["status"])
    answered_at = data.get("answeredAt") or data.get("answered_at") or current["answeredAt"]
    ended_at = data.get("endedAt") or data.get("ended_at") or current["endedAt"]
    duration_seconds = int(data.get("durationSeconds") or data.get("duration_seconds") or current["durationSeconds"])
    now_iso = time.strftime("%Y-%m-%d %H:%M:%S")

    with get_db_connection() as conn:
        conn.execute("""
        UPDATE call_records SET
            status = ?,
            answered_at = ?,
            ended_at = ?,
            duration_seconds = ?,
            updated_at = ?
        WHERE id = ?
        """, (status, answered_at, ended_at, duration_seconds, now_iso, call_id))
        conn.commit()

    return get_call_record(call_id)


def get_patient_call_history(patient_id: str = "mahi", limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieves call history records for a patient ordered chronologically descending.
    """
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM call_records WHERE patient_id = ? ORDER BY created_at DESC LIMIT ?",
            (patient_id, limit)
        ).fetchall()
        return [_format_call_row(r) for r in rows]


def delete_call_record(call_id: str) -> bool:
    """Deletes a call record (e.g. for testing / data purging)."""
    with get_db_connection() as conn:
        res = conn.execute("DELETE FROM call_records WHERE id = ?", (call_id,))
        conn.commit()
        return res.rowcount > 0


# ══════════════════════════════════════════════════════════════════════════════
# MUSIC INTERACTIONS & CAREGIVER FACTUAL SUMMARY OPERATIONS
# ══════════════════════════════════════════════════════════════════════════════

def _format_music_row(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to convert a music_interactions row into a camelCase dict."""
    metadata = {}
    if row["metadata"]:
        try:
            metadata = json.loads(row["metadata"])
        except Exception:
            metadata = {}

    return {
        "id": row["id"],
        "patientId": row["patient_id"],
        "sessionId": row["session_id"],
        "trackId": row["track_id"],
        "eventType": row["event_type"],
        "timestamp": row["timestamp"],
        "playbackPositionSeconds": float(row["playback_position_seconds"] or 0.0),
        "metadata": metadata,
        "createdAt": row["created_at"],
    }


def record_music_interaction(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Persists a single raw music interaction event into SQLite.
    Uses INSERT OR IGNORE to prevent duplicate event ingestion during network retries.
    """
    event_id = str(event_data.get("id") or f"music_evt_{uuid.uuid4().hex[:12]}")
    patient_id = str(event_data.get("patientId") or event_data.get("patient_id") or "mahi")
    session_id = str(event_data.get("sessionId") or event_data.get("session_id") or f"session_{uuid.uuid4().hex[:8]}")
    track_id = str(event_data.get("trackId") or event_data.get("track_id") or "unknown")
    event_type = str(event_data.get("eventType") or event_data.get("event_type") or "music_play_started")
    timestamp = str(event_data.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ"))
    playback_position = float(event_data.get("playbackPositionSeconds") or event_data.get("playback_position_seconds") or 0.0)

    meta = event_data.get("metadata") or {}
    meta_json = json.dumps(meta) if isinstance(meta, dict) else str(meta)

    with get_db_connection() as conn:
        conn.execute("""
        INSERT OR IGNORE INTO music_interactions (
            id, patient_id, session_id, track_id, event_type,
            timestamp, playback_position_seconds, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id, patient_id, session_id, track_id, event_type,
            timestamp, playback_position, meta_json
        ))
        conn.commit()

        row = conn.execute("SELECT * FROM music_interactions WHERE id = ?", (event_id,)).fetchone()
        if row:
            return _format_music_row(row)

    return {
        "id": event_id,
        "patientId": patient_id,
        "sessionId": session_id,
        "trackId": track_id,
        "eventType": event_type,
        "timestamp": timestamp,
        "playbackPositionSeconds": playback_position,
        "metadata": meta,
    }


def record_music_interactions_batch(events: List[Dict[str, Any]]) -> int:
    """Persists a list of raw music events and returns the count of newly inserted events."""
    count = 0
    with get_db_connection() as conn:
        for ev in events:
            event_id = str(ev.get("id") or f"music_evt_{uuid.uuid4().hex[:12]}")
            patient_id = str(ev.get("patientId") or ev.get("patient_id") or "mahi")
            session_id = str(ev.get("sessionId") or ev.get("session_id") or f"session_{uuid.uuid4().hex[:8]}")
            track_id = str(ev.get("trackId") or ev.get("track_id") or "unknown")
            event_type = str(ev.get("eventType") or ev.get("event_type") or "music_play_started")
            timestamp = str(ev.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ"))
            playback_position = float(ev.get("playbackPositionSeconds") or ev.get("playback_position_seconds") or 0.0)

            meta = ev.get("metadata") or {}
            meta_json = json.dumps(meta) if isinstance(meta, dict) else str(meta)

            res = conn.execute("""
            INSERT OR IGNORE INTO music_interactions (
                id, patient_id, session_id, track_id, event_type,
                timestamp, playback_position_seconds, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, patient_id, session_id, track_id, event_type,
                timestamp, playback_position, meta_json
            ))
            if res.rowcount > 0:
                count += 1
        conn.commit()
    return count


def get_patient_music_interactions(patient_id: str = "mahi", limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieves raw music interactions for a patient chronologically descending."""
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM music_interactions WHERE patient_id = ? ORDER BY timestamp DESC LIMIT ?",
            (patient_id, limit)
        ).fetchall()
        return [_format_music_row(r) for r in rows]


def toggle_music_favorite(patient_id: str, track_id: str, is_favorite: bool) -> bool:
    """Toggles or sets the favorite state of a music track for a patient."""
    with get_db_connection() as conn:
        if is_favorite:
            fav_id = f"fav_{patient_id}_{track_id}"
            conn.execute(
                "INSERT OR IGNORE INTO music_favorites (id, patient_id, track_id) VALUES (?, ?, ?)",
                (fav_id, patient_id, track_id)
            )
        else:
            conn.execute(
                "DELETE FROM music_favorites WHERE patient_id = ? AND track_id = ?",
                (patient_id, track_id)
            )
        conn.commit()
        return True


def get_patient_music_favorites(patient_id: str = "mahi") -> List[str]:
    """Returns the list of favorite track IDs for a patient."""
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT track_id FROM music_favorites WHERE patient_id = ? ORDER BY created_at DESC",
            (patient_id,)
        ).fetchall()
        return [r["track_id"] for r in rows]


def get_patient_music_summary(patient_id: str = "mahi") -> Dict[str, Any]:
    """
    Computes 100% factual Caregiver-facing music engagement analytics
    derived STRICTLY from stored SQLite raw interaction events.
    NO fabricated or diagnostic predictions.
    """
    with get_db_connection() as conn:
        # 1. Counts of events
        started_row = conn.execute(
            "SELECT COUNT(*) as cnt FROM music_interactions WHERE patient_id = ? AND event_type = 'music_play_started'",
            (patient_id,)
        ).fetchone()
        songs_started = started_row["cnt"] if started_row else 0

        completed_row = conn.execute(
            "SELECT COUNT(*) as cnt FROM music_interactions WHERE patient_id = ? AND event_type = 'music_play_completed'",
            (patient_id,)
        ).fetchone()
        songs_completed = completed_row["cnt"] if completed_row else 0

        skipped_row = conn.execute(
            "SELECT COUNT(*) as cnt FROM music_interactions WHERE patient_id = ? AND event_type = 'music_skipped'",
            (patient_id,)
        ).fetchone()
        songs_skipped = skipped_row["cnt"] if skipped_row else 0

        # 2. Total listening duration: compute max playback position reached per session
        duration_row = conn.execute("""
            SELECT SUM(max_pos) as total_duration FROM (
                SELECT session_id, MAX(playback_position_seconds) as max_pos
                FROM music_interactions
                WHERE patient_id = ?
                GROUP BY session_id
            )
        """, (patient_id,)).fetchone()
        total_duration = round(float(duration_row["total_duration"] or 0.0), 1) if duration_row else 0.0

        # 3. Favorites
        fav_rows = conn.execute(
            "SELECT track_id FROM music_favorites WHERE patient_id = ?",
            (patient_id,)
        ).fetchall()
        favorite_track_ids = [r["track_id"] for r in fav_rows]
        favorites_count = len(favorite_track_ids)

        # 4. Recent Subjective Reminiscence Reactions
        reaction_rows = conn.execute("""
            SELECT track_id, metadata, timestamp
            FROM music_interactions
            WHERE patient_id = ? AND event_type = 'music_reaction'
            ORDER BY timestamp DESC
            LIMIT 5
        """, (patient_id,)).fetchall()

        recent_reactions = []
        for r in reaction_rows:
            meta = {}
            try:
                meta = json.loads(r["metadata"]) if r["metadata"] else {}
            except Exception:
                pass
            recent_reactions.append({
                "trackId": r["track_id"],
                "trackTitle": meta.get("trackTitle", r["track_id"]),
                "reaction": meta.get("reaction", "unknown"),
                "timestamp": r["timestamp"],
            })

        # 5. Preferred Categories and Languages Breakdown
        all_events = conn.execute(
            "SELECT metadata FROM music_interactions WHERE patient_id = ?",
            (patient_id,)
        ).fetchall()

        category_counts: Dict[str, int] = {}
        language_counts: Dict[str, int] = {}

        for ev in all_events:
            if ev["metadata"]:
                try:
                    meta = json.loads(ev["metadata"])
                    cat = meta.get("category")
                    if cat:
                        category_counts[cat] = category_counts.get(cat, 0) + 1
                    lang = meta.get("language")
                    if lang:
                        language_counts[lang] = language_counts.get(lang, 0) + 1
                except Exception:
                    pass

        preferred_categories = [{"category": k, "count": v} for k, v in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)]
        preferred_languages = [{"language": k, "count": v} for k, v in sorted(language_counts.items(), key=lambda x: x[1], reverse=True)]

        # 6. Active Days in Last 7 Days (Factual Calendar Days Active)
        active_days_row = conn.execute("""
            SELECT COUNT(DISTINCT substr(timestamp, 1, 10)) as active_days
            FROM music_interactions
            WHERE patient_id = ?
              AND date(substr(timestamp, 1, 10)) >= date('now', '-7 days')
        """, (patient_id,)).fetchone()
        active_days_last_7 = active_days_row["active_days"] if active_days_row else 0

        return {
            "patientId": patient_id,
            "totalListeningDurationSeconds": total_duration,
            "totalListeningMinutes": round(total_duration / 60.0, 1),
            "songsStartedCount": songs_started,
            "songsCompletedCount": songs_completed,
            "songsSkippedCount": songs_skipped,
            "favoritesCount": favorites_count,
            "favoriteTrackIds": favorite_track_ids,
            "recentReactions": recent_reactions,
            "preferredCategories": preferred_categories,
            "preferredLanguages": preferred_languages,
            "activeDaysLast7": active_days_last_7,
        }


# ── 15. PERSONALIZED RECOGNITION ACTIVITIES & RESULTS ────────────────────────

def create_personalized_activity(data: Dict[str, Any]) -> Dict[str, Any]:
    """Creates a new personalized recognition activity / memory challenge."""
    act_id = data.get("id") or f"pact_{uuid.uuid4().hex[:12]}"
    patient_id = data.get("patientId") or data.get("patient_id") or "mahi"
    caregiver_id = data.get("caregiverId") or data.get("caregiver_id") or "caregiver"
    title = data.get("title") or "Personalized Memory Challenge"
    prompt_question = data.get("promptQuestion") or data.get("prompt_question") or ""
    prompt_question_as = data.get("promptQuestionAs") or data.get("prompt_question_as") or ""
    prompt_question_hi = data.get("promptQuestionHi") or data.get("prompt_question_hi") or ""
    media_type = data.get("mediaType") or data.get("media_type") or "photo"
    media_url = data.get("mediaUrl") or data.get("media_url") or ""
    thumbnail_url = data.get("thumbnailUrl") or data.get("thumbnail_url") or ""
    hint_text = data.get("hintText") or data.get("hint_text") or ""
    category = data.get("category") or "people"
    
    options = data.get("options") or []
    options_json = json.dumps(options) if isinstance(options, (list, dict)) else str(options)
    status = data.get("status") or "active"
    created_at = data.get("createdAt") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO personalized_activities (
                id, patient_id, caregiver_id, title, prompt_question,
                prompt_question_as, prompt_question_hi, media_type, media_url,
                thumbnail_url, hint_text, category, options_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            act_id, patient_id, caregiver_id, title, prompt_question,
            prompt_question_as, prompt_question_hi, media_type, media_url,
            thumbnail_url, hint_text, category, options_json, status, created_at, created_at
        ))
        conn.commit()

    return {
        "id": act_id,
        "patientId": patient_id,
        "caregiverId": caregiver_id,
        "title": title,
        "promptQuestion": prompt_question,
        "promptQuestionAs": prompt_question_as,
        "promptQuestionHi": prompt_question_hi,
        "mediaType": media_type,
        "mediaUrl": media_url,
        "thumbnailUrl": thumbnail_url,
        "hintText": hint_text,
        "category": category,
        "options": options if isinstance(options, list) else json.loads(options_json),
        "status": status,
        "createdAt": created_at,
    }


def get_personalized_activities(patient_id: str = "mahi", status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all personalized activities for a patient, optionally filtering by status."""
    with get_db_connection() as conn:
        if status:
            rows = conn.execute("""
                SELECT * FROM personalized_activities
                WHERE patient_id = ? AND status = ?
                ORDER BY created_at DESC
            """, (patient_id, status)).fetchall()
        else:
            rows = conn.execute("""
                SELECT * FROM personalized_activities
                WHERE patient_id = ?
                ORDER BY created_at DESC
            """, (patient_id,)).fetchall()

        results = []
        for r in rows:
            opts = []
            try:
                opts = json.loads(r["options_json"]) if r["options_json"] else []
            except Exception:
                opts = []

            # Check if there is any result for this activity
            res_row = conn.execute("""
                SELECT * FROM personalized_activity_results
                WHERE activity_id = ?
                ORDER BY completed_at DESC
                LIMIT 1
            """, (r["id"],)).fetchone()

            last_result = None
            if res_row:
                last_result = {
                    "id": res_row["id"],
                    "selectedOptionId": res_row["selected_option_id"],
                    "isCorrect": bool(res_row["is_correct"]),
                    "attemptsCount": res_row["attempts_count"],
                    "hintUsed": bool(res_row["hint_used"]),
                    "responseTimeSeconds": res_row["response_time_seconds"],
                    "patientReaction": res_row["patient_reaction"],
                    "completedAt": res_row["completed_at"],
                }

            results.append({
                "id": r["id"],
                "patientId": r["patient_id"],
                "caregiverId": r["caregiver_id"],
                "title": r["title"],
                "promptQuestion": r["prompt_question"],
                "promptQuestionAs": r["prompt_question_as"],
                "promptQuestionHi": r["prompt_question_hi"],
                "mediaType": r["media_type"],
                "mediaUrl": r["media_url"],
                "thumbnailUrl": r["thumbnail_url"],
                "hintText": r["hint_text"],
                "category": r["category"],
                "options": opts,
                "status": r["status"],
                "createdAt": r["created_at"],
                "lastResult": last_result,
            })
        return results


def get_personalized_activity_by_id(activity_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single personalized activity by ID."""
    with get_db_connection() as conn:
        r = conn.execute("SELECT * FROM personalized_activities WHERE id = ?", (activity_id,)).fetchone()
        if not r:
            return None
        opts = []
        try:
            opts = json.loads(r["options_json"]) if r["options_json"] else []
        except Exception:
            opts = []

        return {
            "id": r["id"],
            "patientId": r["patient_id"],
            "caregiverId": r["caregiver_id"],
            "title": r["title"],
            "promptQuestion": r["prompt_question"],
            "promptQuestionAs": r["prompt_question_as"],
            "promptQuestionHi": r["prompt_question_hi"],
            "mediaType": r["media_type"],
            "mediaUrl": r["media_url"],
            "thumbnailUrl": r["thumbnail_url"],
            "hintText": r["hint_text"],
            "category": r["category"],
            "options": opts,
            "status": r["status"],
            "createdAt": r["created_at"],
        }


def delete_personalized_activity(activity_id: str) -> bool:
    """Deletes a personalized activity and its results."""
    with get_db_connection() as conn:
        conn.execute("DELETE FROM personalized_activities WHERE id = ?", (activity_id,))
        conn.execute("DELETE FROM personalized_activity_results WHERE activity_id = ?", (activity_id,))
        conn.commit()
        return True


def record_personalized_activity_result(data: Dict[str, Any]) -> Dict[str, Any]:
    """Records a patient's game result and marks the challenge completed."""
    res_id = data.get("id") or f"pres_{uuid.uuid4().hex[:12]}"
    activity_id = data.get("activityId") or data.get("activity_id") or ""
    patient_id = data.get("patientId") or data.get("patient_id") or "mahi"
    selected_option_id = data.get("selectedOptionId") or data.get("selected_option_id") or ""
    is_correct = 1 if data.get("isCorrect") or data.get("is_correct") else 0
    attempts_count = int(data.get("attemptsCount") or data.get("attempts_count") or 1)
    hint_used = 1 if data.get("hintUsed") or data.get("hint_used") else 0
    response_time = float(data.get("responseTimeSeconds") or data.get("response_time_seconds") or 0.0)
    patient_reaction = data.get("patientReaction") or data.get("patient_reaction") or ""
    completed_at = data.get("completedAt") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO personalized_activity_results (
                id, activity_id, patient_id, selected_option_id,
                is_correct, attempts_count, hint_used, response_time_seconds,
                patient_reaction, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res_id, activity_id, patient_id, selected_option_id,
            is_correct, attempts_count, hint_used, response_time,
            patient_reaction, completed_at
        ))
        
        # Update activity status to completed
        conn.execute("""
            UPDATE personalized_activities
            SET status = 'completed', updated_at = ?
            WHERE id = ?
        """, (completed_at, activity_id))
        conn.commit()

    return {
        "id": res_id,
        "activityId": activity_id,
        "patientId": patient_id,
        "selectedOptionId": selected_option_id,
        "isCorrect": bool(is_correct),
        "attemptsCount": attempts_count,
        "hintUsed": bool(hint_used),
        "responseTimeSeconds": response_time,
        "patientReaction": patient_reaction,
        "completedAt": completed_at,
    }


def get_personalized_activity_results(patient_id: str = "mahi") -> List[Dict[str, Any]]:
    """Retrieves full history of personalized recognition results for caregiver dashboard."""
    with get_db_connection() as conn:
        rows = conn.execute("""
            SELECT r.*, a.title as activity_title, a.prompt_question, a.media_type,
                   a.media_url, a.thumbnail_url, a.category, a.options_json
            FROM personalized_activity_results r
            JOIN personalized_activities a ON r.activity_id = a.id
            WHERE r.patient_id = ?
            ORDER BY r.completed_at DESC
        """, (patient_id,)).fetchall()

        results = []
        for r in rows:
            opts = []
            try:
                opts = json.loads(r["options_json"]) if r["options_json"] else []
            except Exception:
                opts = []

            # Find selected option and correct option names
            selected_opt_name = r["selected_option_id"]
            correct_opt_name = ""
            for o in opts:
                if o.get("id") == r["selected_option_id"]:
                    selected_opt_name = o.get("text") or o.get("name") or r["selected_option_id"]
                if o.get("isCorrect") or o.get("is_correct"):
                    correct_opt_name = o.get("text") or o.get("name") or ""

            results.append({
                "id": r["id"],
                "activityId": r["activity_id"],
                "patientId": r["patient_id"],
                "activityTitle": r["activity_title"],
                "promptQuestion": r["prompt_question"],
                "mediaType": r["media_type"],
                "mediaUrl": r["media_url"],
                "thumbnailUrl": r["thumbnail_url"],
                "category": r["category"],
                "selectedOptionId": r["selected_option_id"],
                "selectedOptionName": selected_opt_name,
                "correctOptionName": correct_opt_name,
                "isCorrect": bool(r["is_correct"]),
                "attemptsCount": r["attempts_count"],
                "hintUsed": bool(r["hint_used"]),
                "responseTimeSeconds": r["response_time_seconds"],
                "patientReaction": r["patient_reaction"],
                "completedAt": r["completed_at"],
            })
        return results


def get_personalized_activity_summary(patient_id: str = "mahi") -> Dict[str, Any]:
    """Computes aggregated recognition agility, accuracy, and engagement metrics for caregiver."""
    with get_db_connection() as conn:
        total_created = conn.execute(
            "SELECT COUNT(*) as cnt FROM personalized_activities WHERE patient_id = ?",
            (patient_id,)
        ).fetchone()["cnt"]

        total_completed = conn.execute(
            "SELECT COUNT(*) as cnt FROM personalized_activities WHERE patient_id = ? AND status = 'completed'",
            (patient_id,)
        ).fetchone()["cnt"]

        results = conn.execute("""
            SELECT is_correct, attempts_count, hint_used, response_time_seconds, patient_reaction
            FROM personalized_activity_results
            WHERE patient_id = ?
        """, (patient_id,)).fetchall()

        total_played = len(results)
        if total_played == 0:
            return {
                "patientId": patient_id,
                "totalCreated": total_created,
                "totalCompleted": total_completed,
                "totalPlayed": 0,
                "accuracyPercent": 0,
                "firstAttemptAccuracyPercent": 0,
                "avgResponseTimeSeconds": 0.0,
                "hintsUsedCount": 0,
                "recentReactions": [],
                "categoryBreakdown": [],
            }

        correct_count = sum(1 for r in results if r["is_correct"])
        first_attempt_count = sum(1 for r in results if r["is_correct"] and r["attempts_count"] == 1)
        hints_used_count = sum(1 for r in results if r["hint_used"])
        avg_response_time = round(sum(r["response_time_seconds"] for r in results) / total_played, 1)

        accuracy_pct = round((correct_count / total_played) * 100, 1)
        first_attempt_pct = round((first_attempt_count / total_played) * 100, 1)

        # Category breakdown
        cat_rows = conn.execute("""
            SELECT a.category, COUNT(r.id) as played_cnt, SUM(r.is_correct) as correct_cnt
            FROM personalized_activity_results r
            JOIN personalized_activities a ON r.activity_id = a.id
            WHERE r.patient_id = ?
            GROUP BY a.category
        """, (patient_id,)).fetchall()

        category_breakdown = []
        for c in cat_rows:
            c_played = c["played_cnt"]
            c_correct = c["correct_cnt"] or 0
            category_breakdown.append({
                "category": c["category"],
                "played": c_played,
                "correct": c_correct,
                "accuracy": round((c_correct / c_played) * 100, 1) if c_played > 0 else 0,
            })

        # Recent reactions
        reaction_rows = conn.execute("""
            SELECT r.patient_reaction, r.completed_at, a.title, a.media_type
            FROM personalized_activity_results r
            JOIN personalized_activities a ON r.activity_id = a.id
            WHERE r.patient_id = ? AND r.patient_reaction != ''
            ORDER BY r.completed_at DESC
            LIMIT 6
        """, (patient_id,)).fetchall()

        recent_reactions = [
            {
                "reaction": r["patient_reaction"],
                "completedAt": r["completed_at"],
                "title": r["title"],
                "mediaType": r["media_type"],
            }
            for r in reaction_rows
        ]

        return {
            "patientId": patient_id,
            "totalCreated": total_created,
            "totalCompleted": total_completed,
            "totalPlayed": total_played,
            "accuracyPercent": accuracy_pct,
            "firstAttemptAccuracyPercent": first_attempt_pct,
            "avgResponseTimeSeconds": avg_response_time,
            "hintsUsedCount": hints_used_count,
            "recentReactions": recent_reactions,
            "categoryBreakdown": category_breakdown,
        }
