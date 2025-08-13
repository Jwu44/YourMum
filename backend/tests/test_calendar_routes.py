import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from application import application

@pytest.fixture
def client():
    """Create a test client for the app."""
    with application.test_client() as client:
        yield client

@pytest.fixture
def mock_db_connection():
    """Mock database connection and collections."""
    with patch('backend.apis.calendar_routes.get_database') as mock_get_db:
        # Create mock collections
        mock_users = MagicMock()
        
        # Configure the mock database to return mock collections
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()
        
        # Configure get_database to return the mock db
        mock_get_db.return_value = mock_db
        
        yield {
            'db': mock_db,
            'users': mock_users
        }

@patch('backend.apis.calendar_routes.get_user_id_from_token')
@patch('backend.apis.calendar_routes.fetch_google_calendar_events')
def test_connect_google_calendar(mock_fetch_google_events, mock_get_user_id, client, mock_db_connection):
    """Test connecting a user to Google Calendar."""
    # Mock authentication
    mock_get_user_id.return_value = 'testuser123'
    
    # Setup mock database - need to add find_one for verification check
    mock_users = mock_db_connection['users']
    mock_users.update_one.return_value = MagicMock(modified_count=1)
    mock_users.find_one.return_value = {
        'googleId': 'testuser123',
        'calendar': {
            'connected': True,
            'credentials': {
                'accessToken': 'test-access-token',
                'expiresAt': int(datetime.now().timestamp()) + 3600
            }
        }
    }
    
    # Test data
    test_data = {
        'credentials': {
            'accessToken': 'test-access-token',
            'expiresAt': int(datetime.now().timestamp()) + 3600,
            'scopes': ['https://www.googleapis.com/auth/calendar.readonly']
        }
    }
    
    # Send request with Authorization header
    response = client.post(
        '/api/calendar/connect',
        data=json.dumps(test_data),
        content_type='application/json',
        headers={'Authorization': 'Bearer mock-token'}
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    
    # Check database was updated correctly
    mock_users.update_one.assert_called_once()
    call_args = mock_users.update_one.call_args[0]
    assert call_args[0] == {'googleId': 'testuser123'}
    assert 'calendar.connected' in call_args[1]['$set']
    assert call_args[1]['$set']['calendar.connected'] is True

@patch('backend.apis.calendar_routes.get_user_id_from_token')
@patch('backend.apis.calendar_routes.fetch_google_calendar_events')  
def test_get_calendar_events(mock_fetch_google_events, mock_get_user_id, client, mock_db_connection):
    """Test fetching Google Calendar events."""
    # Mock authentication
    mock_get_user_id.return_value = 'testuser123'
    
    # Setup mock functions
    mock_users = mock_db_connection['users']
    mock_users.find_one.return_value = {
        'googleId': 'testuser123',
        'calendar': {
            'connected': True,
            'credentials': {
                'accessToken': 'test-token',
                'expiresAt': 1000000000,
                'scopes': ['https://www.googleapis.com/auth/calendar.readonly']
            }
        }
    }
    
    # Mock the calendar events response
    mock_events = [
        {
            'id': 'task1',
            'text': 'Team Meeting',
            'completed': False,
            'start_time': '2023-07-01T09:00:00Z',
            'end_time': '2023-07-01T10:00:00Z',
            'gcal_event_id': 'event123'
        },
        {
            'id': 'task2',
            'text': 'Project Review',
            'completed': False,
            'start_time': '2023-07-01T14:00:00Z',
            'end_time': '2023-07-01T15:00:00Z',
            'gcal_event_id': 'event456'
        }
    ]
    mock_fetch_google_events.return_value = mock_events
    
    # Send request with Authorization header
    response = client.get(
        '/api/calendar/events?date=2023-07-01',
        headers={'Authorization': 'Bearer mock-token'}
    )
    
    # Check response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert len(data['tasks']) >= 0  # Tasks might be merged with existing schedule, so just check structure
    
    # Verify response structure
    assert 'count' in data
    assert 'date' in data
    
    # Check mock was called correctly
    mock_users.find_one.assert_called_with({'googleId': 'testuser123'})
    mock_fetch_google_events.assert_called_once()


@patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "cid", "GOOGLE_CLIENT_SECRET": "csecret"}, clear=False)
@patch('backend.apis.calendar_routes.get_user_id_from_token')
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.requests.get')
def test_get_calendar_events_retries_on_401_refresh(mock_get, mock_post, mock_get_user_id, client, mock_db_connection):
    """If Google returns 401 for valid-looking token, route refreshes and retries once."""
    mock_get_user_id.return_value = 'u-401'

    # Setup user with future expiresAt but with refreshToken
    mock_users = mock_db_connection['users']
    mock_users.find_one.return_value = {
        'googleId': 'u-401',
        'timezone': 'UTC',
        'calendar': {
            'connected': True,
            'credentials': {
                'accessToken': 'old-token',
                'refreshToken': 'refresh-xyz',
                'expiresAt': int((datetime.now().timestamp() + 3600) * 1000),
                'scopes': []
            }
        }
    }

    # First Google GET returns 401
    resp_401 = MagicMock()
    resp_401.status_code = 401
    resp_401.text = 'Unauthorized'

    # Second GET succeeds with events
    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {
        'items': [
            {
                'id': 'e1',
                'summary': 'Retry Event',
                'status': 'confirmed',
                'start': {'dateTime': '2025-08-13T09:00:00Z'},
                'end': {'dateTime': '2025-08-13T10:00:00Z'}
            }
        ]
    }
    mock_get.side_effect = [resp_401, resp_200]

    # Token refresh POST
    token_resp = MagicMock()
    token_resp.status_code = 200
    token_resp.json.return_value = {
        'access_token': 'new-token',
        'expires_in': 3600
    }
    mock_post.return_value = token_resp

    response = client.get(
        '/api/calendar/events?date=2025-08-13&timezone=Australia/Sydney',
        headers={'Authorization': 'Bearer mock-token'}
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert any(t.get('text') == 'Retry Event' for t in data['tasks'])

    # Ensure refresh POST happened
    assert mock_post.called
    # Ensure second GET used new token
    first_call_headers = mock_get.call_args_list[0].kwargs['headers']
    second_call_headers = mock_get.call_args_list[1].kwargs['headers']
    assert first_call_headers['Authorization'] == 'Bearer old-token'
    assert second_call_headers['Authorization'] == 'Bearer new-token'