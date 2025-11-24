"""
Test first-time user priority layout rendering.

Tests that first-time users get a priority layout with High/Medium/Low sections,
and that Google Calendar events are assigned to "High Priority" section.
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.services.schedule_service import ScheduleService


class TestFirstTimeUserPriorityLayout:
    """Test suite for first-time user priority layout functionality"""

    @patch('backend.services.schedule_service.get_users_collection')
    def test_first_time_user_without_calendar_creates_priority_sections(self, mock_get_users):
        """Test that first-time user without calendar gets priority sections"""

        # Setup mocks
        mock_schedules_collection = Mock()
        mock_users_collection = Mock()
        mock_get_users.return_value = mock_users_collection

        # Mock: no existing schedule
        mock_schedules_collection.find_one.return_value = None

        # Mock: no recent schedules (first-time user)
        mock_schedules_collection.find.return_value.sort.return_value.limit.return_value = []

        # Mock: no calendar connection
        mock_schedules_collection.database = {'users': Mock()}
        mock_schedules_collection.database['users'].find_one.return_value = {
            'googleId': 'test_user_123',
            'calendar': {
                'connected': False
            }
        }

        # Mock: successful database write
        mock_result = Mock()
        mock_result.upserted_id = None
        mock_schedules_collection.replace_one.return_value = mock_result

        # Create service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_schedules_collection

        # Call autogenerate for first-time user
        success, result = schedule_service.autogenerate_schedule(
            user_id='test_user_123',
            date='2025-01-20'
        )

        # Verify success
        assert success is True
        assert result['created'] is True
        assert result['sourceFound'] is False

        # Verify priority sections and default tasks were created (interleaved)
        schedule = result['schedule']
        assert len(schedule) == 6  # 3 sections + 3 default tasks (interleaved)

        # Verify structure: High section + tasks, Medium section + task, Low section
        assert schedule[0]['text'] == "High Priority"
        assert schedule[0]['is_section'] is True

        assert schedule[1]['text'] == "Manually add tasks to YourMum"
        assert schedule[1]['section'] == "High Priority"
        assert schedule[1].get('is_section') is not True

        assert schedule[2]['text'] == "Fill out YourMum preferences"
        assert schedule[2]['section'] == "High Priority"
        assert schedule[2].get('is_section') is not True

        assert schedule[3]['text'] == "Medium Priority"
        assert schedule[3]['is_section'] is True

        assert schedule[4]['text'] == "Spend time with family"
        assert schedule[4]['section'] == "Medium Priority"
        assert schedule[4].get('is_section') is not True

        assert schedule[5]['text'] == "Low Priority"
        assert schedule[5]['is_section'] is True

    @patch('backend.services.schedule_service.calendar_service')
    @patch('backend.services.schedule_service.get_users_collection')
    def test_first_time_user_with_calendar_assigns_events_to_high_priority(
        self, mock_get_users, mock_calendar_service
    ):
        """Test that first-time user with calendar gets events in High Priority section"""

        # Setup mocks
        mock_schedules_collection = Mock()
        mock_users_collection = Mock()
        mock_get_users.return_value = mock_users_collection

        # Mock: no existing schedule
        mock_schedules_collection.find_one.return_value = None

        # Mock: no recent schedules (first-time user)
        mock_schedules_collection.find.return_value.sort.return_value.limit.return_value = []

        # Mock: has valid calendar connection
        mock_schedules_collection.database = {'users': Mock()}
        mock_schedules_collection.database['users'].find_one.return_value = {
            'googleId': 'test_user_123',
            'calendar': {
                'connected': True,
                'credentials': {'access_token': 'mock_token'}
            }
        }

        # Mock: successful database write
        mock_result = Mock()
        mock_result.upserted_id = None
        mock_schedules_collection.replace_one.return_value = mock_result

        # Mock: calendar events
        mock_calendar_service.get_calendar_tasks_for_user_date.return_value = [
            {
                'id': 'event_1',
                'text': 'Team Meeting',
                'start_time': '10:00',
                'end_time': '11:00',
                'gcal_event_id': 'gcal_123',
                'from_gcal': True,
                'source': 'calendar',
                'type': 'task',
                'completed': False
            },
            {
                'id': 'event_2',
                'text': 'Doctor Appointment',
                'start_time': '14:00',
                'end_time': '15:00',
                'gcal_event_id': 'gcal_456',
                'from_gcal': True,
                'source': 'calendar',
                'type': 'task',
                'completed': False
            }
        ]

        # Create service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_schedules_collection

        # Call autogenerate for first-time user with calendar
        success, result = schedule_service.autogenerate_schedule(
            user_id='test_user_123',
            date='2025-01-20'
        )

        # Verify success
        assert success is True
        assert result['created'] is True

        # Verify schedule structure with interleaved sections and tasks
        schedule = result['schedule']

        # Expected order: High section → High tasks → Calendar events → Medium section → Medium task → Low section
        assert schedule[0]['text'] == "High Priority"
        assert schedule[0]['is_section'] is True

        # High Priority default tasks
        assert schedule[1]['text'] == "Manually add tasks to YourMum"
        assert schedule[1]['section'] == "High Priority"
        assert schedule[2]['text'] == "Fill out YourMum preferences"
        assert schedule[2]['section'] == "High Priority"

        # Calendar events should be inserted after High Priority default tasks
        calendar_tasks = [t for t in schedule if t.get('from_gcal')]
        assert len(calendar_tasks) == 2

        # Find calendar events in schedule
        calendar_indices = [i for i, t in enumerate(schedule) if t.get('from_gcal')]
        assert len(calendar_indices) == 2

        # Calendar events should appear after the High Priority default tasks (indices 3,4)
        for idx in calendar_indices:
            assert idx > 2  # After High Priority default tasks at indices 1,2
            assert schedule[idx]['section'] == "High Priority"
            assert schedule[idx]['from_gcal'] is True

        # Find Medium Priority section (should appear after calendar events)
        medium_section_idx = next((i for i, t in enumerate(schedule) if t.get('is_section') and t.get('text') == "Medium Priority"), None)
        assert medium_section_idx is not None
        assert medium_section_idx > max(calendar_indices)  # Medium section after calendar events

        # Medium Priority default task should appear after Medium section
        medium_task_idx = next((i for i, t in enumerate(schedule) if not t.get('is_section') and t.get('section') == "Medium Priority" and not t.get('from_gcal')), None)
        assert medium_task_idx is not None
        assert medium_task_idx == medium_section_idx + 1
        assert schedule[medium_task_idx]['text'] == "Spend time with family"

        # Low Priority section should be last
        low_section_idx = next((i for i, t in enumerate(schedule) if t.get('is_section') and t.get('text') == "Low Priority"), None)
        assert low_section_idx is not None
        assert low_section_idx > medium_task_idx

    @patch('backend.services.schedule_service.get_users_collection')
    def test_create_empty_schedule_creates_priority_sections_for_first_time_user(
        self, mock_get_users
    ):
        """Test that create_empty_schedule creates priority sections for first-time users"""

        # Setup mocks
        mock_schedules_collection = Mock()
        mock_users_collection = Mock()
        mock_get_users.return_value = mock_users_collection

        # Mock: no recent schedules (first-time user)
        mock_schedules_collection.find.return_value.sort.return_value.limit.return_value = []

        # Mock: successful database write
        mock_result = Mock()
        mock_result.upserted_id = None
        mock_schedules_collection.replace_one.return_value = mock_result

        # Create service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_schedules_collection

        # Call create_empty_schedule for first-time user
        success, result = schedule_service.create_empty_schedule(
            user_id='test_user_123',
            date='2025-01-20',
            tasks=[]
        )

        # Verify success
        assert success is True

        # Verify priority sections were created
        schedule = result['schedule']
        assert len(schedule) == 3
        assert schedule[0]['text'] == "High Priority"
        assert schedule[0]['is_section'] is True
        assert schedule[1]['text'] == "Medium Priority"
        assert schedule[1]['is_section'] is True
        assert schedule[2]['text'] == "Low Priority"
        assert schedule[2]['is_section'] is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
