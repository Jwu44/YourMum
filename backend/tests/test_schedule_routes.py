"""
Test module for schedule API routes.

Tests the schedule endpoints including the optimized bulk available-dates endpoint,
following TDD approach from dev-guide.md.
"""

import pytest
from flask import Flask
from unittest.mock import patch, MagicMock
from backend.apis.routes import api_bp


class TestScheduleRoutes:
    """Test cases for schedule API routes."""

    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        app = Flask(__name__)
        app.register_blueprint(api_bp, url_prefix='/api')
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_get_available_dates_success(self, mock_schedule_service, mock_get_user, client):
        """Test successful retrieval of available dates in range."""
        # Mock user authentication
        mock_get_user.return_value = {
            'googleId': 'test-user-123',
            'email': 'test@example.com'
        }

        # Mock schedule service response
        mock_schedule_service.get_available_dates_in_range.return_value = (True, {
            'available_dates': ['2025-01-15', '2025-01-20', '2025-01-25']
        })

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'start_date': '2025-01-01',
                'end_date': '2025-01-31'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'available_dates' in data
        assert len(data['available_dates']) == 3
        assert '2025-01-15' in data['available_dates']

        # Verify service was called with correct parameters
        mock_schedule_service.get_available_dates_in_range.assert_called_once_with(
            'test-user-123',
            '2025-01-01',
            '2025-01-31'
        )

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_get_available_dates_empty_result(self, mock_schedule_service, mock_get_user, client):
        """Test available dates endpoint with no schedules in range."""
        # Mock user authentication
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        # Mock empty result from service
        mock_schedule_service.get_available_dates_in_range.return_value = (True, {
            'available_dates': []
        })

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'start_date': '2025-02-01',
                'end_date': '2025-02-28'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['available_dates'] == []

    @patch('backend.apis.routes.get_user_from_token')
    def test_get_available_dates_missing_auth(self, mock_get_user, client):
        """Test available dates endpoint without authentication."""
        response = client.post('/api/schedules/available-dates',
            json={
                'start_date': '2025-01-01',
                'end_date': '2025-01-31'
            }
        )

        assert response.status_code == 401
        data = response.get_json()
        assert data['success'] is False
        assert 'Authentication required' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    def test_get_available_dates_invalid_token(self, mock_get_user, client):
        """Test available dates endpoint with invalid auth token."""
        # Mock invalid user
        mock_get_user.return_value = None

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer invalid-token'},
            json={
                'start_date': '2025-01-01',
                'end_date': '2025-01-31'
            }
        )

        assert response.status_code == 401
        data = response.get_json()
        assert data['success'] is False
        assert 'Invalid authentication token' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    def test_get_available_dates_missing_body(self, mock_get_user, client):
        """Test available dates endpoint without request body."""
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        response = client.post('/api/schedules/available-dates',
            headers={
                'Authorization': 'Bearer valid-token',
                'Content-Type': 'application/json'
            },
            data=None
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'Request body required' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    def test_get_available_dates_missing_start_date(self, mock_get_user, client):
        """Test available dates endpoint without start_date parameter."""
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={'end_date': '2025-01-31'}
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'start_date and end_date are required' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    def test_get_available_dates_missing_end_date(self, mock_get_user, client):
        """Test available dates endpoint without end_date parameter."""
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={'start_date': '2025-01-01'}
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'start_date and end_date are required' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    def test_get_available_dates_invalid_date_format(self, mock_get_user, client):
        """Test available dates endpoint with invalid date format."""
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'start_date': '01/01/2025',  # Invalid format
                'end_date': '2025-01-31'
            }
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'Invalid date format' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_get_available_dates_service_error(self, mock_schedule_service, mock_get_user, client):
        """Test available dates endpoint with service error."""
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        # Mock service error
        mock_schedule_service.get_available_dates_in_range.return_value = (False, {
            'error': 'Database connection failed'
        })

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'start_date': '2025-01-01',
                'end_date': '2025-01-31'
            }
        )

        assert response.status_code == 500
        data = response.get_json()
        assert data['success'] is False
        assert 'Database connection failed' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_get_available_dates_large_range(self, mock_schedule_service, mock_get_user, client):
        """Test available dates endpoint with large date range (30+ days)."""
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        # Mock result with many dates
        many_dates = [f'2025-01-{str(i).zfill(2)}' for i in range(1, 32)]
        mock_schedule_service.get_available_dates_in_range.return_value = (True, {
            'available_dates': many_dates
        })

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'start_date': '2025-01-01',
                'end_date': '2025-01-31'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['available_dates']) == 31

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.schedule_service')
    def test_get_available_dates_single_day_range(self, mock_schedule_service, mock_get_user, client):
        """Test available dates endpoint with single day range."""
        mock_get_user.return_value = {'googleId': 'test-user-123'}

        mock_schedule_service.get_available_dates_in_range.return_value = (True, {
            'available_dates': ['2025-01-15']
        })

        response = client.post('/api/schedules/available-dates',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'start_date': '2025-01-15',
                'end_date': '2025-01-15'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['available_dates']) == 1
        assert data['available_dates'][0] == '2025-01-15'
