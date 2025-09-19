"""
Test autogenerate schedule behavior for first-time users with calendar connections.

This test suite verifies the fix for the bug where first-time users with Google Calendar
get empty schedules instead of calendar-synced schedules.
"""

import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Ensure project root is on sys.path for 'backend' imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.services.schedule_service import ScheduleService


class TestAutogenerateFirstTimeCalendar(unittest.TestCase):
    """Test autogenerate behavior for first-time users with calendar integration."""

    def setUp(self):
        """Set up test fixtures."""
        # Mock the database collection
        self.mock_collection = MagicMock()
        self.mock_database = MagicMock()
        self.mock_collection.database = self.mock_database

        # Patch the collection function
        self.patcher = patch('backend.services.schedule_service.get_user_schedules_collection')
        mock_get_collection = self.patcher.start()
        mock_get_collection.return_value = self.mock_collection

        self.service = ScheduleService()
        self.test_user_id = "test_user_123"
        self.test_date = "2025-01-20"

        # Mock calendar tasks that would be fetched
        self.mock_calendar_tasks = [
            {
                "id": "cal_task_1",
                "text": "Team Meeting",
                "start_time": "09:00",
                "end_time": "10:00",
                "from_gcal": True,
                "gcal_event_id": "gcal_123",
                "type": "task",
                "completed": False
            },
            {
                "id": "cal_task_2",
                "text": "Lunch with Client",
                "start_time": "12:00",
                "end_time": "13:00",
                "from_gcal": True,
                "gcal_event_id": "gcal_456",
                "type": "task",
                "completed": False
            }
        ]

    def tearDown(self):
        """Clean up test fixtures."""
        self.patcher.stop()

    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    def test_autogenerate_first_time_user_with_calendar_creates_schedule(
        self, mock_get_recent, mock_get_calendar_tasks
    ):
        """Test: First-time user with calendar connection should get calendar-synced schedule."""
        # Arrange: No source schedule (first-time user)
        mock_get_recent.return_value = None
        mock_get_calendar_tasks.return_value = self.mock_calendar_tasks

        # Mock user with calendar connection
        mock_user_doc = {
            "googleId": self.test_user_id,
            "calendar": {
                "connected": True,
                "credentials": {"access_token": "valid_token"}
            }
        }

        # Mock no existing schedule for the date (Step 1 check)
        self.mock_collection.find_one.return_value = None

        # Set up database mocks
        self.mock_database['users'].find_one.return_value = mock_user_doc
        self.mock_collection.replace_one.return_value = MagicMock(upserted_id="new_schedule_id")

        # Act
        success, result = self.service.autogenerate_schedule(self.test_user_id, self.test_date)

        # Assert
        self.assertTrue(success)
        self.assertTrue(result['created'])
        self.assertFalse(result['existed'])
        self.assertTrue(result['sourceFound'])  # Calendar acts as source
        self.assertGreater(len(result['schedule']), 0)

        # Verify calendar tasks are included
        calendar_task_texts = [task['text'] for task in result['schedule'] if task.get('from_gcal')]
        self.assertIn("Team Meeting", calendar_task_texts)
        self.assertIn("Lunch with Client", calendar_task_texts)

    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    def test_autogenerate_first_time_user_without_calendar_returns_empty(self, mock_get_recent):
        """Test: First-time user without calendar should get empty schedule (existing behavior)."""
        # Arrange: No source schedule (first-time user)
        mock_get_recent.return_value = None

        # Mock user without calendar connection
        mock_user_doc = {
            "googleId": self.test_user_id,
            "calendar": {
                "connected": False,
                "credentials": None
            }
        }

        # Mock no existing schedule for the date (Step 1 check)
        self.mock_collection.find_one.return_value = None

        # Set up database mocks
        self.mock_database['users'].find_one.return_value = mock_user_doc

        # Act
        success, result = self.service.autogenerate_schedule(self.test_user_id, self.test_date)

        # Assert
        self.assertTrue(success)
        self.assertFalse(result['created'])
        self.assertFalse(result['existed'])
        self.assertFalse(result['sourceFound'])
        self.assertEqual(result['schedule'], [])

    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    def test_autogenerate_first_time_user_not_found_returns_empty(self, mock_get_recent):
        """Test: User not found in database should return empty schedule."""
        # Arrange: No source schedule and no user found
        mock_get_recent.return_value = None

        # Mock no existing schedule for the date (Step 1 check)
        self.mock_collection.find_one.return_value = None

        # Set up database mocks - no user found
        self.mock_database['users'].find_one.return_value = None

        # Act
        success, result = self.service.autogenerate_schedule(self.test_user_id, self.test_date)

        # Assert
        self.assertTrue(success)
        self.assertFalse(result['created'])
        self.assertFalse(result['existed'])
        self.assertFalse(result['sourceFound'])
        self.assertEqual(result['schedule'], [])

    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    def test_autogenerate_existing_user_uses_source_schedule(
        self, mock_get_recent, mock_get_calendar_tasks
    ):
        """Test: Existing user with source schedule should use autogenerate logic (unchanged behavior)."""
        # Arrange: Mock source schedule (existing user)
        mock_source_schedule = {
            "schedule": [
                {
                    "id": "existing_task_1",
                    "text": "Existing Task",
                    "completed": False,
                    "is_section": False
                }
            ],
            "inputs": {"name": "Test User"}
        }
        mock_get_recent.return_value = mock_source_schedule
        mock_get_calendar_tasks.return_value = self.mock_calendar_tasks

        # Mock no existing schedule for the date (Step 1 check)
        self.mock_collection.find_one.return_value = None

        # Set up mock for schedule replacement
        self.mock_collection.replace_one.return_value = MagicMock(upserted_id="updated_schedule_id")

        # Act
        success, result = self.service.autogenerate_schedule(self.test_user_id, self.test_date)

        # Assert
        self.assertTrue(success)
        self.assertTrue(result['created'])
        self.assertFalse(result['existed'])
        self.assertTrue(result['sourceFound'])

        # Verify both source tasks and calendar tasks are included
        schedule_texts = [task['text'] for task in result['schedule']]
        self.assertIn("Existing Task", schedule_texts)
        self.assertTrue("Team Meeting" in schedule_texts or "Lunch with Client" in schedule_texts)

    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    def test_autogenerate_calendar_check_database_error_fails_safe(self, mock_get_recent):
        """Test: Database error during calendar check should fail safe to empty schedule."""
        # Arrange: No source schedule
        mock_get_recent.return_value = None

        # Mock no existing schedule for the date (Step 1 check)
        self.mock_collection.find_one.return_value = None

        # Set up mock database to raise error
        self.mock_database['users'].find_one.side_effect = Exception("Database connection error")

        # Act
        success, result = self.service.autogenerate_schedule(self.test_user_id, self.test_date)

        # Assert: Should fail safe to empty schedule
        self.assertTrue(success)
        self.assertFalse(result['created'])
        self.assertFalse(result['existed'])
        self.assertFalse(result['sourceFound'])
        self.assertEqual(result['schedule'], [])

    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    def test_autogenerate_calendar_fetch_failure_creates_empty_schedule(
        self, mock_get_recent, mock_get_calendar_tasks
    ):
        """Test: Calendar fetch failure should still create empty schedule gracefully."""
        # Arrange: No source schedule (first-time user)
        mock_get_recent.return_value = None

        # Mock calendar fetch failure
        mock_get_calendar_tasks.side_effect = Exception("Calendar API error")

        # Mock user with calendar connection
        mock_user_doc = {
            "googleId": self.test_user_id,
            "calendar": {
                "connected": True,
                "credentials": {"access_token": "valid_token"}
            }
        }

        # Mock no existing schedule for the date (Step 1 check)
        self.mock_collection.find_one.return_value = None

        # Set up database mocks
        self.mock_database['users'].find_one.return_value = mock_user_doc
        self.mock_collection.replace_one.return_value = MagicMock(upserted_id="new_schedule_id")

        # Act
        success, result = self.service.autogenerate_schedule(self.test_user_id, self.test_date)

        # Assert: Should still succeed with empty schedule
        self.assertTrue(success)
        self.assertTrue(result['created'])
        self.assertFalse(result['existed'])
        self.assertTrue(result['sourceFound'])  # Calendar was attempted as source
        self.assertEqual(result['schedule'], [])  # Empty due to calendar fetch failure


if __name__ == "__main__":
    unittest.main()