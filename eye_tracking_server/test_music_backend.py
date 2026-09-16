import pytest
from fastapi.testclient import TestClient
from main import app
import database

client = TestClient(app)


def test_music_database_crud():
    # Test recording single interaction
    evt = {
        "id": "test_music_001",
        "patientId": "test_patient",
        "sessionId": "session_001",
        "trackId": "as-bihu-001",
        "eventType": "music_play_started",
        "timestamp": "2026-09-16T10:00:00Z",
        "playbackPositionSeconds": 0.0,
        "metadata": {
            "trackTitle": "Bihu Re Bihu",
            "category": "assamese_folk",
            "language": "Assamese",
        },
    }
    rec = database.record_music_interaction(evt)
    assert rec["id"] == "test_music_001"
    assert rec["eventType"] == "music_play_started"

    # Test completed event in same session with 145s listening duration
    evt_completed = {
        "id": "test_music_002",
        "patientId": "test_patient",
        "sessionId": "session_001",
        "trackId": "as-bihu-001",
        "eventType": "music_play_completed",
        "timestamp": "2026-09-16T10:02:25Z",
        "playbackPositionSeconds": 145.0,
        "metadata": {
            "trackTitle": "Bihu Re Bihu",
            "category": "assamese_folk",
            "language": "Assamese",
        },
    }
    database.record_music_interaction(evt_completed)

    # Test favorite
    database.toggle_music_favorite("test_patient", "as-bihu-001", True)
    favs = database.get_patient_music_favorites("test_patient")
    assert "as-bihu-001" in favs

    # Test summary derivation
    summary = database.get_patient_music_summary("test_patient")
    assert summary["songsStartedCount"] >= 1
    assert summary["songsCompletedCount"] >= 1
    assert summary["totalListeningDurationSeconds"] >= 145.0
    assert summary["favoritesCount"] >= 1
    assert "as-bihu-001" in summary["favoriteTrackIds"]


def test_music_api_endpoints():
    # 1. Post batch events
    batch_payload = [
        {
            "id": "api_music_001",
            "patientId": "api_patient",
            "sessionId": "sess_api_1",
            "trackId": "bw-classic-001",
            "eventType": "music_play_started",
            "timestamp": "2026-09-16T10:10:00Z",
            "playbackPositionSeconds": 0.0,
            "metadata": {"trackTitle": "Mera Joota Hai Japani", "category": "hindi_classics"},
        },
        {
            "id": "api_music_002",
            "patientId": "api_patient",
            "sessionId": "sess_api_1",
            "trackId": "bw-classic-001",
            "eventType": "music_reaction",
            "timestamp": "2026-09-16T10:12:00Z",
            "playbackPositionSeconds": 120.0,
            "metadata": {"trackTitle": "Mera Joota Hai Japani", "reaction": "familiar"},
        },
    ]

    res = client.post("/api/music/events", json=batch_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # 2. Get events
    res_get = client.get("/api/patients/api_patient/music/events")
    assert res_get.status_code == 200
    events = res_get.json()["events"]
    assert len(events) >= 2

    # 3. Toggle favorite
    res_fav = client.post(
        "/api/patients/api_patient/music/favorites",
        json={"trackId": "bw-classic-001", "isFavorite": True},
    )
    assert res_fav.status_code == 200
    assert "bw-classic-001" in res_fav.json()["favorites"]

    # 4. Get summary
    res_sum = client.get("/api/patients/api_patient/music/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["patientId"] == "api_patient"
    assert sum_data["songsStartedCount"] >= 1
    assert len(sum_data["recentReactions"]) >= 1
    assert sum_data["recentReactions"][0]["reaction"] == "familiar"
