from types import SimpleNamespace
from unittest.mock import patch
import pytest


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

        def find_one(self, *args, **kwargs):
            return None

    return FakeCollection()


class TestAutogenerateTimezoneOverride:
    @patch('backend.services.calendar_service.get_database')
    @patch('backend.services.calendar_service.fetch_google_calendar_events')
    @patch('backend.services.schedule_service.ScheduleService._get_most_recent_schedule_with_inputs')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    @patch('backend.services.schedule_service.ScheduleService.get_schedule_by_date')
    def test_autogenerate_uses_timezone_override(
        self,
        mock_get_by_date,
        mock_recent_with_tasks,
        mock_recent_with_inputs,
        mock_fetch_events,
        mock_get_db,
        fake_collection
    ):
        # No existing schedule for target date
        mock_get_by_date.return_value = (False, {'error': 'No schedule'})

        # Source schedule with a single section
        mock_recent_with_tasks.return_value = {
            'date': '2025-08-11',
            'schedule': [
                _section('Morning')
            ]
        }
        mock_recent_with_inputs.return_value = {'inputs': {}}

        # Provide a minimal user document with timezone set to UTC
        class _Users:
            def __init__(self, user_doc):
                self._user_doc = user_doc

            def find_one(self, query):
                if query.get('googleId') == self._user_doc.get('googleId'):
                    return self._user_doc
                return None

            def update_one(self, *args, **kwargs):
                return SimpleNamespace(modified_count=1)

        user_doc = {
            'googleId': 'u1',
            'timezone': 'UTC',  # Stored timezone intentionally mismatched
            'calendar': {
                'connected': True,
                'credentials': {'accessToken': 'token'}
            }
        }
        mock_get_db.return_value = {'users': _Users(user_doc)}

        # Mock Google events and capture call args to assert timezone override is used
        mock_fetch_events.return_value = [
            {
                'id': 'ev-override',
                'summary': 'Overridden TZ Event',
                'status': 'confirmed',
                'start': {'dateTime': '2025-08-12T02:00:00Z'},
                'end': {'dateTime': '2025-08-12T03:00:00Z'}
            }
        ]

        from backend.services.schedule_service import schedule_service
        schedule_service.schedules_collection = fake_collection

        # Call with a timezone override that differs from stored UTC
        ok, result = schedule_service.autogenerate_schedule(
            'u1',
            '2025-08-12',
            user_timezone='Australia/Sydney'
        )

        assert ok is True

        # Assert fetch was called with the override timezone
        assert mock_fetch_events.call_count >= 1
        args, _ = mock_fetch_events.call_args
        # fetch_google_calendar_events(access_token, date, user_timezone)
        assert args[1] == '2025-08-12'
        assert args[2] == 'Australia/Sydney'

        # Ensure the returned schedule contains the mocked event
        titles = [t['text'] for t in result.get('schedule', []) if t.get('from_gcal')]
        assert 'Overridden TZ Event' in titles


