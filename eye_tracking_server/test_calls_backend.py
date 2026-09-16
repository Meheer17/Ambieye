"""
test_calls_backend.py — Unit & Integration tests for One-to-One Calling Backend (SQLite & FastAPI)
"""

import sys
from pathlib import Path

# Ensure directory is on python path
sys.path.insert(0, str(Path(__file__).parent))

import database
from fastapi.testclient import TestClient
from main import app, call_signaling_manager

client = TestClient(app)


def test_database_call_records_crud():
    database.init_db()

    # 1. Create call record
    call_data = {
        "id": "call_test_101",
        "patientId": "mahi",
        "familyMemberId": "fam-anita",
        "callType": "video",
        "direction": "outgoing",
        "status": "ringing",
        "startedAt": "2026-09-16T01:00:00Z",
    }
    created = database.create_call_record(call_data)
    assert created["id"] == "call_test_101"
    assert created["patientId"] == "mahi"
    assert created["familyMemberId"] == "fam-anita"
    assert created["callType"] == "video"
    assert created["direction"] == "outgoing"
    assert created["status"] == "ringing"
    assert created["durationSeconds"] == 0

    # 2. Retrieve call record
    fetched = database.get_call_record("call_test_101")
    assert fetched is not None
    assert fetched["familyMemberId"] == "fam-anita"

    # 3. Update call record (Answered & Completed)
    updated = database.update_call_record("call_test_101", {
        "status": "completed",
        "answeredAt": "2026-09-16T01:00:05Z",
        "endedAt": "2026-09-16T01:02:15Z",
        "durationSeconds": 130,
    })
    assert updated is not None
    assert updated["status"] == "completed"
    assert updated["durationSeconds"] == 130
    assert updated["answeredAt"] == "2026-09-16T01:00:05Z"

    # 4. Retrieve patient call history
    history = database.get_patient_call_history("mahi", limit=10)
    assert len(history) >= 1
    assert any(c["id"] == "call_test_101" for c in history)

    # 5. Delete call record
    deleted = database.delete_call_record("call_test_101")
    assert deleted is True
    assert database.get_call_record("call_test_101") is None


def test_fastapi_call_endpoints():
    # 1. POST /api/calls
    post_res = client.post("/api/calls", json={
        "id": "call_api_test_202",
        "patientId": "mahi",
        "familyMemberId": "fam-rahul",
        "callType": "audio",
        "direction": "outgoing",
    })
    assert post_res.status_code == 201
    res_data = post_res.json()
    assert res_data["success"] is True
    assert res_data["call"]["id"] == "call_api_test_202"
    assert res_data["call"]["callType"] == "audio"

    # 2. GET /api/calls/{id}
    get_res = client.get("/api/calls/call_api_test_202")
    assert get_res.status_code == 200
    assert get_res.json()["call"]["familyMemberId"] == "fam-rahul"

    # 3. PUT /api/calls/{id}
    put_res = client.put("/api/calls/call_api_test_202", json={
        "status": "completed",
        "durationSeconds": 45,
    })
    assert put_res.status_code == 200
    assert put_res.json()["call"]["status"] == "completed"
    assert put_res.json()["call"]["durationSeconds"] == 45

    # 4. GET /api/calls/history
    hist_res = client.get("/api/calls/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["success"] is True
    assert len(hist_data["history"]) >= 1

    # Clean up test record
    database.delete_call_record("call_api_test_202")


def test_call_signaling_manager():
    # Test internal manager state handling
    assert hasattr(call_signaling_manager, "user_connections")
    assert hasattr(call_signaling_manager, "active_sessions")


if __name__ == "__main__":
    test_database_call_records_crud()
    test_fastapi_call_endpoints()
    test_call_signaling_manager()
    print("All Backend Call tests passed successfully!")
