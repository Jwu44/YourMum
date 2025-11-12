"""
Unit tests for performance-optimized schedule lookup methods.
Verifies that range query optimizations maintain correct behavior.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from backend.services.schedule_service import ScheduleService
from backend.models.schedule_schema import format_schedule_date


class TestScheduleServicePerformance:
    """Test performance-optimized lookup methods."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_collection = Mock()
        self.patcher = patch('backend.services.schedule_service.get_user_schedules_collection')
        mock_get_collection = self.patcher.start()
        mock_get_collection.return_value = self.mock_collection
        self.service = ScheduleService()

    def teardown_method(self):
        """Clean up patches."""
        self.patcher.stop()

    def test_find_most_recent_schedule_matching_returns_first_valid(self):
        """Test that helper returns first schedule matching validation function."""
        # Mock cursor with 3 schedules
        mock_schedules = [
            {"date": "2025-08-15T00:00:00", "schedule": []},  # No tasks (should skip)
            {"date": "2025-08-14T00:00:00", "schedule": [{"text": "task1"}]},  # Has tasks (should return)
            {"date": "2025-08-13T00:00:00", "schedule": [{"text": "task2"}]}   # Not reached
        ]
        self.mock_collection.find.return_value.sort.return_value = iter(mock_schedules)

        def has_tasks(schedule):
            return len(schedule.get('schedule', [])) > 0

        result = self.service._find_most_recent_schedule_matching(
            user_id="user123",
            before_date="2025-08-16",
            max_days_back=30,
            validation_func=has_tasks
        )

        assert result is not None
        assert result["date"] == "2025-08-14T00:00:00"

    def test_find_most_recent_schedule_matching_returns_none_when_no_match(self):
        """Test helper returns None when no schedules match validation."""
        mock_schedules = [
            {"date": "2025-08-15T00:00:00", "schedule": []},
            {"date": "2025-08-14T00:00:00", "schedule": []}
        ]
        self.mock_collection.find.return_value.sort.return_value = iter(mock_schedules)

        def has_tasks(schedule):
            return len(schedule.get('schedule', [])) > 0

        result = self.service._find_most_recent_schedule_matching(
            user_id="user123",
            before_date="2025-08-16",
            max_days_back=30,
            validation_func=has_tasks
        )

        assert result is None

    def test_get_most_recent_schedule_with_tasks_optimized(self):
        """Test optimized version finds schedule with non-section tasks."""
        mock_schedules = [
            {
                "date": "2025-08-15T00:00:00",
                "schedule": [
                    {"text": "Section 1", "is_section": True},
                    {"text": "Task 1", "completed": False}
                ]
            }
        ]
        self.mock_collection.find.return_value.sort.return_value = iter(mock_schedules)

        result = self.service.get_most_recent_schedule_with_tasks(
            user_id="user123",
            before_date="2025-08-16",
            max_days_back=30
        )

        assert result is not None
        assert len(result["schedule"]) == 2

    def test_get_most_recent_schedule_with_inputs_optimized(self):
        """Test optimized version finds schedule with meaningful inputs."""
        mock_schedules = [
            {
                "date": "2025-08-15T00:00:00",
                "inputs": {"name": "Test User", "work_start_time": "09:00"}
            }
        ]
        self.mock_collection.find.return_value.sort.return_value = iter(mock_schedules)

        result = self.service._get_most_recent_schedule_with_inputs(
            user_id="user123",
            target_date="2025-08-16",
            max_days_back=30
        )

        assert result is not None
        assert result["inputs"]["name"] == "Test User"

    def test_get_recurring_tasks_for_date_optimized(self):
        """Test optimized version finds all recurring tasks across multiple schedules."""
        mock_schedules = [
            {
                "date": "2025-08-15T00:00:00",
                "schedule": [
                    {
                        "text": "Daily standup",
                        "is_recurring": {"frequency": "daily", "status": "active"},
                        "is_section": False
                    }
                ]
            },
            {
                "date": "2025-08-14T00:00:00",
                "schedule": [
                    {
                        "text": "Weekly review",
                        "is_recurring": {"frequency": "weekly", "dayOfWeek": "Wednesday", "status": "active"},
                        "is_section": False
                    }
                ]
            }
        ]
        self.mock_collection.find.return_value.sort.return_value = iter(mock_schedules)

        # Mock _should_task_recur_on_date to return True for testing
        with patch.object(self.service, '_should_task_recur_on_date', return_value=True):
            result = self.service._get_recurring_tasks_for_date(
                user_id="user123",
                target_date="2025-08-16",
                max_days_back=30
            )

        assert len(result) == 2
        assert result[0]["text"] == "Daily standup"
        assert result[1]["text"] == "Weekly review"
        # Verify all have new IDs and correct date
        for task in result:
            assert task["start_date"] == "2025-08-16"
            assert task["completed"] is False

    def test_query_efficiency_single_find_call(self):
        """Verify that optimized methods make only 1 MongoDB query."""
        self.mock_collection.find.return_value.sort.return_value = iter([])

        # Call optimized method
        self.service.get_most_recent_schedule_with_tasks(
            user_id="user123",
            before_date="2025-08-16",
            max_days_back=30
        )

        # Verify only 1 find() call (not 30)
        assert self.mock_collection.find.call_count == 1

        # Verify the query uses date range
        call_args = self.mock_collection.find.call_args[0][0]
        assert "date" in call_args
        assert "$gte" in call_args["date"]
        assert "$lt" in call_args["date"]

    def test_helper_method_uses_correct_date_range(self):
        """Verify helper method constructs correct date range query."""
        self.mock_collection.find.return_value.sort.return_value = iter([])

        def always_false(schedule):
            return False

        self.service._find_most_recent_schedule_matching(
            user_id="user123",
            before_date="2025-08-16",
            max_days_back=7,
            validation_func=always_false
        )

        # Extract the query that was passed to find()
        call_args = self.mock_collection.find.call_args[0][0]

        # Verify userId filter
        assert call_args["userId"] == "user123"

        # Verify date range filter
        assert "$gte" in call_args["date"]
        assert "$lt" in call_args["date"]

        # Verify date range spans exactly 7 days
        # 2025-08-16 going back 7 days should start at 2025-08-09
        assert "2025-08-09" in call_args["date"]["$gte"]
        assert "2025-08-16" in call_args["date"]["$lt"]
