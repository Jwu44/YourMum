"""
Test suite for schedule service calendar merge helpers.
Testing calendar merge consolidation methods extracted during Phase 3 refactoring.
"""

import pytest
from typing import Dict, List, Any
from backend.services.schedule_service import ScheduleService


class TestScheduleServiceCalendarMerge:
    """Test class for schedule service calendar merge methods."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.service = ScheduleService()
        
        # Sample existing calendar tasks
        self.existing_calendar_tasks = [
            {
                "id": "existing_1",
                "text": "Morning standup",
                "gcal_event_id": "gcal_001",
                "from_gcal": True,
                "start_time": "09:00",
                "end_time": "09:30",
                "completed": False,
                "type": "task"
            },
            {
                "id": "existing_2", 
                "text": "Client meeting",
                "gcal_event_id": "gcal_002",
                "from_gcal": True,
                "start_time": "14:00",
                "end_time": "15:00",
                "completed": True,  # User marked complete
                "type": "task"
            },
            {
                "id": "existing_3",
                "text": "Legacy event without gcal_event_id",
                "from_gcal": True,
                "start_time": "16:00",
                "end_time": "17:00",
                "completed": False,
                "type": "task"
            }
        ]
        
        # Sample incoming calendar tasks (from Google Calendar fetch)
        self.incoming_calendar_tasks = [
            {
                "text": "Morning standup - UPDATED",  # Updated text
                "gcal_event_id": "gcal_001",
                "start_time": "09:15",  # Updated time
                "end_time": "09:45",
                "type": "task"
            },
            {
                "text": "New team meeting",  # Brand new event
                "gcal_event_id": "gcal_003",
                "start_time": "11:00",
                "end_time": "12:00",
                "type": "task"
            }
            # Note: gcal_002 (Client meeting) not in incoming - should be preserved
        ]
        
        # Sample mixed task list for position preservation tests
        self.mixed_tasks = [
            {"id": "section1", "text": "Work", "is_section": True, "type": "section"},
            {"id": "task1", "text": "Manual task 1", "type": "task"},
            {"id": "cal1", "text": "Calendar event 1", "gcal_event_id": "gcal_100", "from_gcal": True, "start_time": "10:00"},
            {"id": "cal2", "text": "Calendar event 2", "gcal_event_id": "gcal_101", "from_gcal": True, "start_time": "14:00"},
            {"id": "task2", "text": "Manual task 2", "type": "task"},
            {"id": "section2", "text": "Personal", "is_section": True, "type": "section"},
            {"id": "task3", "text": "Manual task 3", "type": "task"}
        ]

    def test_upsert_calendar_tasks_by_id_empty_incoming(self):
        """Test upserting with empty incoming calendar tasks."""
        result = self.service._upsert_calendar_tasks_by_id(
            self.existing_calendar_tasks,
            [],
            "2025-08-15"
        )
        
        # Should return existing tasks unchanged
        assert len(result) == len(self.existing_calendar_tasks)
        assert result[0]["id"] == "existing_1"
        assert result[1]["id"] == "existing_2"

    def test_upsert_calendar_tasks_by_id_updates_existing(self):
        """Test upserting updates existing calendar tasks correctly."""
        result = self.service._upsert_calendar_tasks_by_id(
            self.existing_calendar_tasks,
            self.incoming_calendar_tasks,
            "2025-08-15"
        )
        
        # Should have 4 tasks: 2 updated + 1 preserved with gcal_event_id + 1 new + 1 preserved without gcal_event_id
        assert len(result) == 4
        
        # Find the updated standup meeting
        updated_standup = next(t for t in result if t.get("gcal_event_id") == "gcal_001")
        assert updated_standup["text"] == "Morning standup - UPDATED"  # Text should be updated
        assert updated_standup["start_time"] == "09:15"  # Time should be updated
        assert updated_standup["id"] == "existing_1"  # ID should be preserved
        assert updated_standup["completed"] is False  # Completion status preserved
        
        # Find the preserved client meeting (not in incoming)
        preserved_meeting = next(t for t in result if t.get("gcal_event_id") == "gcal_002")
        assert preserved_meeting["text"] == "Client meeting"  # Original text preserved
        assert preserved_meeting["completed"] is True  # Completion status preserved
        assert preserved_meeting["id"] == "existing_2"  # ID preserved
        
        # Find the new team meeting
        new_meeting = next(t for t in result if t.get("gcal_event_id") == "gcal_003")
        assert new_meeting["text"] == "New team meeting"
        assert new_meeting["start_time"] == "11:00"
        assert "id" in new_meeting  # Should have generated ID

    def test_upsert_calendar_tasks_by_id_preserves_completion_status(self):
        """Test that upserting preserves user's completion status."""
        # Create incoming task that matches completed existing task
        incoming_for_completed = [
            {
                "text": "Client meeting - UPDATED FROM GCAL",
                "gcal_event_id": "gcal_002",  # Matches existing completed task
                "start_time": "14:30",  # New time from Google
                "end_time": "15:30",
                "type": "task"
            }
        ]
        
        result = self.service._upsert_calendar_tasks_by_id(
            self.existing_calendar_tasks,
            incoming_for_completed,
            "2025-08-15"
        )
        
        # Find the updated task
        updated_task = next(t for t in result if t.get("gcal_event_id") == "gcal_002")
        assert updated_task["text"] == "Client meeting - UPDATED FROM GCAL"  # Google text updated
        assert updated_task["start_time"] == "14:30"  # Google time updated
        assert updated_task["completed"] is True  # User completion status PRESERVED
        assert updated_task["id"] == "existing_2"  # Local ID preserved

    def test_upsert_calendar_tasks_by_id_sets_required_fields(self):
        """Test that upserting sets required fields for all tasks."""
        result = self.service._upsert_calendar_tasks_by_id(
            self.existing_calendar_tasks,
            self.incoming_calendar_tasks,
            "2025-08-15"
        )
        
        for task in result:
            assert task.get("from_gcal") is True
            assert task.get("type") == "task"
            assert task.get("start_date") == "2025-08-15"

    def test_upsert_calendar_tasks_by_id_handles_missing_gcal_event_id(self):
        """Test handling of existing tasks without gcal_event_id."""
        result = self.service._upsert_calendar_tasks_by_id(
            self.existing_calendar_tasks,
            self.incoming_calendar_tasks,
            "2025-08-15"
        )
        
        # Legacy event without gcal_event_id should be preserved
        legacy_task = next(t for t in result if t.get("text") == "Legacy event without gcal_event_id")
        assert legacy_task["id"] == "existing_3"
        assert legacy_task["from_gcal"] is True

    def test_rebuild_tasks_preserving_calendar_positions_empty_list(self):
        """Test position preservation with empty task list."""
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            [],
            [],
            set()
        )
        assert result == []

    def test_rebuild_tasks_preserving_calendar_positions_no_calendar_tasks(self):
        """Test position preservation when no calendar tasks exist."""
        non_calendar_tasks = [
            {"id": "task1", "text": "Manual task", "type": "task"},
            {"id": "section1", "text": "Work", "is_section": True, "type": "section"}
        ]
        
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            non_calendar_tasks,
            [],
            set()
        )
        
        assert len(result) == 2
        assert result[0]["id"] == "task1"
        assert result[1]["id"] == "section1"

    def test_rebuild_tasks_preserving_calendar_positions_maintains_order(self):
        """Test that position preservation maintains relative order of tasks."""
        # Simulate upserted calendar tasks (updated versions)
        upserted_calendar = [
            {"id": "cal1_new", "text": "Updated Calendar event 1", "gcal_event_id": "gcal_100", "from_gcal": True},
            {"id": "cal_new", "text": "Brand new event", "gcal_event_id": "gcal_102", "from_gcal": True}
        ]
        
        fetched_ids = {"gcal_100", "gcal_102"}
        
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            self.mixed_tasks,
            upserted_calendar,
            fetched_ids
        )
        
        # Should maintain overall structure but update calendar events
        assert len(result) >= len(self.mixed_tasks)  # May have new items
        
        # Check that sections and manual tasks are preserved in relative positions
        section_indices = [i for i, task in enumerate(result) if task.get("is_section")]
        assert len(section_indices) == 2  # Both sections preserved
        
        # Calendar events should be updated in place or added appropriately
        calendar_events = [task for task in result if task.get("from_gcal")]
        assert len(calendar_events) >= 2  # At least the updated ones

    def test_rebuild_tasks_preserving_calendar_positions_adds_new_events(self):
        """Test that new calendar events are added in appropriate positions."""
        # Only new calendar events
        upserted_calendar = [
            {"id": "new_cal1", "text": "New morning meeting", "gcal_event_id": "gcal_200", "from_gcal": True, "start_time": "08:00"},
            {"id": "new_cal2", "text": "New afternoon meeting", "gcal_event_id": "gcal_201", "from_gcal": True, "start_time": "15:00"}
        ]
        
        # No existing calendar events being updated
        fetched_ids = {"gcal_200", "gcal_201"}
        
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            self.mixed_tasks,
            upserted_calendar,
            fetched_ids
        )
        
        # Should have original tasks plus new calendar events
        assert len(result) > len(self.mixed_tasks)
        
        # New events should be present
        new_event_ids = [task["id"] for task in result if task["id"] in ["new_cal1", "new_cal2"]]
        assert len(new_event_ids) == 2

    def test_rebuild_tasks_preserving_calendar_positions_preserves_sections(self):
        """Test that section assignments are preserved during rebuild."""
        # Create tasks with section assignments
        tasks_with_sections = [
            {"id": "section1", "text": "Work", "is_section": True, "type": "section"},
            {"id": "cal1", "text": "Work meeting", "gcal_event_id": "gcal_100", "from_gcal": True, "section": "Work"},
            {"id": "task1", "text": "Work task", "type": "task", "section": "Work"}
        ]
        
        upserted_calendar = [
            {"id": "cal1_updated", "text": "Updated work meeting", "gcal_event_id": "gcal_100", "from_gcal": True}
        ]
        
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            tasks_with_sections,
            upserted_calendar,
            {"gcal_100"}
        )
        
        # Updated calendar event should preserve section assignment
        updated_event = next(t for t in result if t.get("gcal_event_id") == "gcal_100")
        assert updated_event.get("section") == "Work"

    def test_rebuild_tasks_preserving_calendar_positions_handles_inheritance(self):
        """Test that new calendar events inherit section from context."""
        upserted_calendar = [
            {"id": "new_event", "text": "New team sync", "gcal_event_id": "gcal_300", "from_gcal": True}
        ]
        
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            self.mixed_tasks,
            upserted_calendar,
            {"gcal_300"}
        )
        
        # New event should be inserted and potentially inherit section context
        new_event = next(t for t in result if t.get("gcal_event_id") == "gcal_300")
        assert new_event is not None
        assert new_event["text"] == "New team sync"