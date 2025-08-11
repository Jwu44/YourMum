import json
from unittest.mock import patch, MagicMock
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


@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-123')
@patch('backend.apis.calendar_routes.get_database')
def test_connect_persists_timezone(mock_get_db, _mock_token, client=None):
    # Lazy import to initialize app test client
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        mock_users.update_one.return_value = MagicMock(modified_count=1)

        payload = {
            'credentials': {
                'accessToken': 'at',
                'expiresAt': 1735600000000,
                'scopes': []
            },
            'timezone': 'Australia/Sydney'
        }

        resp = client.post(
            '/api/calendar/connect',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer any-token'}
        )

        assert resp.status_code == 200
        # Ensure timezone is persisted on user document
        assert mock_users.update_one.called
        call_args, call_kwargs = mock_users.update_one.call_args
        update_doc = call_kwargs if call_kwargs else call_args[1]
        set_doc = update_doc['$set']
        # New code should set user timezone at root level
        assert set_doc.get('timezone') == 'Australia/Sydney'


@patch('backend.apis.calendar_routes.fetch_google_calendar_events')
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-456')
@patch('backend.apis.calendar_routes.get_database')
def test_events_fallback_to_query_timezone(mock_get_db, _mock_token, mock_fetch_events, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        # User without timezone set, but with calendar creds
        mock_users.find_one.return_value = {
            'googleId': 'u-456',
            'calendar': {
                'connected': True,
                'credentials': { 'accessToken': 'at' }
            }
        }

        mock_fetch_events.return_value = []

        date = '2025-07-29'
        tz = 'America/New_York'
        resp = client.get(
            f'/api/calendar/events?date={date}&timezone={tz}',
            headers={'Authorization': 'Bearer any-token'}
        )

        assert resp.status_code == 200
        # Ensure we called fetch with query timezone since user has none
        assert mock_fetch_events.called
        args, _ = mock_fetch_events.call_args
        # args: (access_token, date, user_timezone)
        assert args[0] == 'at'
        assert args[1] == date
        assert args[2] == tz


