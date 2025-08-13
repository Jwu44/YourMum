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
        "metadata": {
            "created_at": "2025-01-01T00:00:00",
            "last_modified": "2025-01-01T00:00:00",
            "source": "test"
        },
        "inputs": {}
    }


def test_replace_calendar_tasks_simple_strategy(reset_mock_collection: MagicMock):
    """Test that calendar tasks are simply replaced, not merged with user edits."""
    user_id = "user-1"
    date = "2025-07-29"

    # Existing schedule has calendar tasks and manual tasks
    existing_calendar_task = {
        "id": "old123",
        "text": "Old Calendar Event",
        "completed": True,  # user completed it
        "categories": ["Work"],  # user category
        "start_time": "09:00",
        "end_time": "10:00",
        "start_date": date,
        "gcal_event_id": "ev1",
        "from_gcal": True,
        "type": "task"
    }
    
    manual_task = {
        "id": "manual1",
        "text": "Manual Task",
        "completed": False,
        "from_gcal": False,
        "type": "task"
    }

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [existing_calendar_task, manual_task])
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    # Incoming calendar task - completely different from existing
    incoming_calendar_task = {
        "id": "new456",
        "text": "New Calendar Event",
        "completed": False,
        "categories": ["Meeting"],
        "start_time": "14:00",
        "end_time": "15:00",
        "start_date": date,
        "gcal_event_id": "ev2",
        "type": "task"
    }

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=[incoming_calendar_task]
    )

    assert success is True
    final_schedule = result["schedule"]
    
    # Should have 2 tasks: 1 new calendar task + 1 manual task
    assert len(final_schedule) == 2
    
    # Calendar task should be first and completely replaced (no merge)
    calendar_tasks = [t for t in final_schedule if t.get("from_gcal", False)]
    manual_tasks = [t for t in final_schedule if not t.get("from_gcal", False)]
    
    assert len(calendar_tasks) == 1
    assert len(manual_tasks) == 1
    
    # New calendar task should have all incoming values (no preservation of old values)
    new_calendar_task = calendar_tasks[0]
    assert new_calendar_task["text"] == "New Calendar Event"
    assert new_calendar_task["gcal_event_id"] == "ev2"
    assert new_calendar_task["start_time"] == "14:00"
    assert new_calendar_task["from_gcal"] is True
    
    # Manual task should be preserved
    preserved_manual = manual_tasks[0]
    assert preserved_manual["id"] == "manual1"
    assert preserved_manual["text"] == "Manual Task"


def test_preserve_manual_tasks_ignore_calendar_duplicates(reset_mock_collection: MagicMock):
    """Test that manual tasks are preserved regardless of calendar events with same gcal_event_id."""
    user_id = "user-2"
    date = "2025-07-29"

    # User has a manual task (no special handling for gcal_event_id in simplified approach)
    manual_task = {
        "id": "manu1",
        "text": "Custom Manual Task",
        "completed": False,
        "categories": ["Personal"],
        "from_gcal": False,
        "type": "task"
    }

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [manual_task])
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    # Incoming calendar task
    incoming_calendar_task = {
        "id": "new999",
        "text": "Calendar Event",
        "completed": False,
        "categories": ["Meeting"],
        "start_time": "12:00",
        "end_time": "13:00",
        "start_date": date,
        "gcal_event_id": "ev2",
        "type": "task"
    }

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=[incoming_calendar_task]
    )

    assert success is True
    final_schedule = result["schedule"]

    # Should have 2 tasks: 1 calendar + 1 manual
    assert len(final_schedule) == 2

    calendar_tasks = [t for t in final_schedule if t.get("from_gcal", False)]
    manual_tasks = [t for t in final_schedule if not t.get("from_gcal", False)]

    assert len(calendar_tasks) == 1
    assert len(manual_tasks) == 1

    # Calendar task should be added with from_gcal flag
    calendar_task = calendar_tasks[0]
    assert calendar_task["text"] == "Calendar Event"
    assert calendar_task["gcal_event_id"] == "ev2"
    assert calendar_task["from_gcal"] is True

    # Manual task should remain unchanged
    preserved_manual = manual_tasks[0]
    assert preserved_manual["id"] == "manu1"
    assert preserved_manual["text"] == "Custom Manual Task"
    assert preserved_manual["from_gcal"] is False


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


