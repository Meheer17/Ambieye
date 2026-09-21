import pytest
import time
import database

def test_personalized_activities_lifecycle():
    database.init_db()
    patient_id = "test_patient_recall"
    
    # 1. Create a test activity
    act_data = {
        "patientId": patient_id,
        "caregiverId": "anita_daughter",
        "title": "Family Courtyard Quiz",
        "promptQuestion": "Who is sitting under the mango tree in this photo?",
        "promptQuestionAs": "আম গছৰ তলত কোন বহি আছে?",
        "promptQuestionHi": "आम के पेड़ के नीचे कौन बैठा है?",
        "mediaType": "photo",
        "mediaUrl": "https://images.unsplash.com/photo-1544717305-2782549b5136",
        "hintText": "She is your granddaughter who loves painting.",
        "category": "people",
        "options": [
            {"id": "opt_1", "text": "Granddaughter Priya", "emoji": "👧", "isCorrect": True},
            {"id": "opt_2", "text": "Anita", "emoji": "👩", "isCorrect": False},
            {"id": "opt_3", "text": "Neighbour Geeta", "emoji": "👵", "isCorrect": False},
        ],
    }
    
    created = database.create_personalized_activity(act_data)
    assert created["id"].startswith("pact_")
    assert created["promptQuestion"] == act_data["promptQuestion"]
    assert len(created["options"]) == 3
    assert created["status"] == "active"
    
    # 2. Get active activities
    activities = database.get_personalized_activities(patient_id, "active")
    assert len(activities) >= 1
    found = next((a for a in activities if a["id"] == created["id"]), None)
    assert found is not None
    assert found["category"] == "people"
    
    # 3. Submit patient result
    result_data = {
        "activityId": created["id"],
        "patientId": patient_id,
        "selectedOptionId": "opt_1",
        "isCorrect": True,
        "attemptsCount": 1,
        "hintUsed": False,
        "responseTimeSeconds": 2.4,
        "patientReaction": "loved",
    }
    res = database.record_personalized_activity_result(result_data)
    assert res["id"].startswith("pres_")
    assert res["isCorrect"] is True
    assert res["patientReaction"] == "loved"
    
    # 4. Check results list
    all_results = database.get_personalized_activity_results(patient_id)
    assert len(all_results) >= 1
    res_found = next((r for r in all_results if r["activityId"] == created["id"]), None)
    assert res_found is not None
    assert res_found["selectedOptionName"] == "Granddaughter Priya"
    
    # 5. Check summary metrics
    summary = database.get_personalized_activity_summary(patient_id)
    assert summary["totalCreated"] >= 1
    assert summary["totalPlayed"] >= 1
    assert summary["accuracyPercent"] == 100.0
    assert summary["avgResponseTimeSeconds"] > 0
    assert len(summary["categoryBreakdown"]) >= 1
    
    # 6. Clean up
    database.delete_personalized_activity(created["id"])
    after_delete = database.get_personalized_activity_by_id(created["id"])
    assert after_delete is None
