import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest

# Ensure imports work from project root
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))


def _section(text: str):
    return {
        'id': f'sec-{text}',
        'text': text,
        'categories': [],
        'is_section': True,
        'completed': False,
        'is_subtask': False,
        'section': None,
        'parent_id': None,
        'level': 0,
        'section_index': 0,
        'type': 'section'
    }


def _task(text: str, completed=False):
    return {
        'id': f't-{text}',
        'text': text,
        'categories': [],
        'is_section': False,
        'completed': completed,
        'type': 'task'
    }


def _gcal_task(event_id: str, text: str, start_time: str = None, end_time: str = None, completed=False):
    return {
        'id': f'g-{event_id}',
        'text': text,
        'categories': [],
        'is_section': False,
        'completed': completed,
        'type': 'task',
        'gcal_event_id': event_id,
        'from_gcal': True,
        'start_time': start_time,
        'end_time': end_time,
    }


@pytest.fixture
def fake_collection():
    class FakeCollection:
        def replace_one(self, *args, **kwargs):
            return SimpleNamespace(upserted_id='xyz')

    return FakeCollection()


class TestAutogenerateCalendarMerge:
    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    @patch('backend.services.schedule_service.ScheduleService._get_most_recent_schedule_with_inputs')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    @patch('backend.services.schedule_service.ScheduleService.get_schedule_by_date')
    def test_insert_block_after_first_section(
        self,
        mock_get_by_date,
        mock_recent_with_tasks,
        mock_recent_with_inputs,
        mock_get_calendar,
        fake_collection
    ):
        # No existing schedule for target date
        mock_get_by_date.return_value = (False, {'error': 'No schedule'})
        # Source schedule
        source_doc = {
            'date': '2025-01-20',
            'schedule': [
                _section('Morning'),
                _task('Manual A'),
                _section('Afternoon'),
            ]
        }
        mock_recent_with_tasks.return_value = source_doc
        mock_recent_with_inputs.return_value = {'inputs': {}}

        # Calendar events for target date
        mock_get_calendar.return_value = [
            _gcal_task('e2', 'Event B', '10:00', '11:00'),
            _gcal_task('e1', 'Event A', '08:00', '09:00'),
        ]

        from backend.services.schedule_service import schedule_service
        # Patch collection
        schedule_service.schedules_collection = fake_collection

        ok, result = schedule_service.autogenerate_schedule('u1', '2025-01-21')
        assert ok is True
        tasks = result['schedule']
        # Expect: first item is first section, then calendar block (sorted), then remaining sections/manual
        assert tasks[0]['is_section'] is True and tasks[0]['text'] == 'Morning'
        assert tasks[1].get('from_gcal') is True and tasks[1]['text'] == 'Event A'
        assert tasks[2].get('from_gcal') is True and tasks[2]['text'] == 'Event B'
        # After block, the next should be the next section
        assert any(t.get('is_section') and t['text'] == 'Afternoon' for t in tasks[3:])
        # Ensure calendar tasks are associated with first section
        assert tasks[1]['section'] == 'Morning' and tasks[2]['section'] == 'Morning'

    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    @patch('backend.services.schedule_service.ScheduleService._get_most_recent_schedule_with_inputs')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    @patch('backend.services.schedule_service.ScheduleService.get_schedule_by_date')
    def test_dedup_carryover_incomplete_gcal(
        self,
        mock_get_by_date,
        mock_recent_with_tasks,
        mock_recent_with_inputs,
        mock_get_calendar,
        fake_collection
    ):
        mock_get_by_date.return_value = (False, {'error': 'No schedule'})
        # Source schedule has incomplete gcal with id 'g1'
        source_doc = {
            'date': '2025-01-20',
            'schedule': [
                _section('Morning'),
                _gcal_task('g1', 'Carry Event', '09:00', '10:00', completed=False),
            ]
        }
        mock_recent_with_tasks.return_value = source_doc
        mock_recent_with_inputs.return_value = {'inputs': {}}

        # Calendar fetch for next day returns g1 and g2
        mock_get_calendar.return_value = [
            _gcal_task('g1', 'Fetched Event Same', '09:30', '10:30'),
            _gcal_task('g2', 'Fetched Event New', '11:00', '12:00'),
        ]

        from backend.services.schedule_service import schedule_service
        schedule_service.schedules_collection = fake_collection

        ok, result = schedule_service.autogenerate_schedule('u1', '2025-01-21')
        assert ok
        tasks = result['schedule']
        # Collect gcal ids in final schedule block
        gcal_ids = [t['gcal_event_id'] for t in tasks if t.get('from_gcal')]
        assert gcal_ids.count('g1') == 1
        assert gcal_ids.count('g2') == 1

    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date', side_effect=Exception('fail'))
    @patch('backend.services.schedule_service.ScheduleService._get_most_recent_schedule_with_inputs')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    @patch('backend.services.schedule_service.ScheduleService.get_schedule_by_date')
    def test_calendar_failure_does_not_block(
        self,
        mock_get_by_date,
        mock_recent_with_tasks,
        mock_recent_with_inputs,
        _mock_get_calendar,
        fake_collection
    ):
        mock_get_by_date.return_value = (False, {'error': 'No schedule'})
        source_doc = {
            'date': '2025-01-20',
            'schedule': [
                _section('Morning'),
                _task('Manual A')
            ]
        }
        mock_recent_with_tasks.return_value = source_doc
        mock_recent_with_inputs.return_value = {'inputs': {}}

        from backend.services.schedule_service import schedule_service
        schedule_service.schedules_collection = fake_collection

        ok, result = schedule_service.autogenerate_schedule('u1', '2025-01-21')
        assert ok
        tasks = result['schedule']
        # Should not raise; should include at least sections and manual/recurring parts; no gcal
        assert any(t.get('is_section') for t in tasks)
        assert all(not t.get('from_gcal') for t in tasks if not t.get('is_section'))

    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    @patch('backend.services.schedule_service.ScheduleService._get_most_recent_schedule_with_inputs')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    @patch('backend.services.schedule_service.ScheduleService.get_schedule_by_date')
    def test_no_sections_places_calendar_at_top(
        self,
        mock_get_by_date,
        mock_recent_with_tasks,
        mock_recent_with_inputs,
        mock_get_calendar,
        fake_collection
    ):
        mock_get_by_date.return_value = (False, {'error': 'No schedule'})
        source_doc = {
            'date': '2025-01-20',
            'schedule': [
                _task('Manual A'),
            ]
        }
        mock_recent_with_tasks.return_value = source_doc
        mock_recent_with_inputs.return_value = {'inputs': {}}

        mock_get_calendar.return_value = [
            _gcal_task('e1', 'Event A', '08:00', '09:00'),
            _gcal_task('e2', 'Event B', '10:00', '11:00'),
        ]

        from backend.services.schedule_service import schedule_service
        schedule_service.schedules_collection = fake_collection

        ok, result = schedule_service.autogenerate_schedule('u1', '2025-01-21')
        assert ok
        tasks = result['schedule']
        # Calendar at top when no sections exist
        assert tasks[0].get('from_gcal') is True
        assert tasks[1].get('from_gcal') is True
        # Manual comes after
        assert any(t['text'] == 'Manual A' for t in tasks[2:])


