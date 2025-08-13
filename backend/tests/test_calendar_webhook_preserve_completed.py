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


def test_webhook_preserves_completed_and_incomplete_existing_calendar_tasks_when_absent_from_fetch(_reset_mock_collection: MagicMock):
    user_id = "user-x"
    date = "2025-08-13"

    existing_tasks = [
        # Completed carried-over calendar task (should remain visible today)
        {
            "id": "keep-completed-id",
            "text": "Completed Carry Over",
            "completed": True,
            "start_time": "09:00",
            "end_time": "10:00",
            "start_date": date,
            "gcal_event_id": "ev-completed",
            "from_gcal": True,
            "type": "task",
        },
        # Incomplete existing calendar task (should also remain if not in fetched set)
        {
            "id": "keep-incomplete-id",
            "text": "Incomplete Old",
            "completed": False,
            "start_time": "11:00",
            "end_time": "12:00",
            "start_date": date,
            "gcal_event_id": "ev-incomplete",
            "from_gcal": True,
            "type": "task",
        },
        # Manual task
        {
            "id": "manual-1",
            "text": "Manual Task",
            "from_gcal": False,
            "type": "task",
        },
    ]

    _reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, existing_tasks)
    _reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    # Fetched set that does NOT include the two existing calendar events
    incoming_calendar_tasks = [
        {
            "id": "new-1",
            "text": "New Event",
            "completed": False,
            "start_time": "14:00",
            "end_time": "15:00",
            "start_date": date,
            "gcal_event_id": "ev-new",
            "type": "task",
        }
    ]

    success, result = schedule_service.apply_calendar_webhook_update(
        user_id=user_id,
        date=date,
        calendar_tasks=incoming_calendar_tasks,
    )

    assert success is True
    tasks = result["schedule"]

    # All three calendar tasks should be present (two preserved + one new)
    gcal_ids = [t.get("gcal_event_id") for t in tasks if t.get("from_gcal")]
    assert set(gcal_ids) == {"ev-completed", "ev-incomplete", "ev-new"}

    # Completed state preserved
    completed_task = next(t for t in tasks if t.get("gcal_event_id") == "ev-completed")
    assert completed_task["completed"] is True

    # Manual task still present
    assert any(t.get("id") == "manual-1" for t in tasks)

    # Metadata should include all calendar events (preserved included)
    metadata = result.get("metadata", {})
    assert metadata.get("calendarEvents", 0) >= 3


def test_webhook_upsert_preserves_id_and_completion_while_updating_times_and_text(_reset_mock_collection: MagicMock):
    user_id = "user-y"
    date = "2025-08-13"

    existing_calendar = {
        "id": "persist-id-123",
        "text": "Old Title",
        "completed": True,
        "start_time": "08:00",
        "end_time": "09:00",
        "start_date": date,
        "gcal_event_id": "ev-match",
        "from_gcal": True,
        "type": "task",
        "categories": ["Work"],
        "section": "Today",
    }
    _reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [existing_calendar])
    _reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    incoming = [
        {
            "id": "ignored-incoming-id",
            "text": "New Title",
            "completed": False,  # should be ignored (preserve completed=True)
            "start_time": "12:00",
            "end_time": "13:00",
            "start_date": date,
            "gcal_event_id": "ev-match",
            "type": "task",
        }
    ]

    success, result = schedule_service.apply_calendar_webhook_update(user_id, date, incoming)
    assert success is True
    tasks = result["schedule"]
    assert len(tasks) == 1

    merged = tasks[0]
    # Preserve ID and completion
    assert merged["id"] == "persist-id-123"
    assert merged["completed"] is True
    # Update Google-sourced fields
    assert merged["text"] == "New Title"
    assert merged["start_time"] == "12:00"
    assert merged["end_time"] == "13:00"
    # Preserve local user edits
    assert merged.get("categories") == ["Work"]
    assert merged.get("section") == "Today"


def test_webhook_skips_events_without_id(_reset_mock_collection: MagicMock):
    user_id = "user-z"
    date = "2025-08-13"

    existing = {
        "id": "cal-1",
        "text": "Existing",
        "completed": False,
        "start_date": date,
        "gcal_event_id": "ev-1",
        "from_gcal": True,
        "type": "task",
    }
    _reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [existing])
    _reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    # Incoming task lacks gcal_event_id
    incoming = [
        {
            "id": "some",
            "text": "No ID",
            "completed": False,
            "start_time": "10:00",
            "end_time": "11:00",
            "start_date": date,
            # Missing gcal_event_id
            "type": "task",
        }
    ]

    success, result = schedule_service.apply_calendar_webhook_update(user_id, date, incoming)
    assert success is True
    tasks = result["schedule"]
    # Should ignore incoming; existing remains alone
    assert len([t for t in tasks if t.get("from_gcal")]) == 1
    assert any(t.get("gcal_event_id") == "ev-1" for t in tasks)


def test_webhook_empty_fetch_is_non_destructive(_reset_mock_collection: MagicMock):
    user_id = "user-w"
    date = "2025-08-13"

    existing = {
        "id": "cal-1",
        "text": "Existing",
        "completed": False,
        "start_date": date,
        "gcal_event_id": "ev-1",
        "from_gcal": True,
        "type": "task",
    }
    _reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [existing])
    _reset_mock_collection.update_one.return_value = MagicMock(modified_count=0)

    success, result = schedule_service.apply_calendar_webhook_update(user_id, date, [])
    assert success is True
    tasks = result["schedule"]
    assert len(tasks) == 1
    assert tasks[0]["gcal_event_id"] == "ev-1"


