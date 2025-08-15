"""
Integration tests for schedule service calendar sync scenarios.
Tests both first-time creation and existing schedule update paths.
"""

import pytest
from unittest.mock import Mock, patch
from backend.services.schedule_service import ScheduleService


class TestScheduleServiceIntegration:
    """Integration tests for calendar sync scenarios."""

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

    def test_first_time_user_calendar_sync_flow(self):
        """Test complete flow for first-time user: create_schedule_from_calendar_sync creates new schedule."""
        # Mock no existing schedule (first-time user)
        self.mock_collection.find_one.return_value = None
        
        calendar_tasks = [
            {"id": "gcal1", "text": "Meeting", "gcal_event_id": "gcal1", "start_time": "09:00"},
            {"id": "gcal2", "text": "Call", "gcal_event_id": "gcal2", "start_time": "14:00"}
        ]
        
        with patch.object(self.service, '_normalize_calendar_tasks') as mock_normalize, \
             patch.object(self.service, '_create_schedule_document') as mock_create_doc, \
             patch('backend.services.schedule_service.validate_schedule_document') as mock_validate, \
             patch.object(self.service, '_calculate_schedule_metadata') as mock_calc_meta, \
             patch('backend.services.schedule_service.format_timestamp') as mock_timestamp:
            
            # Set up mocks for successful creation
            normalized_tasks = [
                {"id": "gcal1", "text": "Meeting", "gcal_event_id": "gcal1", "from_gcal": True, "completed": False},
                {"id": "gcal2", "text": "Call", "gcal_event_id": "gcal2", "from_gcal": True, "completed": False}
            ]
            mock_normalize.return_value = normalized_tasks
            mock_create_doc.return_value = {
                "userId": "user123",
                "date": "2025-08-15T00:00:00",
                "schedule": normalized_tasks,
                "metadata": {"calendarSynced": True, "calendarEvents": 2}
            }
            mock_validate.return_value = (True, None)
            mock_calc_meta.return_value = {"totalTasks": 2, "calendarEvents": 2}
            mock_timestamp.return_value = "2025-08-15T10:00:00.000Z"
            self.mock_collection.insert_one.return_value = Mock(inserted_id="new_schedule_id")
            
            # Execute first-time user flow
            success, result = self.service.create_schedule_from_calendar_sync(
                user_id="user123",
                date="2025-08-15",
                calendar_tasks=calendar_tasks
            )
            
            # Verify successful creation
            assert success is True
            assert "schedule" in result
            assert len(result["schedule"]) == 2
            assert result["metadata"]["calendarEvents"] == 2
            assert result["metadata"]["source"] == "calendar_sync"
            
            # Verify creation flow was used (not delegation)
            mock_normalize.assert_called_once_with(calendar_tasks, "2025-08-15")
            mock_create_doc.assert_called_once()
            self.mock_collection.insert_one.assert_called_once()

    def test_existing_user_calendar_sync_delegation(self):
        """Test delegation flow: create_schedule_from_calendar_sync delegates to webhook for existing schedule."""
        # Mock existing schedule found
        existing_schedule = {
            "userId": "user123",
            "date": "2025-08-15T00:00:00",
            "schedule": [
                {"id": "manual1", "text": "Manual task", "completed": False},
                {"id": "gcal1", "text": "Old meeting", "gcal_event_id": "gcal1", "from_gcal": True}
            ]
        }
        self.mock_collection.find_one.return_value = existing_schedule
        
        new_calendar_tasks = [
            {"id": "gcal1", "text": "Updated meeting", "gcal_event_id": "gcal1", "start_time": "10:00"},
            {"id": "gcal2", "text": "New call", "gcal_event_id": "gcal2", "start_time": "15:00"}
        ]
        
        # Mock the webhook method to verify delegation
        webhook_result = {
            "schedule": [
                {"id": "manual1", "text": "Manual task", "completed": False},
                {"id": "gcal1", "text": "Updated meeting", "gcal_event_id": "gcal1", "from_gcal": True},
                {"id": "gcal2", "text": "New call", "gcal_event_id": "gcal2", "from_gcal": True}
            ],
            "date": "2025-08-15",
            "metadata": {"totalTasks": 3, "calendarEvents": 2}
        }
        
        with patch.object(self.service, 'apply_calendar_webhook_update') as mock_webhook:
            mock_webhook.return_value = (True, webhook_result)
            
            # Execute existing user flow
            success, result = self.service.create_schedule_from_calendar_sync(
                user_id="user123", 
                date="2025-08-15",
                calendar_tasks=new_calendar_tasks
            )
            
            # Verify delegation happened
            mock_webhook.assert_called_once_with("user123", "2025-08-15", new_calendar_tasks)
            
            # Verify result from webhook method
            assert success is True
            assert result == webhook_result
            assert len(result["schedule"]) == 3  # Manual + 2 calendar tasks
            
            # Verify creation methods were NOT called (delegation instead)
            self.mock_collection.insert_one.assert_not_called()

    def test_webhook_update_preserves_positions(self):
        """Test that webhook update method preserves existing task positions."""
        existing_schedule = {
            "userId": "user123",
            "date": "2025-08-15T00:00:00",
            "schedule": [
                {"id": "manual1", "text": "Manual task 1", "completed": False, "section_index": 0},
                {"id": "gcal1", "text": "Old meeting", "gcal_event_id": "gcal1", "from_gcal": True, "section_index": 1},
                {"id": "manual2", "text": "Manual task 2", "completed": False, "section_index": 2},
                {"id": "gcal2", "text": "Old call", "gcal_event_id": "gcal2", "from_gcal": True, "section_index": 3}
            ],
            "metadata": {"calendarEvents": 2}
        }
        self.mock_collection.find_one.return_value = existing_schedule
        
        updated_calendar_tasks = [
            {"id": "gcal1", "text": "Updated meeting", "gcal_event_id": "gcal1", "start_time": "10:00"},
            {"id": "gcal3", "text": "New event", "gcal_event_id": "gcal3", "start_time": "16:00"}  # gcal2 removed, gcal3 added
        ]
        
        with patch.object(self.service, '_normalize_calendar_tasks') as mock_normalize, \
             patch.object(self.service, '_filter_calendar_tasks') as mock_filter_cal, \
             patch.object(self.service, '_filter_non_calendar_tasks') as mock_filter_non_cal, \
             patch.object(self.service, '_rebuild_tasks_preserving_calendar_positions') as mock_rebuild, \
             patch('backend.services.schedule_service.validate_schedule_document') as mock_validate, \
             patch('backend.services.schedule_service.format_timestamp') as mock_timestamp:
            
            # Mock helper methods
            normalized_calendar = [
                {"id": "gcal1", "text": "Updated meeting", "gcal_event_id": "gcal1", "from_gcal": True},
                {"id": "gcal3", "text": "New event", "gcal_event_id": "gcal3", "from_gcal": True}
            ]
            mock_normalize.return_value = normalized_calendar
            
            existing_calendar = [
                {"id": "gcal1", "text": "Old meeting", "gcal_event_id": "gcal1", "from_gcal": True, "section_index": 1},
                {"id": "gcal2", "text": "Old call", "gcal_event_id": "gcal2", "from_gcal": True, "section_index": 3}
            ]
            mock_filter_cal.return_value = existing_calendar
            
            non_calendar = [
                {"id": "manual1", "text": "Manual task 1", "completed": False, "section_index": 0},
                {"id": "manual2", "text": "Manual task 2", "completed": False, "section_index": 2}
            ]
            mock_filter_non_cal.return_value = non_calendar
            
            # Mock position preservation - gcal1 stays at position 1, gcal3 added at end, gcal2 removed
            preserved_tasks = [
                {"id": "manual1", "text": "Manual task 1", "completed": False, "section_index": 0},
                {"id": "gcal1", "text": "Updated meeting", "gcal_event_id": "gcal1", "from_gcal": True, "section_index": 1},
                {"id": "manual2", "text": "Manual task 2", "completed": False, "section_index": 2},
                {"id": "gcal3", "text": "New event", "gcal_event_id": "gcal3", "from_gcal": True, "section_index": 3}
            ]
            mock_rebuild.return_value = preserved_tasks
            
            mock_validate.return_value = (True, None)
            mock_timestamp.return_value = "2025-08-15T11:00:00.000Z"
            
            # Execute webhook update
            success, result = self.service.apply_calendar_webhook_update(
                user_id="user123",
                date="2025-08-15", 
                calendar_tasks=updated_calendar_tasks
            )
            
            # Verify position preservation was called
            mock_rebuild.assert_called_once()
            
            # Verify successful update with preserved positions
            assert success is True
            assert len(result["schedule"]) == 4
            
            # Verify specific position preservation
            schedule = result["schedule"]
            assert schedule[0]["id"] == "manual1"  # Manual task preserved at position 0
            assert schedule[1]["id"] == "gcal1"    # Calendar task preserved at position 1 (updated content)
            assert schedule[2]["id"] == "manual2"  # Manual task preserved at position 2
            assert schedule[3]["id"] == "gcal3"    # New calendar task added at end

    def test_error_handling_in_both_flows(self):
        """Test error handling works in both creation and delegation flows."""
        # Test creation flow error
        self.mock_collection.find_one.return_value = None
        self.mock_collection.insert_one.side_effect = Exception("Database error")
        
        success, result = self.service.create_schedule_from_calendar_sync(
            user_id="user123",
            date="2025-08-15",
            calendar_tasks=[]
        )
        
        assert success is False
        assert "Failed to sync calendar schedule" in result["error"]
        
        # Test delegation flow error
        self.mock_collection.find_one.return_value = {"existing": "schedule"}
        
        with patch.object(self.service, 'apply_calendar_webhook_update') as mock_webhook:
            mock_webhook.return_value = (False, {"error": "Webhook error"})
            
            success, result = self.service.create_schedule_from_calendar_sync(
                user_id="user123",
                date="2025-08-15", 
                calendar_tasks=[]
            )
            
            assert success is False
            assert result["error"] == "Webhook error"