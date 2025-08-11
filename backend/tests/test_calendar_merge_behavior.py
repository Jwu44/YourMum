import pytest
from unittest.mock import MagicMock
import sys
import os

# Ensure project root is on sys.path for imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
import application  # noqa: F401
from backend.services.schedule_service import schedule_service


@pytest.fixture(autouse=True)
def reset_mock_collection():
    """Attach a fresh mock collection to the singleton service before each test."""
    mock_collection = MagicMock()
    schedule_service.schedules_collection = mock_collection
    yield mock_collection


def _make_schedule_doc(user_id: str, date: str, tasks):
    return {
        "userId": user_id,
        "date": date,
        "schedule": tasks,
        "metadata": {}
    }


def test_reuse_existing_task_id_and_preserve_user_fields(reset_mock_collection: MagicMock):
    user_id = "user-1"
    date = "2025-07-29"

    # Existing schedule has a calendar task with same gcal_event_id and user-edited fields
    existing_calendar_task = {
        "id": "old123",
        "text": "Old Title",
        "completed": True,  # user completed it
        "categories": ["Work"],  # user category
        "start_time": "09:00",
        "end_time": "10:00",
        "start_date": date,
        "gcal_event_id": "ev1",
        "from_gcal": True,
        "type": "task"
    }

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [existing_calendar_task])
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    # Incoming calendar-provided task (e.g., from conversion), with updated title/time
    incoming_calendar_task = {
        "id": "new456",  # should be replaced by old id
        "text": "New Title",
        "completed": False,  # should preserve existing True
        "categories": ["Auto"],  # should preserve existing ["Work"]
        "start_time": "10:00",
        "end_time": "11:00",
        "start_date": date,
        "gcal_event_id": "ev1",
        "from_gcal": True,
        "type": "task"
    }

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=[incoming_calendar_task]
    )

    assert success is True
    merged = result["schedule"]
    # Expect exactly one calendar task for ev1
    ev1_tasks = [t for t in merged if t.get("gcal_event_id") == "ev1"]
    assert len(ev1_tasks) == 1
    merged_task = ev1_tasks[0]

    # ID should be stable (reuse old id)
    assert merged_task["id"] == "old123"
    # Overwritten fields should come from incoming
    assert merged_task["text"] == "New Title"
    assert merged_task["start_time"] == "10:00"
    assert merged_task["end_time"] == "11:00"
    assert merged_task["start_date"] == date
    # User-edited fields preserved
    assert merged_task["completed"] is True
    assert merged_task["categories"] == ["Work"]


def test_skip_recreation_when_manual_conversion(reset_mock_collection: MagicMock):
    user_id = "user-2"
    date = "2025-07-29"

    # User manually converted calendar task to manual (from_gcal: False) but kept gcal_event_id
    manual_task = {
        "id": "manu1",
        "text": "Custom Title",
        "completed": False,
        "categories": ["Personal"],
        "start_time": "12:00",
        "end_time": "13:00",
        "start_date": date,
        "gcal_event_id": "ev2",
        "from_gcal": False,
        "type": "task"
    }

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [manual_task])
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    # Incoming calendar contains the same event ev2
    incoming_calendar_task = {
        "id": "new999",
        "text": "Calendar Title",
        "completed": False,
        "categories": ["Auto"],
        "start_time": "12:00",
        "end_time": "13:00",
        "start_date": date,
        "gcal_event_id": "ev2",
        "from_gcal": True,
        "type": "task"
    }

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=[incoming_calendar_task]
    )

    assert success is True
    merged = result["schedule"]
    # Should keep only the manual version, not recreate a calendar copy
    ev2_tasks = [t for t in merged if t.get("gcal_event_id") == "ev2"]
    assert len(ev2_tasks) == 1
    assert ev2_tasks[0]["from_gcal"] is False
    assert ev2_tasks[0]["id"] == "manu1"


def test_calendar_tasks_ordered_first(reset_mock_collection: MagicMock):
    user_id = "user-3"
    date = "2025-07-29"

    # Existing non-calendar tasks (e.g., sections or manual tasks)
    non_calendar_task = {
        "id": "section-1",
        "text": "Morning",
        "is_section": True,
        "type": "section",
        "from_gcal": False
    }

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [non_calendar_task])
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    incoming_calendar_tasks = [
        {
            "id": "cal-1",
            "text": "Event A",
            "completed": False,
            "categories": [],
            "start_time": "09:00",
            "end_time": "10:00",
            "start_date": date,
            "gcal_event_id": "evA",
            "from_gcal": True,
            "type": "task"
        },
        {
            "id": "cal-2",
            "text": "Event B",
            "completed": False,
            "categories": [],
            "start_time": "10:30",
            "end_time": "11:00",
            "start_date": date,
            "gcal_event_id": "evB",
            "from_gcal": True,
            "type": "task"
        }
    ]

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=incoming_calendar_tasks
    )

    assert success is True
    merged = result["schedule"]
    # Calendar tasks should come first, preserving incoming order
    assert merged[0].get("gcal_event_id") == "evA"
    assert merged[1].get("gcal_event_id") == "evB"
    # Non-calendar section should follow
    assert merged[2].get("type") == "section"


def test_delete_removed_calendar_events(reset_mock_collection: MagicMock):
    user_id = "user-4"
    date = "2025-07-29"

    existing_tasks = [
        {
            "id": "keep-id",
            "text": "Keep Me",
            "completed": False,
            "categories": [],
            "start_time": "09:00",
            "end_time": "10:00",
            "start_date": date,
            "gcal_event_id": "ev-keep",
            "from_gcal": True,
            "type": "task"
        },
        {
            "id": "remove-id",
            "text": "Remove Me",
            "completed": False,
            "categories": [],
            "start_time": "11:00",
            "end_time": "12:00",
            "start_date": date,
            "gcal_event_id": "ev-remove",
            "from_gcal": True,
            "type": "task"
        },
        {
            "id": "manual-id",
            "text": "Manual Task",
            "from_gcal": False,
            "type": "task"
        }
    ]

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, existing_tasks)
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    incoming_calendar_tasks = [
        {
            "id": "new-id-ignored",
            "text": "Keep Me Updated",
            "completed": False,
            "categories": [],
            "start_time": "09:30",
            "end_time": "10:30",
            "start_date": date,
            "gcal_event_id": "ev-keep",
            "from_gcal": True,
            "type": "task"
        }
    ]

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=incoming_calendar_tasks
    )

    assert success is True
    merged = result["schedule"]
    # Only ev-keep should remain among calendar tasks; ev-remove should be gone. Manual remains.
    gcal_ids = [t.get("gcal_event_id") for t in merged if t.get("from_gcal")]
    assert gcal_ids == ["ev-keep"]
    # Manual still present
    assert any(t.get("id") == "manual-id" for t in merged)


