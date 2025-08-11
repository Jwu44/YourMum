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


@patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "cid", "GOOGLE_CLIENT_SECRET": "csecret"}, clear=False)
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.fetch_google_calendar_events')
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-789')
@patch('backend.apis.calendar_routes.get_database')
def test_token_refresh_on_expired_access_token(mock_get_db, _mock_token, mock_fetch_events, mock_post, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        # Expired token in the past
        expired_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        mock_users.find_one.return_value = {
            'googleId': 'u-789',
            'calendar': {
                'connected': True,
                'credentials': {
                    'accessToken': 'old-token',
                    'refreshToken': 'refresh-xyz',
                    'expiresAt': expired_at
                }
            }
        }

        # Mock refresh token response
        refresh_response = MagicMock()
        refresh_response.status_code = 200
        refresh_response.json.return_value = {
            'access_token': 'new-token',
            'expires_in': 3600
        }
        mock_post.return_value = refresh_response

        mock_fetch_events.return_value = []

        date = '2025-07-29'
        resp = client.get(
            f'/api/calendar/events?date={date}',
            headers={'Authorization': 'Bearer any-token'}
        )

        assert resp.status_code == 200
        # Called Google token endpoint
        assert mock_post.called
        url, kwargs = mock_post.call_args
        assert 'oauth2' in url[0]
        assert kwargs['data']['grant_type'] == 'refresh_token'
        assert kwargs['data']['refresh_token'] == 'refresh-xyz'
        assert kwargs['data']['client_id'] == 'cid'
        assert kwargs['data']['client_secret'] == 'csecret'

        # Stored credentials updated
        assert mock_users.update_one.called
        call_args, call_kwargs = mock_users.update_one.call_args
        update_doc = call_kwargs if call_kwargs else call_args[1]
        set_doc = update_doc['$set']
        assert set_doc['calendar.credentials']['accessToken'] == 'new-token'
        assert 'expiresAt' in set_doc['calendar.credentials']

        # Fetch events called with new token
        args, _ = mock_fetch_events.call_args
        assert args[0] == 'new-token'


@patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "cid", "GOOGLE_CLIENT_SECRET": "csecret"}, clear=False)
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-000')
@patch('backend.apis.calendar_routes.get_database')
def test_token_refresh_failure_returns_error(mock_get_db, _mock_token, mock_post, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        expired_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        mock_users.find_one.return_value = {
            'googleId': 'u-000',
            'calendar': {
                'connected': True,
                'credentials': {
                    'accessToken': 'old-token',
                    'refreshToken': 'refresh-abc',
                    'expiresAt': expired_at
                }
            }
        }

        # Refresh fails
        refresh_response = MagicMock()
        refresh_response.status_code = 400
        refresh_response.text = 'bad request'
        mock_post.return_value = refresh_response

        date = '2025-07-29'
        resp = client.get(
            f'/api/calendar/events?date={date}',
            headers={'Authorization': 'Bearer any-token'}
        )

        # GET should return 400 on failure to refresh
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['success'] is False
        assert 'Failed to refresh access token' in data['error']


