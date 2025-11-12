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

    def test_recurring_tasks_preserve_position_in_autogenerate(self):
        """Test that recurring tasks maintain their positions when autogenerating next day's schedule."""
        from datetime import datetime, timedelta
        from backend.models.schedule_schema import format_schedule_date

        # Set up dates: Day A (source) and Day B (target)
        day_a = "2025-08-15"
        day_b = "2025-08-16"
        formatted_day_a = format_schedule_date(day_a)
        formatted_day_b = format_schedule_date(day_b)

        # Create Day A schedule with recurring tasks in specific positions
        day_a_schedule = {
            "userId": "user123",
            "date": formatted_day_a,
            "schedule": [
                # Morning Section
                {"id": "morning_section", "text": "Morning", "is_section": True, "type": "section", "section_index": 0},
                {"id": "task1", "text": "Wake up", "completed": True, "section": "Morning"},  # Completed (won't carry over)
                {"id": "task2", "text": "Gym", "completed": True, "section": "Morning", "is_recurring": {"frequency": "daily", "status": "active"}},  # Recurring daily - COMPLETED but should still recur
                {"id": "task3", "text": "Breakfast", "completed": False, "section": "Morning"},  # Regular task

                # Afternoon Section
                {"id": "afternoon_section", "text": "Afternoon", "is_section": True, "type": "section", "section_index": 1},
                {"id": "task4", "text": "Lunch prep", "completed": False, "section": "Afternoon", "is_recurring": {"frequency": "daily", "status": "active"}},  # Recurring daily
                {"id": "task5", "text": "Team meeting", "completed": False, "section": "Afternoon"},  # Regular task

                # Evening Section
                {"id": "evening_section", "text": "Evening", "is_section": True, "type": "section", "section_index": 2},
                {"id": "task6", "text": "Dinner", "completed": False, "section": "Evening"},  # Regular task
                {"id": "task7", "text": "Read book", "completed": False, "section": "Evening", "is_recurring": {"frequency": "daily", "status": "active"}},  # Recurring daily
            ],
            "inputs": {"name": "Test User", "layout_preference": {"layout": "todolist-structured"}},
            "metadata": {"created_at": "2025-08-15T08:00:00.000Z", "source": "manual"}
        }

        # Mock database queries
        def mock_find_one(query, projection=None):
            if query.get("date") == formatted_day_b:
                return None  # Day B doesn't exist yet
            elif query.get("date") == formatted_day_a:
                return day_a_schedule  # Day A exists
            return None

        self.mock_collection.find_one.side_effect = mock_find_one

        # Mock find() for optimized range queries (returns cursor with day_a_schedule)
        self.mock_collection.find.return_value.sort.return_value = iter([day_a_schedule])

        # Mock the users collection for calendar check
        mock_users_collection = Mock()
        mock_users_collection.find_one.return_value = None  # No calendar connection
        self.mock_collection.database = {'users': mock_users_collection}

        self.mock_collection.replace_one.return_value = Mock(upserted_id="new_schedule_id")

        # Mock calendar service to return no events
        with patch('backend.services.schedule_service.calendar_service.get_calendar_tasks_for_user_date') as mock_calendar:
            mock_calendar.return_value = []

            # Execute autogenerate for Day B
            success, result = self.service.autogenerate_schedule(
                user_id="user123",
                date=day_b,
                max_days_back=30
            )

        # Verify successful autogeneration
        assert success is True
        assert result["created"] is True
        assert result["sourceFound"] is True

        # Verify the schedule structure
        day_b_schedule = result["schedule"]

        # Extract task texts for easier verification
        task_texts = [task.get("text") for task in day_b_schedule]

        # Verify sections are preserved
        assert "Morning" in task_texts
        assert "Afternoon" in task_texts
        assert "Evening" in task_texts

        # Find positions of recurring tasks and regular tasks
        positions = {task.get("text"): i for i, task in enumerate(day_b_schedule)}

        # Verify recurring tasks maintain their RELATIVE positions within sections
        morning_section_pos = positions["Morning"]
        afternoon_section_pos = positions["Afternoon"]
        evening_section_pos = positions["Evening"]

        # Morning section: Gym (recurring) should come before Breakfast (regular)
        assert "Gym" in task_texts, "Recurring task 'Gym' should be present"
        assert "Breakfast" in task_texts, "Regular task 'Breakfast' should be present"
        gym_pos = positions["Gym"]
        breakfast_pos = positions["Breakfast"]
        assert morning_section_pos < gym_pos < breakfast_pos < afternoon_section_pos, \
            f"Morning tasks should maintain order: Section({morning_section_pos}) < Gym({gym_pos}) < Breakfast({breakfast_pos}) < Afternoon({afternoon_section_pos})"

        # Afternoon section: Lunch prep (recurring) should come before Team meeting (regular)
        assert "Lunch prep" in task_texts, "Recurring task 'Lunch prep' should be present"
        assert "Team meeting" in task_texts, "Regular task 'Team meeting' should be present"
        lunch_pos = positions["Lunch prep"]
        meeting_pos = positions["Team meeting"]
        assert afternoon_section_pos < lunch_pos < meeting_pos < evening_section_pos, \
            f"Afternoon tasks should maintain order: Section({afternoon_section_pos}) < Lunch prep({lunch_pos}) < Team meeting({meeting_pos}) < Evening({evening_section_pos})"

        # Evening section: Dinner (regular) should come before Read book (recurring)
        assert "Dinner" in task_texts, "Regular task 'Dinner' should be present"
        assert "Read book" in task_texts, "Recurring task 'Read book' should be present"
        dinner_pos = positions["Dinner"]
        read_pos = positions["Read book"]
        assert evening_section_pos < dinner_pos < read_pos, \
            f"Evening tasks should maintain order: Section({evening_section_pos}) < Dinner({dinner_pos}) < Read book({read_pos})"

        # Verify completed tasks are NOT carried over
        assert "Wake up" not in task_texts, "Completed task 'Wake up' should not be carried over"

        # Verify all recurring tasks have new IDs (not the same as Day A)
        day_b_ids = {task.get("id") for task in day_b_schedule if not task.get("is_section")}
        day_a_ids = {task.get("id") for task in day_a_schedule["schedule"] if not task.get("is_section")}
        assert len(day_b_ids.intersection(day_a_ids)) == 0, "All tasks should have new IDs on Day B"

        # Verify recurring tasks still have their is_recurring config
        gym_task = next((t for t in day_b_schedule if t.get("text") == "Gym"), None)
        assert gym_task is not None
        assert gym_task.get("is_recurring") is not None
        assert gym_task["is_recurring"]["frequency"] == "daily"
        # IMPORTANT: Even though Gym was completed on Day A, it should be incomplete on Day B
        assert gym_task["completed"] is False, "Recurring task should reset to incomplete on new day"

        lunch_task = next((t for t in day_b_schedule if t.get("text") == "Lunch prep"), None)
        assert lunch_task is not None
        assert lunch_task.get("is_recurring") is not None

        read_task = next((t for t in day_b_schedule if t.get("text") == "Read book"), None)
        assert read_task is not None
        assert read_task.get("is_recurring") is not None