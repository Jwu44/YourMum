import pytest
from unittest.mock import MagicMock
import sys
import os

# Ensure project root on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import application  # noqa: F401
from backend.services.schedule_service import schedule_service


@pytest.fixture(autouse=True)
def _reset_mock_collection():
    mock_collection = MagicMock()
    schedule_service.schedules_collection = mock_collection
    yield mock_collection


def _make_schedule_doc(user_id: str, date: str, tasks):
    return {
        "userId": user_id,
        "date": date,
        "schedule": tasks,
        "metadata": {
            "created_at": "2025-01-01T00:00:00",
            "last_modified": "2025-01-01T00:00:00",
            "source": "test"
        },
        "inputs": {}
    }


def test_webhook_preserves_positions_and_inserts_new_after_existing_block(_reset_mock_collection: MagicMock):
    user_id = "user-pos"
    date = "2025-08-14"

    existing = [
        {"id": "sec-m", "text": "Morning", "is_section": True, "type": "section"},
        {"id": "ev-a", "text": "cold reach", "from_gcal": True, "gcal_event_id": "gA", "type": "task", "section": "Morning"},
        {"id": "man-1", "text": "manual task A", "type": "task", "from_gcal": False, "section": "Morning"},
        {"id": "sec-a", "text": "Afternoon", "is_section": True, "type": "section"},
    ]

    _reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, existing)
    _reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    incoming = [
        # Updated payload for existing event A (upsert)
        {"id": "tmp-a", "text": "cold reach", "gcal_event_id": "gA", "type": "task", "start_time": "12:00", "end_time": "13:00"},
        # New event B
        {"id": "tmp-b", "text": "another event", "gcal_event_id": "gB", "type": "task", "start_time": "17:30", "end_time": "18:30"},
    ]

    ok, result = schedule_service.apply_calendar_webhook_update(user_id, date, incoming)
    assert ok
    tasks = result["schedule"]

    # Expect section 'Morning' still first
    assert tasks[0].get("is_section") is True and tasks[0].get("text") == "Morning"

    # cold reach remains directly after 'Morning' (preserved position)
    assert tasks[1].get("from_gcal") is True and tasks[1].get("gcal_event_id") == "gA"

    # New event inserted after existing calendar block and before 'Afternoon'
    # Find indices
    idx_new = next(i for i, t in enumerate(tasks) if t.get("gcal_event_id") == "gB")
    idx_afternoon = next(i for i, t in enumerate(tasks) if t.get("is_section") and t.get("text") == "Afternoon")
    assert idx_new < idx_afternoon

    # New event should inherit section 'Morning'
    assert tasks[idx_new].get("section") == "Morning"


