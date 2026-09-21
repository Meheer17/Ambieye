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
import logging
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
