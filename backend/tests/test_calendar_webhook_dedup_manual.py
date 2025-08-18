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
    """Attach a fresh mock collection to the singleton service before each test."""
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


def test_webhook_dedup_removes_manual_task_with_matching_text(_reset_mock_collection: MagicMock):
    user_id = "user-text"
    date = "2025-08-14"

    existing_tasks = [
        # Manual task with same text as incoming calendar event
        {
            "id": "manual-keep-out",
            "text": "Cold Reach",
            "from_gcal": False,
            "type": "task"
        },
        # Section should be preserved regardless of text
        {
            "id": "sec-1",
            "text": "Morning",
            "is_section": True,
            "type": "section"
        }
    ]

    _reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, existing_tasks)
    _reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    incoming_calendar = [
        {
            "id": "tmp",
            "text": "cold reach",  # case-insensitive match
            "completed": False,
            "start_time": "12:00",
            "end_time": "13:00",
            "start_date": date,
            "gcal_event_id": "ev-1",
            "type": "task"
        }
    ]

    success, result = schedule_service.apply_calendar_webhook_update(user_id, date, incoming_calendar)
    assert success is True
    tasks = result["schedule"]

    # Manual duplicate should be removed; only calendar + section remain
    texts = [t.get("text") for t in tasks]
    assert any(t.get("from_gcal") and t.get("gcal_event_id") == "ev-1" for t in tasks)
    assert any(t.get("is_section") for t in tasks)
    assert not any((t.get("text") or "").lower() == "cold reach" and not t.get("from_gcal") for t in tasks)


def test_webhook_dedup_removes_manual_task_with_matching_id(_reset_mock_collection: MagicMock):
    user_id = "user-id"
    date = "2025-08-14"

    existing_tasks = [
        # Manual task whose id matches incoming gcal_event_id
        {
            "id": "ev-xyz",
            "text": "Some Task",
            "from_gcal": False,
            "type": "task"
        },
        # Another manual task that should remain
        {
            "id": "manual-keep",
            "text": "Different Task",
            "from_gcal": False,
            "type": "task"
        }
    ]

    _reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, existing_tasks)
    _reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    incoming_calendar = [
        {
            "id": "tmp",
            "text": "Calendar Version",
            "completed": False,
            "start_date": date,
            "gcal_event_id": "ev-xyz",
            "type": "task"
        }
    ]

    success, result = schedule_service.apply_calendar_webhook_update(user_id, date, incoming_calendar)
    assert success is True
    tasks = result["schedule"]

    # The manual task with id == gcal_event_id should be gone; other manual remains
    assert not any(t.get("id") == "ev-xyz" and not t.get("from_gcal") for t in tasks)
    assert any(t.get("id") == "manual-keep" for t in tasks)
    # Calendar copy should be present
    assert any(t.get("from_gcal") and t.get("gcal_event_id") == "ev-xyz" for t in tasks)


