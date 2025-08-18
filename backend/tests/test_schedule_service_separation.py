"""
Tests for single responsibility separation in schedule service calendar sync methods.
Verifies that create_schedule_from_calendar_sync properly delegates to 
apply_calendar_webhook_update when a schedule already exists.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from backend.services.schedule_service import ScheduleService


class TestScheduleServiceSeparation:
    """Test separation of concerns between initial creation and updates."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_collection = Mock()
        # Patch the schedules_collection directly 
        self.patcher = patch('backend.services.schedule_service.get_user_schedules_collection')
        mock_get_collection = self.patcher.start()
        mock_get_collection.return_value = self.mock_collection
        self.service = ScheduleService()
        
    def teardown_method(self):
        """Clean up patches."""
        self.patcher.stop()

    def test_create_schedule_from_calendar_sync_delegates_when_schedule_exists(self):
        """Test that method delegates to webhook handler when schedule exists."""
        # Mock existing schedule found
        self.mock_collection.find_one.return_value = {
            "userId": "user123",
            "date": "2025-08-15T00:00:00",
            "schedule": []
        }
        
        # Mock the webhook method
        with patch.object(self.service, 'apply_calendar_webhook_update') as mock_webhook:
            mock_webhook.return_value = (True, {"schedule": [], "date": "2025-08-15"})
            
            result = self.service.create_schedule_from_calendar_sync(
                user_id="user123",
                date="2025-08-15",
                calendar_tasks=[]
            )
            
            # Verify delegation happened
            mock_webhook.assert_called_once_with("user123", "2025-08-15", [])
            assert result == (True, {"schedule": [], "date": "2025-08-15"})

    def test_create_schedule_from_calendar_sync_creates_when_no_schedule_exists(self):
        """Test that method creates new schedule when none exists."""
        # Mock no existing schedule found
        self.mock_collection.find_one.return_value = None
        
        # Mock the helper methods
        with patch.object(self.service, '_normalize_calendar_tasks') as mock_normalize, \
             patch.object(self.service, '_create_schedule_document') as mock_create_doc, \
             patch('backend.services.schedule_service.validate_schedule_document') as mock_validate, \
             patch.object(self.service, '_calculate_schedule_metadata') as mock_calc_meta, \
             patch('backend.services.schedule_service.format_timestamp') as mock_timestamp:
            
            # Set up mocks
            mock_normalize.return_value = [{"id": "cal1", "text": "Calendar Event"}]
            mock_create_doc.return_value = {
                "userId": "user123",
                "date": "2025-08-15T00:00:00",
                "schedule": [{"id": "cal1", "text": "Calendar Event"}],
                "metadata": {}
            }
            mock_validate.return_value = (True, None)
            mock_calc_meta.return_value = {"totalTasks": 1}
            mock_timestamp.return_value = "2025-08-15T10:00:00.000Z"
            self.mock_collection.insert_one.return_value = Mock(inserted_id="doc_id")
            
            # Execute
            result = self.service.create_schedule_from_calendar_sync(
                user_id="user123",
                date="2025-08-15",
                calendar_tasks=[{"id": "cal1", "text": "Calendar Event"}]
            )
            
            # Verify creation flow
            assert result[0] is True  # success
            assert "schedule" in result[1]
            assert len(result[1]["schedule"]) == 1
            
            # Verify methods called in creation flow
            mock_normalize.assert_called_once()
            mock_create_doc.assert_called_once()
            mock_validate.assert_called_once()
            self.mock_collection.insert_one.assert_called_once()

    @patch('backend.services.schedule_service.format_schedule_date')
    def test_create_schedule_from_calendar_sync_handles_date_formatting(self, mock_format_date):
        """Test that method properly formats dates for database queries."""
        mock_format_date.return_value = "2025-08-15T00:00:00"
        self.mock_collection.find_one.return_value = {"existing": "schedule"}
        
        with patch.object(self.service, 'apply_calendar_webhook_update') as mock_webhook:
            mock_webhook.return_value = (True, {})
            
            self.service.create_schedule_from_calendar_sync(
                user_id="user123",
                date="2025-08-15",
                calendar_tasks=[]
            )
            
            # Verify date formatting was called
            mock_format_date.assert_called_once_with("2025-08-15")
            
            # Verify database query used formatted date
            self.mock_collection.find_one.assert_called_once_with({
                "userId": "user123",
                "date": "2025-08-15T00:00:00"
            })

    def test_create_schedule_from_calendar_sync_error_handling(self):
        """Test that method properly handles and reports errors."""
        # Mock database error
        self.mock_collection.find_one.side_effect = Exception("Database error")
        
        result = self.service.create_schedule_from_calendar_sync(
            user_id="user123",
            date="2025-08-15",
            calendar_tasks=[]
        )
        
        # Verify error response
        assert result[0] is False  # failure
        assert "error" in result[1]
        assert "Failed to sync calendar schedule" in result[1]["error"]

    def test_create_schedule_from_calendar_sync_validation_failure(self):
        """Test handling of schedule validation failures during creation."""
        # Mock no existing schedule
        self.mock_collection.find_one.return_value = None
        
        with patch.object(self.service, '_normalize_calendar_tasks') as mock_normalize, \
             patch.object(self.service, '_create_schedule_document') as mock_create_doc, \
             patch('backend.services.schedule_service.validate_schedule_document') as mock_validate:
            
            mock_normalize.return_value = []
            # Create a document with proper structure but that will fail validation
            mock_create_doc.return_value = {
                "userId": "user123",
                "date": "2025-08-15T00:00:00",
                "schedule": [],
                "metadata": {"calendarSynced": True, "calendarEvents": 0}
            }
            mock_validate.return_value = (False, "Validation error")
            
            result = self.service.create_schedule_from_calendar_sync(
                user_id="user123",
                date="2025-08-15",
                calendar_tasks=[]
            )
            
            # Verify validation failure handling
            assert result[0] is False
            assert "Schedule validation failed" in result[1]["error"]
            
            # Verify database insert was not called
            self.mock_collection.insert_one.assert_not_called()

    def test_create_schedule_from_calendar_sync_metadata_calculation(self):
        """Test that method properly calculates metadata for new schedules."""
        # Mock no existing schedule
        self.mock_collection.find_one.return_value = None
        
        calendar_tasks = [
            {"id": "cal1", "text": "Event 1", "gcal_event_id": "gcal1"},
            {"id": "cal2", "text": "Event 2", "gcal_event_id": "gcal2"}
        ]
        
        with patch.object(self.service, '_normalize_calendar_tasks') as mock_normalize, \
             patch.object(self.service, '_create_schedule_document') as mock_create_doc, \
             patch('backend.services.schedule_service.validate_schedule_document') as mock_validate, \
             patch.object(self.service, '_calculate_schedule_metadata') as mock_calc_meta, \
             patch('backend.services.schedule_service.format_timestamp') as mock_timestamp:
            
            normalized_tasks = [
                {"id": "cal1", "text": "Event 1", "gcal_event_id": "gcal1", "from_gcal": True},
                {"id": "cal2", "text": "Event 2", "gcal_event_id": "gcal2", "from_gcal": True}
            ]
            
            mock_normalize.return_value = normalized_tasks
            mock_create_doc.return_value = {
                "schedule": normalized_tasks,
                "metadata": {"calendarSynced": True, "calendarEvents": 2}
            }
            mock_validate.return_value = (True, None)
            mock_calc_meta.return_value = {"totalTasks": 2, "calendarEvents": 2}
            mock_timestamp.return_value = "2025-08-15T10:00:00.000Z"
            self.mock_collection.insert_one.return_value = Mock()
            
            result = self.service.create_schedule_from_calendar_sync(
                user_id="user123",
                date="2025-08-15", 
                calendar_tasks=calendar_tasks
            )
            
            # Verify metadata is properly calculated and included
            assert result[0] is True
            metadata = result[1]["metadata"]
            assert metadata["calendarEvents"] == 2
            assert metadata["source"] == "calendar_sync"
            assert metadata["calendarSynced"] is True
            assert "generatedAt" in metadata
            assert "lastModified" in metadata