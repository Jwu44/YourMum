"""
Tests for position preservation fix in calendar sync.
Verifies that new calendar events appear at top without moving existing events.
"""

import pytest
from backend.services.schedule_service import ScheduleService


class TestScheduleServicePositionPreservation:
    """Test the specific position preservation fix for Bug #4."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = ScheduleService()

    def test_new_calendar_event_preserves_existing_positions(self):
        """Test that new calendar events appear at top without moving existing calendar events."""
        # Simulate the scenario from the user's screenshot
        existing_tasks = [
            # Section at top
            {"id": "work_section", "text": "Work", "is_section": True, "type": "section"},
            
            # Existing calendar events mixed with manual tasks (original positions)
            {"id": "parkrun", "text": "🏃‍♂️Parkrun", "from_gcal": True, "gcal_event_id": "parkrun_id", "start_time": "08:00"},
            {"id": "interview", "text": "Interview at Driva", "from_gcal": True, "gcal_event_id": "interview_id", "start_time": "10:00"},
            {"id": "manual1", "text": "cold reach", "completed": True, "section": "Work"},
            {"id": "test_event", "text": "test event", "from_gcal": True, "gcal_event_id": "test_id", "start_time": "12:30"},
            {"id": "asdf", "text": "asdf", "from_gcal": True, "gcal_event_id": "asdf_id", "start_time": "14:30"},
            {"id": "haircut", "text": "haircut", "from_gcal": True, "gcal_event_id": "haircut_id", "start_time": "17:30"},
            
            # Exercise section and tasks
            {"id": "exercise_section", "text": "Exercise", "is_section": True, "type": "section"},
            {"id": "manual2", "text": "fix sim card"},
            
            # More sections
            {"id": "relationships_section", "text": "Relationships", "is_section": True, "type": "section"},
            {"id": "fun_section", "text": "Fun", "is_section": True, "type": "section"},
            {"id": "manual3", "text": "gym", "completed": True, "section": "Fun"},
            {"id": "ambition_section", "text": "Ambition", "is_section": True, "type": "section"},
            {"id": "manual4", "text": "read fountainhead", "section": "Ambition"}
        ]
        
        # NEW calendar event being added (this would be "blabhalabh" from the user's scenario)
        new_calendar_tasks = [
            {"id": "blabhalabh", "text": "blabhalabh", "from_gcal": True, "gcal_event_id": "blabhalabh_id", "start_time": "16:00"}
        ]
        
        # All calendar tasks (existing + new)
        all_upserted_calendar = [
            {"id": "parkrun", "text": "🏃‍♂️Parkrun", "from_gcal": True, "gcal_event_id": "parkrun_id", "start_time": "08:00"},
            {"id": "interview", "text": "Interview at Driva", "from_gcal": True, "gcal_event_id": "interview_id", "start_time": "10:00"},
            {"id": "test_event", "text": "test event", "from_gcal": True, "gcal_event_id": "test_id", "start_time": "12:30"},
            {"id": "asdf", "text": "asdf", "from_gcal": True, "gcal_event_id": "asdf_id", "start_time": "14:30"},
            {"id": "blabhalabh", "text": "blabhalabh", "from_gcal": True, "gcal_event_id": "blabhalabh_id", "start_time": "16:00"},  # NEW
            {"id": "haircut", "text": "haircut", "from_gcal": True, "gcal_event_id": "haircut_id", "start_time": "17:30"}
        ]
        
        # Only the new event ID is in fetched set
        fetched_calendar_ids = {"blabhalabh_id"}
        
        # Execute the position preservation logic
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            existing_tasks,
            all_upserted_calendar,
            fetched_calendar_ids
        )
        
        # Verify the fix: new event should appear at top, existing events stay in place
        
        # Find positions of key tasks
        result_by_id = {task.get("id") or task.get("gcal_event_id"): i for i, task in enumerate(result)}
        
        # 1. NEW EVENT: "blabhalabh" should be at the top (after Work section)
        blabhalabh_position = result_by_id.get("blabhalabh")
        work_section_position = result_by_id.get("work_section")
        assert blabhalabh_position is not None, "New calendar event should be present"
        assert blabhalabh_position == work_section_position + 1, "New event should appear right after Work section"
        
        # 2. EXISTING CALENDAR EVENTS: Should maintain relative positions to manual tasks
        parkrun_position = result_by_id.get("parkrun")
        interview_position = result_by_id.get("interview") 
        manual1_position = result_by_id.get("manual1")
        test_event_position = result_by_id.get("test_event")
        
        # Parkrun should still come before Interview (original order preserved)
        assert parkrun_position < interview_position, "Parkrun should still come before Interview"
        
        # Manual task "cold reach" should still be between Interview and test event  
        assert interview_position < manual1_position < test_event_position, "Manual task should maintain position between calendar events"
        
        # 3. SECTIONS: Should remain in their original positions
        exercise_section_position = result_by_id.get("exercise_section")
        manual2_position = result_by_id.get("manual2")
        assert exercise_section_position < manual2_position, "Exercise section should come before its tasks"
        
        # 4. OVERALL STRUCTURE: Total count should be original + 1 new event
        assert len(result) == len(existing_tasks) + 1, f"Should have {len(existing_tasks) + 1} tasks total"
        
        # 5. SECTION INHERITANCE: New event should inherit Work section
        new_event = next(t for t in result if t.get("gcal_event_id") == "blabhalabh_id")
        assert new_event.get("section") == "Work", "New event should inherit Work section context"

    def test_multiple_new_calendar_events_sorted_by_time(self):
        """Test that multiple new calendar events are sorted by time when inserted at top."""
        existing_tasks = [
            {"id": "section1", "text": "Work", "is_section": True, "type": "section"},
            {"id": "existing1", "text": "Existing meeting", "from_gcal": True, "gcal_event_id": "existing1", "start_time": "10:00"},
            {"id": "manual1", "text": "Manual task"}
        ]
        
        # Multiple new events with different times
        all_upserted_calendar = [
            {"id": "existing1", "text": "Existing meeting", "from_gcal": True, "gcal_event_id": "existing1", "start_time": "10:00"},
            {"id": "new_event2", "text": "Late meeting", "from_gcal": True, "gcal_event_id": "new2", "start_time": "15:00"},  # NEW
            {"id": "new_event1", "text": "Early meeting", "from_gcal": True, "gcal_event_id": "new1", "start_time": "09:00"},  # NEW
            {"id": "new_event3", "text": "All day event", "from_gcal": True, "gcal_event_id": "new3", "start_time": ""},  # NEW (all-day)
        ]
        
        fetched_calendar_ids = {"new1", "new2", "new3"}
        
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            existing_tasks,
            all_upserted_calendar, 
            fetched_calendar_ids
        )
        
        # Find the new events in result
        new_events = [t for t in result if t.get("gcal_event_id") in fetched_calendar_ids]
        
        # Verify all 3 new events are present
        assert len(new_events) == 3, "All 3 new events should be present"
        
        # Verify they appear at the top (after section) and are sorted correctly
        # All-day events first, then by time
        section_idx = next(i for i, t in enumerate(result) if t.get("is_section"))
        new_event_start = section_idx + 1
        
        # Check the order of new events
        assert result[new_event_start]["gcal_event_id"] == "new3"  # All-day first
        assert result[new_event_start + 1]["gcal_event_id"] == "new1"  # 09:00
        assert result[new_event_start + 2]["gcal_event_id"] == "new2"  # 15:00
        
        # Verify existing event maintains its position relative to manual task
        existing_idx = next(i for i, t in enumerate(result) if t.get("gcal_event_id") == "existing1")
        manual_idx = next(i for i, t in enumerate(result) if t.get("id") == "manual1")
        assert existing_idx < manual_idx, "Existing calendar event should still come before manual task"

    def test_no_grouping_when_existing_events_scattered(self):
        """Test that existing calendar events scattered throughout list don't get grouped together."""
        existing_tasks = [
            {"id": "cal1", "text": "Morning event", "from_gcal": True, "gcal_event_id": "cal1", "start_time": "09:00"},
            {"id": "manual1", "text": "Manual task 1"},
            {"id": "manual2", "text": "Manual task 2"},
            {"id": "cal2", "text": "Afternoon event", "from_gcal": True, "gcal_event_id": "cal2", "start_time": "14:00"},
            {"id": "manual3", "text": "Manual task 3"},
            {"id": "cal3", "text": "Evening event", "from_gcal": True, "gcal_event_id": "cal3", "start_time": "18:00"},
        ]
        
        # Add one new calendar event
        all_upserted_calendar = [
            {"id": "cal1", "text": "Morning event", "from_gcal": True, "gcal_event_id": "cal1", "start_time": "09:00"},
            {"id": "cal2", "text": "Afternoon event", "from_gcal": True, "gcal_event_id": "cal2", "start_time": "14:00"},
            {"id": "cal3", "text": "Evening event", "from_gcal": True, "gcal_event_id": "cal3", "start_time": "18:00"},
            {"id": "new_cal", "text": "New urgent meeting", "from_gcal": True, "gcal_event_id": "new_cal", "start_time": "11:00"}  # NEW
        ]
        
        fetched_calendar_ids = {"new_cal"}
        
        result = self.service._rebuild_tasks_preserving_calendar_positions(
            existing_tasks,
            all_upserted_calendar,
            fetched_calendar_ids
        )
        
        # Verify positions
        positions = {task.get("id") or task.get("gcal_event_id"): i for i, task in enumerate(result)}
        
        # New event should be at the top (position 0)
        assert positions["new_cal"] == 0, "New event should be at the very top"
        
        # Existing events should maintain their scattered positions
        # The pattern should be: new_cal, cal1, manual1, manual2, cal2, manual3, cal3
        expected_order = ["new_cal", "cal1", "manual1", "manual2", "cal2", "manual3", "cal3"]
        actual_order = [task.get("id") or task.get("gcal_event_id") for task in result]
        
        assert actual_order == expected_order, f"Expected order {expected_order}, got {actual_order}"
        
        # Verify cal1 is still before manual1, cal2 still before manual3, etc.
        assert positions["cal1"] < positions["manual1"], "cal1 should still come before manual1"
        assert positions["manual1"] < positions["manual2"], "manual1 should still come before manual2"
        assert positions["manual2"] < positions["cal2"], "manual2 should still come before cal2"
        assert positions["cal2"] < positions["manual3"], "cal2 should still come before manual3"
        assert positions["manual3"] < positions["cal3"], "manual3 should still come before cal3"