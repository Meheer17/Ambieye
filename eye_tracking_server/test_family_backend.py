"""
test_family_backend.py — Unit & Integration tests for Family Hub Backend (SQLite & FastAPI)
"""

import sys
from pathlib import Path

# Ensure directory is on python path
sys.path.insert(0, str(Path(__file__).parent))

import database
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_database_family_crud():
    database.init_db()
    
    # 1. Retrieve baseline family members for default patient 'mahi'
    members = database.get_patient_family_members("mahi")
    assert len(members) >= 6
    anita = next((m for m in members if m["id"] == "fam-anita"), None)
    assert anita is not None
    assert anita["name"] == "Anita Barman"
    assert anita["relationship"] == "Daughter & Primary Caregiver"
    assert anita["isFavorite"] is True
    assert anita["phone"] == "+91 98765 43210"

    # 2. Create family member for a separate patient
    test_patient_id = "test_senior_007"
    created = database.create_family_member(
        patient_id=test_patient_id,
        data={
            "id": "fam-test-1",
            "name": "Kavita Barman",
            "relationship": "Niece",
            "phone": "+91 98765 00001",
            "isFavorite": False,
            "statusText": "Available",
        }
    )
    assert created["id"] == "fam-test-1"
    assert created["patientId"] == test_patient_id
    assert created["name"] == "Kavita Barman"
    assert created["isFavorite"] is False

    # 3. Retrieve single family member
    fetched = database.get_family_member("fam-test-1", patient_id=test_patient_id)
    assert fetched is not None
    assert fetched["name"] == "Kavita Barman"

    # 4. Toggle Favorite
    toggled = database.toggle_family_member_favorite("fam-test-1", patient_id=test_patient_id)
    assert toggled is not None
    assert toggled["isFavorite"] is True

    # 5. Update family member
    updated = database.update_family_member(
        member_id="fam-test-1",
        data={"statusText": "Busy at work"},
        patient_id=test_patient_id
    )
    assert updated is not None
    assert updated["statusText"] == "Busy at work"

    # 6. Patient isolation: patient 'test_senior_007' has 1 member, 'mahi' has 6+
    p_members = database.get_patient_family_members(test_patient_id)
    assert any(m["id"] == "fam-test-1" for m in p_members)

    # 7. Delete family member
    deleted = database.delete_family_member("fam-test-1", patient_id=test_patient_id)
    assert deleted is True
    assert database.get_family_member("fam-test-1", patient_id=test_patient_id) is None


def test_fastapi_family_endpoints():
    # 1. GET /api/family
    response = client.get("/api/family")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["family"]) >= 6

    # 2. GET /api/patients/{patient_id}/family
    response = client.get("/api/patients/mahi/family")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["patientId"] == "mahi"

    # 3. GET /api/family/fam-anita
    response = client.get("/api/family/fam-anita")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["member"]["name"] == "Anita Barman"

    # 4. POST /api/family
    post_res = client.post("/api/family", json={
        "id": "fam-api-test",
        "patientId": "mahi",
        "name": "Bhaskar Sharma",
        "relationship": "Nephew",
        "phone": "+91 99887 76655",
        "isFavorite": True,
        "avatarEmoji": "👨",
    })
    assert post_res.status_code == 201
    post_data = post_res.json()
    assert post_data["success"] is True
    assert post_data["member"]["name"] == "Bhaskar Sharma"

    # 5. POST /api/family/{id}/toggle-favorite
    fav_res = client.post("/api/family/fam-api-test/toggle-favorite")
    assert fav_res.status_code == 200
    assert fav_res.json()["member"]["isFavorite"] is False

    # 6. PUT /api/family/{id}
    put_res = client.put("/api/family/fam-api-test", json={
        "statusText": "In Guwahati",
    })
    assert put_res.status_code == 200
    assert put_res.json()["member"]["statusText"] == "In Guwahati"

    # 7. DELETE /api/family/{id}
    del_res = client.delete("/api/family/fam-api-test")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


if __name__ == "__main__":
    test_database_family_crud()
    test_fastapi_family_endpoints()
    print("All Backend Family tests passed successfully!")
