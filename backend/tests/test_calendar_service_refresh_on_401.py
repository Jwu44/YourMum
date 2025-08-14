import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
import os
import sys

# Ensure project root on sys.path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def _mock_db_user(with_refresh_token: bool = True):
    mock_users = MagicMock()
    mock_db = MagicMock()
    mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()

    credentials = {
        'accessToken': 'old-token',
        'expiresAt': datetime.now(timezone.utc) + timedelta(hours=1)
    }
    if with_refresh_token:
        credentials['refreshToken'] = 'refresh-123'

    mock_users.find_one.return_value = {
        'googleId': 'u-123',
        'timezone': 'Australia/Sydney',
        'calendar': {
            'connected': True,
            'credentials': credentials
        }
    }
    return mock_db, mock_users


@patch('backend.services.calendar_service.fetch_google_calendar_events')
@patch('backend.apis.calendar_routes._ensure_access_token_valid')
@patch('backend.services.calendar_service.get_database')
def test_service_refresh_and_retry_on_permission_error(mock_get_db, mock_ensure, mock_fetch):
    # Arrange database/user
    mock_db, mock_users = _mock_db_user(with_refresh_token=True)
    mock_get_db.return_value = mock_db

    # First ensure call returns old token; second returns new token after refresh
    mock_ensure.side_effect = ['old-token', 'new-token']

    # First fetch raises 401 -> PermissionError, second returns one event
    mock_fetch.side_effect = [
        PermissionError('Unauthorized'),
        [
            {
                'id': 'e-1',
                'summary': 'Standup',
                'start': {'dateTime': '2025-08-15T00:30:00Z'},
                'end': {'dateTime': '2025-08-15T01:00:00Z'}
            }
        ]
    ]

    # Act
    from backend.services import calendar_service as cs
    tasks = cs.get_calendar_tasks_for_user_date('u-123', '2025-08-15', 'Australia/Sydney')

    # Assert
    assert isinstance(tasks, list)
    assert len(tasks) == 1
    # Ensure a retry happened with a refreshed token
    assert mock_fetch.call_count == 2
    first_call_args = mock_fetch.call_args_list[0][0]
    second_call_args = mock_fetch.call_args_list[1][0]
    assert first_call_args[0] == 'old-token'
    assert second_call_args[0] == 'new-token'


@patch('backend.apis.calendar_routes.requests.get')
def test_fetch_bubbles_permission_error_on_401(mock_get):
    # Simulate Google API 401
    resp = MagicMock()
    resp.status_code = 401
    resp.text = 'Unauthorized'
    mock_get.return_value = resp

    from backend.apis.calendar_routes import fetch_google_calendar_events

    with pytest.raises(PermissionError):
        fetch_google_calendar_events('any-token', '2025-08-15', 'Australia/Sydney')


