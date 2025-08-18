"""
Test suite for schedule service helper methods.
Testing pure helper functions extracted during Phase 1 refactoring.
"""

import pytest
from typing import Dict, List, Any
from backend.services.schedule_service import ScheduleService


class TestScheduleServiceHelpers:
    """Test class for schedule service helper methods."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.service = ScheduleService()
        
        # Sample task data for testing
        self.sample_tasks = [
            {
                "id": "task1",
                "text": "Manual task",
                "completed": False,
                "is_section": False,
                "type": "task"
            },
            {
                "id": "task2", 
                "text": "Calendar event",
                "completed": False,
                "is_section": False,
                "from_gcal": True,
                "gcal_event_id": "gcal123",
                "type": "task"
            },
            {
                "id": "section1",
                "text": "Work Section",
                "completed": False,
                "is_section": True,
                "type": "section"
            },
            {
                "id": "task3",
                "text": "Completed manual task", 
                "completed": True,
                "is_section": False,
                "type": "task"
            }
        ]
        
        self.calendar_tasks = [
            {
                "id": "gcal1",
                "text": "Meeting",
                "gcal_event_id": "gcal_event_1",
                "start_time": "09:00",
                "end_time": "10:00"
            },
            {
                "text": "All day event",
                "gcal_event_id": "gcal_event_2"
            },
            {
                "id": "gcal3",
                "text": "No gcal_event_id task"
            }
        ]

    def test_normalize_calendar_tasks_empty_list(self):
        """Test normalizing empty calendar task list."""
        result = self.service._normalize_calendar_tasks([], "2025-08-15")
        assert result == []

    def test_normalize_calendar_tasks_adds_required_fields(self):
        """Test that normalize adds required fields to calendar tasks."""
        input_tasks = [
            {
                "id": "gcal1",
                "text": "Meeting",
                "gcal_event_id": "gcal_event_1"
            }
        ]
        
        result = self.service._normalize_calendar_tasks(input_tasks, "2025-08-15")
        
        assert len(result) == 1
        task = result[0]
        assert task["from_gcal"] is True
        assert task["type"] == "task"
        assert task["start_date"] == "2025-08-15"
        assert task["text"] == "Meeting"
        assert task["gcal_event_id"] == "gcal_event_1"

    def test_normalize_calendar_tasks_preserves_existing_fields(self):
        """Test that normalize preserves existing fields."""
        input_tasks = [
            {
                "id": "gcal1",
                "text": "Meeting",
                "gcal_event_id": "gcal_event_1",
                "type": "existing_type",
                "from_gcal": False,
                "start_time": "09:00"
            }
        ]
        
        result = self.service._normalize_calendar_tasks(input_tasks, "2025-08-15")
        
        task = result[0]
        assert task["from_gcal"] is True  # Should be overridden
        assert task["type"] == "existing_type"  # Should be preserved if exists
        assert task["start_time"] == "09:00"  # Should be preserved
        assert task["start_date"] == "2025-08-15"  # Should be set

    def test_normalize_calendar_tasks_handles_missing_fields(self):
        """Test normalize handles tasks with missing optional fields."""
        input_tasks = [
            {
                "text": "Minimal task",
                "gcal_event_id": "gcal_event_1"
            }
        ]
        
        result = self.service._normalize_calendar_tasks(input_tasks, "2025-08-15")
        
        task = result[0]
        assert task["from_gcal"] is True
        assert task["type"] == "task"
        assert task["start_date"] == "2025-08-15"

    def test_filter_calendar_tasks(self):
        """Test filtering calendar tasks from mixed list."""
        result = self.service._filter_calendar_tasks(self.sample_tasks)
        
        assert len(result) == 1
        assert result[0]["id"] == "task2"
        assert result[0]["from_gcal"] is True

    def test_filter_calendar_tasks_empty_list(self):
        """Test filtering calendar tasks from empty list."""
        result = self.service._filter_calendar_tasks([])
        assert result == []

    def test_filter_calendar_tasks_no_calendar_tasks(self):
        """Test filtering when no calendar tasks exist."""
        non_calendar_tasks = [
            {"id": "task1", "text": "Manual task", "type": "task"},
            {"id": "section1", "text": "Section", "is_section": True}
        ]
        
        result = self.service._filter_calendar_tasks(non_calendar_tasks)
        assert result == []

    def test_filter_non_calendar_tasks(self):
        """Test filtering non-calendar tasks from mixed list."""
        result = self.service._filter_non_calendar_tasks(self.sample_tasks)
        
        assert len(result) == 3
        task_ids = [task["id"] for task in result]
        assert "task1" in task_ids
        assert "section1" in task_ids  
        assert "task3" in task_ids
        assert "task2" not in task_ids  # Calendar task should be excluded

    def test_filter_section_tasks(self):
        """Test filtering section tasks from mixed list."""
        result = self.service._filter_section_tasks(self.sample_tasks)
        
        assert len(result) == 1
        assert result[0]["id"] == "section1"
        assert result[0]["is_section"] is True

    def test_filter_section_tasks_by_type(self):
        """Test filtering section tasks identified by type field."""
        tasks_with_type_section = [
            {"id": "task1", "text": "Regular task", "type": "task"},
            {"id": "section1", "text": "Section by type", "type": "section"},
            {"id": "section2", "text": "Section by flag", "is_section": True, "type": "task"}
        ]
        
        result = self.service._filter_section_tasks(tasks_with_type_section)
        
        assert len(result) == 2
        section_ids = [task["id"] for task in result]
        assert "section1" in section_ids
        assert "section2" in section_ids

    def test_filter_non_section_tasks(self):
        """Test filtering non-section tasks from mixed list."""
        result = self.service._filter_non_section_tasks(self.sample_tasks)
        
        assert len(result) == 3
        task_ids = [task["id"] for task in result]
        assert "task1" in task_ids
        assert "task2" in task_ids
        assert "task3" in task_ids
        assert "section1" not in task_ids  # Section should be excluded

    def test_filtering_preserves_task_structure(self):
        """Test that filtering preserves original task structure."""
        calendar_tasks = self.service._filter_calendar_tasks(self.sample_tasks)
        
        original_calendar_task = next(t for t in self.sample_tasks if t.get("from_gcal"))
        filtered_calendar_task = calendar_tasks[0]
        
        # Should be exact same object reference (no copying)
        assert filtered_calendar_task is original_calendar_task
        
        # Verify all fields preserved
        assert filtered_calendar_task["text"] == "Calendar event"
        assert filtered_calendar_task["gcal_event_id"] == "gcal123"
        assert filtered_calendar_task["from_gcal"] is True