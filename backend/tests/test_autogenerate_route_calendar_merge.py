import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.apis.routes import api_bp


@pytest.fixture
def app():
    from flask import Flask
    app = Flask(__name__)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    with app.test_client() as client:
        yield client


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


def _gcal_task(event_id: str, text: str):
    return {
        'id': f'g-{event_id}',
        'text': text,
        'categories': [],
        'is_section': False,
        'completed': False,
        'type': 'task',
        'gcal_event_id': event_id,
        'from_gcal': True,
    }


class FakeCollection:
    def replace_one(self, *args, **kwargs):
        return SimpleNamespace(upserted_id='xyz')


class TestAutogenerateRouteCalendarMerge:
    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.services.calendar_service.get_calendar_tasks_for_user_date')
    @patch('backend.services.schedule_service.ScheduleService._get_most_recent_schedule_with_inputs')
    @patch('backend.services.schedule_service.ScheduleService.get_most_recent_schedule_with_tasks')
    @patch('backend.services.schedule_service.ScheduleService.get_schedule_by_date')
    def test_route_merges_calendar_block(
        self,
        mock_get_by_date,
        mock_recent_with_tasks,
        mock_recent_with_inputs,
        mock_get_calendar,
        mock_get_user,
        client
    ):
        # Auth
        mock_get_user.return_value = {'googleId': 'u1'}
        # No existing schedule
        mock_get_by_date.return_value = (False, {'error': 'No schedule'})
        # Source schedule with a first section
        source_doc = {
            'date': '2025-01-20',
            'schedule': [
                _section('Morning'),
            ]
        }
        mock_recent_with_tasks.return_value = source_doc
        mock_recent_with_inputs.return_value = {'inputs': {}}

        # Calendar tasks
        mock_get_calendar.return_value = [
            _gcal_task('e1', 'Event A'),
            _gcal_task('e2', 'Event B'),
        ]

        from backend.services.schedule_service import schedule_service
        schedule_service.schedules_collection = FakeCollection()

        resp = client.post(
            '/api/schedules/autogenerate',
            data=json.dumps({'date': '2025-01-21'}),
            content_type='application/json',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        payload = json.loads(resp.data)
        assert payload['success'] is True
        tasks = payload['schedule']
        # First is section
        assert tasks[0].get('is_section') is True
        # Next two are from calendar
        assert tasks[1].get('from_gcal') is True
        assert tasks[2].get('from_gcal') is True

