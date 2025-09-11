"""
Test OAuth token exchange endpoint for Google Calendar integration
"""
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
import sys
import os

# Ensure project root on sys.path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def _mock_db():
    mock_users = MagicMock()
    mock_db = MagicMock()
    mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()
    return mock_db, mock_users


@patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id", "GOOGLE_CLIENT_SECRET": "test-secret"}, clear=False)
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='test-user-123')
@patch('backend.apis.calendar_routes.get_database')
def test_oauth_exchange_success(mock_get_db, _mock_auth, mock_post):
    """Test successful OAuth token exchange"""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db
        
        # Mock Google token exchange response
        mock_token_response = {
            'access_token': 'new-access-token-123',
            'refresh_token': 'refresh-token-456',
            'expires_in': 3600,
            'scope': 'https://www.googleapis.com/auth/calendar.readonly',
            'token_type': 'Bearer'
        }
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_token_response
        mock_post.return_value = mock_response
        
        # Mock database update
        mock_users.update_one.return_value = MagicMock(modified_count=1)
        
        # Test request
        response = client.post('/api/calendar/oauth-exchange', 
                             headers={'Authorization': 'Bearer test-token'},
                             json={'authorization_code': 'auth-code-123'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'credentials' in data
        assert data['credentials']['accessToken'] == 'new-access-token-123'
        assert data['credentials']['refreshToken'] == 'refresh-token-456'


@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='test-user-123')
def test_oauth_exchange_missing_code(_mock_auth):
    """Test OAuth exchange with missing authorization code"""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        response = client.post('/api/calendar/oauth-exchange',
                             headers={'Authorization': 'Bearer test-token'},
                             json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'authorization_code' in data['error']


@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value=None)
def test_oauth_exchange_invalid_auth(_mock_auth):
    """Test OAuth exchange with invalid authentication"""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        response = client.post('/api/calendar/oauth-exchange',
                             headers={'Authorization': 'Bearer invalid-token'},
                             json={'authorization_code': 'auth-code-123'})
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'authentication' in data['error']


@patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id", "GOOGLE_CLIENT_SECRET": "test-secret"}, clear=False)
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='test-user-123')
def test_oauth_exchange_google_error(_mock_auth, mock_post):
    """Test OAuth exchange when Google returns error"""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = 'invalid_grant'
        mock_post.return_value = mock_response
        
        response = client.post('/api/calendar/oauth-exchange',
                             headers={'Authorization': 'Bearer test-token'},
                             json={'authorization_code': 'invalid-code'})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Google' in data['error']


if __name__ == '__main__':
    # Run individual tests
    test_oauth_exchange_success()
    test_oauth_exchange_missing_code()
    test_oauth_exchange_invalid_auth()
    test_oauth_exchange_google_error()
    print("✅ All OAuth exchange tests passed!")