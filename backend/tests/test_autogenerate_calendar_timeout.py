import time
from types import SimpleNamespace
from unittest.mock import patch

import pytest

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


@pytest.fixture
def fake_collection():
    class FakeCollection:
        def replace_one(self, *args, **kwargs):
            return SimpleNamespace(upserted_id='xyz')

    return FakeCollection()


class TestAutogenerateCalendarTimeout:
    @patch('backend.services.schedule_service.ScheduleService._get_most_recent_schedule_with_inputs')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    @patch('backend.services.schedule_service.ScheduleService.get_schedule_by_date')
    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    def test_timeout_fallback_without_calendar(
        self,
        mock_get_calendar,
        mock_get_by_date,
        mock_recent_with_tasks,
        mock_recent_with_inputs,
        fake_collection
    ):
        mock_get_by_date.return_value = (False, {'error': 'No schedule'})
        source_doc = {
            'date': '2025-01-20',
            'schedule': [
                _section('Morning'),
            ]
        }
        mock_recent_with_tasks.return_value = source_doc
        mock_recent_with_inputs.return_value = {'inputs': {}}

        # Simulate slow calendar fetch
        def slow_fetch(*_args, **_kwargs):
            time.sleep(0.2)
            return [
                {'id': 'g1', 'text': 'Event', 'type': 'task', 'from_gcal': True, 'gcal_event_id': 'g1'}
            ]
        mock_get_calendar.side_effect = slow_fetch

        from backend.services.schedule_service import schedule_service
        schedule_service.schedules_collection = fake_collection

        # Patch timeout to small value so test is fast
        with patch('backend.services.schedule_service.ScheduleService._get_calendar_fetch_timeout', return_value=0.01):
            ok, result = schedule_service.autogenerate_schedule('u1', '2025-01-21')

        assert ok
        tasks = result['schedule']
        # Should not include calendar events due to timeout
        assert all(not t.get('from_gcal') for t in tasks)


