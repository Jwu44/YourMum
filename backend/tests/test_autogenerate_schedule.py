import json
from unittest.mock import patch
import pytest
import sys
import os

# Ensure project root is on sys.path for 'backend' imports when running file directly
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


class TestAutogenerateScheduleAPI:
    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_autogenerate_requires_auth(self, mock_schedule_service, mock_get_user_from_token, client):
        resp = client.post(
            '/api/schedules/autogenerate',
            data=json.dumps({"date": "2025-01-20"}),
            content_type='application/json'
        )
        assert resp.status_code == 401
        data = json.loads(resp.data)
        assert data['success'] is False
        assert 'Authentication required' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_autogenerate_validates_date(self, mock_schedule_service, mock_get_user_from_token, client):
        mock_get_user_from_token.return_value = {'googleId': 'user123'}
        # Missing date
        resp = client.post(
            '/api/schedules/autogenerate',
            data=json.dumps({}),
            content_type='application/json',
            headers={'Authorization': 'Bearer mock-token'}
        )
        assert resp.status_code == 400
        data = json.loads(resp.data)
        assert data['success'] is False
        assert 'Missing required field: date' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_autogenerate_noop_when_schedule_exists(self, mock_schedule_service, mock_get_user_from_token, client):
        mock_get_user_from_token.return_value = {'googleId': 'user123'}
        mock_schedule_service.autogenerate_schedule.return_value = (
            True,
            {
                'existed': True,
                'created': False,
                'date': '2025-01-20',
                'schedule': []
            }
        )
        resp = client.post(
            '/api/schedules/autogenerate',
            data=json.dumps({"date": "2025-01-20"}),
            content_type='application/json',
            headers={'Authorization': 'Bearer mock-token'}
        )
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['success'] is True
        assert data['existed'] is True
        assert data['created'] is False
        mock_schedule_service.autogenerate_schedule.assert_called_once_with('user123', '2025-01-20')

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_autogenerate_no_source_returns_empty_state(self, mock_schedule_service, mock_get_user_from_token, client):
        mock_get_user_from_token.return_value = {'googleId': 'user123'}
        mock_schedule_service.autogenerate_schedule.return_value = (
            True,
            {
                'existed': False,
                'created': False,
                'sourceFound': False,
                'date': '2025-01-20',
                'schedule': []
            }
        )
        resp = client.post(
            '/api/schedules/autogenerate',
            data=json.dumps({"date": "2025-01-20"}),
            content_type='application/json',
            headers={'Authorization': 'Bearer mock-token'}
        )
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['success'] is True
        assert data['sourceFound'] is False
        assert data['created'] is False

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_autogenerate_creates_schedule(self, mock_schedule_service, mock_get_user_from_token, client):
        mock_get_user_from_token.return_value = {'googleId': 'user123'}
        mock_schedule_service.autogenerate_schedule.return_value = (
            True,
            {
                'existed': False,
                'created': True,
                'sourceFound': True,
                'date': '2025-01-20',
                'schedule': [
                    {'id': 'new1', 'text': 'Task A', 'is_section': False, 'start_date': '2025-01-20'}
                ]
            }
        )
        resp = client.post(
            '/api/schedules/autogenerate',
            data=json.dumps({"date": "2025-01-20"}),
            content_type='application/json',
            headers={'Authorization': 'Bearer mock-token'}
        )
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['success'] is True
        assert data['created'] is True
        assert data['sourceFound'] is True
        assert isinstance(data['schedule'], list)


class TestRecentWithTasksAPI:
    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_recent_with_tasks_requires_auth(self, mock_schedule_service, mock_get_user_from_token, client):
        resp = client.get('/api/schedules/recent-with-tasks?before=2025-01-20&days=30')
        assert resp.status_code == 401
        data = json.loads(resp.data)
        assert data['success'] is False
        assert 'Authentication required' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_recent_with_tasks_returns_none(self, mock_schedule_service, mock_get_user_from_token, client):
        mock_get_user_from_token.return_value = {'googleId': 'user123'}
        mock_schedule_service.get_most_recent_schedule_with_tasks.return_value = None
        resp = client.get(
            '/api/schedules/recent-with-tasks?before=2025-01-20&days=30',
            headers={'Authorization': 'Bearer mock-token'}
        )
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['success'] is True
        assert data['found'] is False

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_recent_with_tasks_returns_schedule(self, mock_schedule_service, mock_get_user_from_token, client):
        mock_get_user_from_token.return_value = {'googleId': 'user123'}
        mock_schedule_service.get_most_recent_schedule_with_tasks.return_value = {
            'date': '2025-01-18',
            'schedule': [{'id': 'a', 'text': 'X', 'is_section': False}],
            '_id': 'abc123'
        }
        resp = client.get(
            '/api/schedules/recent-with-tasks?before=2025-01-20&days=30',
            headers={'Authorization': 'Bearer mock-token'}
        )
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['success'] is True
        assert data['found'] is True
        assert data['date'] == '2025-01-18'
        assert isinstance(data['schedule'], list)