def test_preserve_incomplete_existing_calendar_events_when_absent_from_fetch(reset_mock_collection: MagicMock):
    """When fetched set is missing some events, preserve existing incomplete gcal tasks (carry-over)."""
    user_id = "user-4"
    date = "2025-07-29"

    existing_tasks = [
        {
            "id": "keep-old",
            "text": "Keep Me (old)",
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
            "id": "carry-id",
            "text": "Carry Over Not In Fetch",
            "completed": False,
            "categories": [],
            "start_time": "11:00",
            "end_time": "12:00",
            "start_date": date,
            "gcal_event_id": "ev-carry",
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
            "id": "new-keep",
            "text": "Keep Me (new)",
            "completed": False,
            "categories": [],
            "start_time": "09:30",
            "end_time": "10:30",
            "start_date": date,
            "gcal_event_id": "ev-keep",
            "from_gcal": True,
            "type": "task"
        }
        # Note: ev-carry is NOT in fetched set
    ]

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=incoming_calendar_tasks
    )

    assert success is True
    merged = result["schedule"]
    # Calendar IDs should include ev-keep (from fetch) and ev-carry (preserved carry-over)
    gcal_ids = [t.get("gcal_event_id") for t in merged if t.get("from_gcal")]
    assert set(gcal_ids) == {"ev-keep", "ev-carry"}
    # Manual still present
    assert any(t.get("id") == "manual-id" for t in merged)


def test_empty_fetch_leaves_calendar_tasks_untouched(reset_mock_collection: MagicMock):
    """If fetched calendar list is empty, leave existing gcal tasks in place (non-destructive)."""
    user_id = "user-5"
    date = "2025-07-29"

    existing_tasks = [
        {
            "id": "cal-1",
            "text": "Existing A",
            "completed": False,
            "start_time": "08:00",
            "end_time": "09:00",
            "start_date": date,
            "gcal_event_id": "ev-A",
            "from_gcal": True,
            "type": "task"
        },
        {
            "id": "manual-1",
            "text": "Manual Task",
            "from_gcal": False,
            "type": "task"
        }
    ]

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, existing_tasks)
    # No DB update should be required for empty fetch preservation, but allow modified_count==0
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=0)

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=[]  # empty fetch
    )

    assert success is True
    merged = result["schedule"]
    # Should be identical to existing schedule (calendar task preserved)
    assert any(t.get("gcal_event_id") == "ev-A" for t in merged)
    assert any(t.get("id") == "manual-1" for t in merged)


def test_upsert_preserves_completion_and_id_for_matched_gcal_event(reset_mock_collection: MagicMock):
    """When fetched event matches by gcal_event_id, preserve existing ID and completed state while updating Google fields."""
    user_id = "user-6"
    date = "2025-07-29"

    existing_calendar = {
        "id": "old123",
        "text": "Old Title",
        "completed": True,  # user completed locally
        "categories": ["Work"],
        "start_time": "09:00",
        "end_time": "10:00",
        "start_date": date,
        "gcal_event_id": "ev-match",
        "from_gcal": True,
        "type": "task"
    }
    manual_task = {
        "id": "manual-x",
        "text": "Manual remains",
        "from_gcal": False,
        "type": "task"
    }

    reset_mock_collection.find_one.return_value = _make_schedule_doc(user_id, date, [existing_calendar, manual_task])
    reset_mock_collection.update_one.return_value = MagicMock(modified_count=1)

    incoming = {
        # Incoming may have a different transient ID; merge must preserve existing ID
        "id": "new456",
        "text": "New Title",
        "completed": False,  # server-sourced value should not overwrite local completion
        "categories": [],
        "start_time": "09:30",
        "end_time": "10:30",
        "start_date": date,
        "gcal_event_id": "ev-match",
        "from_gcal": True,
        "type": "task"
    }

    success, result = schedule_service.create_schedule_from_calendar_sync(
        user_id=user_id,
        date=date,
        calendar_tasks=[incoming]
    )

    assert success is True
    merged = result["schedule"]

    # Find the merged calendar task by gcal_event_id
    merged_match = next(t for t in merged if t.get("from_gcal") and t.get("gcal_event_id") == "ev-match")

    # ID and completion preserved from existing
    assert merged_match["id"] == "old123"
    assert merged_match["completed"] is True

    # Google-sourced fields updated from incoming
    assert merged_match["text"] == "New Title"
    assert merged_match["start_time"] == "09:30"
    assert merged_match["end_time"] == "10:30"

    # Manual task remains
    assert any(t.get("id") == "manual-x" for t in merged if not t.get("from_gcal"))

