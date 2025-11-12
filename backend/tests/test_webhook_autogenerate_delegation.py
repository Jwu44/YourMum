"""
Tests for calendar webhook behavior.

Webhooks are responsible for syncing calendar changes to EXISTING schedules only.
When no schedule exists, webhooks skip the update (schedule creation is deferred to autogenerate).
"""

import pytest
from unittest.mock import MagicMock, patch
from backend.services.schedule_service import ScheduleService


class TestWebhookBehavior:
    """Test suite for calendar webhook behavior."""

    def setup_method(self):
        """Setup test fixtures."""
        # Initialize service (it gets its own collection from db_config)
        self.service = ScheduleService()
        # Mock the collection for testing
        self.mock_collection = MagicMock()
        self.service.schedules_collection = self.mock_collection

    def test_webhook_skips_when_no_schedule_exists(self):
        """
        Test that webhook skips update when no schedule exists.
        Schedule creation is deferred to autogenerate when user visits the date.
        """
        user_id = "test-user-123"
        date = "2025-10-04"
        calendar_tasks = [
            {
                "id": "cal-1",
                "text": "Team Meeting",
                "gcal_event_id": "gcal-123",
                "from_gcal": True,
                "start_time": "10:00",
                "end_time": "11:00"
            }
        ]

        # Mock: No existing schedule for Oct 4
        self.mock_collection.find_one.return_value = None

        # Execute webhook update
        success, result = self.service.apply_calendar_webhook_update(
            user_id=user_id,
            date=date,
            calendar_tasks=calendar_tasks
        )

        # Verify webhook skipped the update
        assert success is True
        assert result["schedule"] == []
        assert result["metadata"]["message"] == "No schedule exists, webhook skipped"
        assert result["metadata"]["calendarSynced"] is False

        # Verify no database operations were performed
        self.mock_collection.insert_one.assert_not_called()
        self.mock_collection.update_one.assert_not_called()
        self.mock_collection.replace_one.assert_not_called()


    def test_webhook_with_existing_schedule_unchanged(self):
        """
        Test that existing schedule path is completely unchanged.
        This verifies we didn't break the update scenario.
        """
        user_id = "test-user-123"
        date = "2025-10-04"
        calendar_tasks = [
            {
                "id": "cal-new",
                "text": "New Event",
                "gcal_event_id": "gcal-new",
                "from_gcal": True
            }
        ]

        # Mock: Existing schedule with preferences
        existing_schedule = {
            "userId": user_id,
            "date": "2025-10-04T00:00:00",
            "schedule": [
                {"id": "s1", "text": "Morning", "is_section": True, "type": "section"},
                {"id": "t1", "text": "Existing task", "section": "Morning"}
            ],
            "inputs": {
                "layout_preference": {
                    "layout": "todolist-structured",
                    "subcategory": "day-sections"
                }
            },
            "metadata": {
                "source": "manual",
                "created_at": "2025-10-04T08:00:00"
            }
        }

        self.mock_collection.find_one.return_value = existing_schedule

        with patch.object(self.service, '_filter_non_calendar_tasks', return_value=[]):
            with patch.object(self.service, '_filter_calendar_tasks', return_value=[]):
                with patch.object(self.service, '_normalize_calendar_tasks', return_value=calendar_tasks):
                    with patch.object(self.service, '_upsert_calendar_tasks_by_id', return_value=calendar_tasks):
                        with patch.object(self.service, '_rebuild_tasks_preserving_calendar_positions', return_value=calendar_tasks):
                            with patch.object(self.service, '_serialize_tasks_for_storage', return_value=calendar_tasks):
                                with patch.object(self.service, 'autogenerate_schedule') as mock_autogen:
                                    success, result = self.service.apply_calendar_webhook_update(
                                        user_id=user_id,
                                        date=date,
                                        calendar_tasks=calendar_tasks
                                    )

                                    # Verify autogenerate was NEVER called (existing schedule path)
                                    mock_autogen.assert_not_called()

                                    # Verify update was called (not insert)
                                    self.mock_collection.update_one.assert_called_once()
                                    self.mock_collection.insert_one.assert_not_called()

