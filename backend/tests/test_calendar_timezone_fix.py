import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
import sys
import os

# Add parent directory to path to import application
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import application
from backend.apis.calendar_routes import convert_calendar_event_to_task, fetch_google_calendar_events

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

@pytest.fixture
def mock_calendar_event():
    """Mock Google Calendar event."""
    return {
        'id': 'gcal-event-123',
        'summary': 'Haircut Appointment',
        'description': 'Regular haircut appointment',
        'status': 'confirmed',
        'start': {
            'dateTime': '2024-07-17T10:00:00+10:00'  # 10 AM Sydney time
        },
        'end': {
            'dateTime': '2024-07-17T11:00:00+10:00'  # 11 AM Sydney time
        }
    }

class TestCalendarTimezoneFixPrimaryBug:
    """Test the primary bug fix: start_date should use requested date, not datetime.now()"""
    
    def test_convert_calendar_event_to_task_uses_correct_date(self, mock_calendar_event):
        """Test that convert_calendar_event_to_task uses the provided date parameter instead of datetime.now()"""
        requested_date = '2024-07-17'
        
        # Call the function with the requested date
        result = convert_calendar_event_to_task(mock_calendar_event, requested_date)
        
        # Assert the start_date matches the requested date, not today's date
        assert result is not None
        assert result['start_date'] == requested_date
        assert result['start_date'] != datetime.now().strftime('%Y-%m-%d')  # Should NOT be today
        
    def test_convert_calendar_event_to_task_different_dates(self, mock_calendar_event):
        """Test that the function works correctly with different dates"""
        test_dates = ['2024-07-16', '2024-07-18', '2024-08-01']
        
        for test_date in test_dates:
            result = convert_calendar_event_to_task(mock_calendar_event, test_date)
            assert result['start_date'] == test_date

class TestCalendarTimezoneFixSydneyTimezone:
    """Test timezone handling for Sydney (UTC+10) to fix the 'tomorrow's events' bug"""
    
    @patch('backend.apis.calendar_routes.requests.get')
    def test_fetch_events_sydney_timezone_boundaries(self, mock_requests_get):
        """Test that Google Calendar API is called with correct timezone boundaries for Sydney"""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'items': []}
        mock_requests_get.return_value = mock_response
        
        # Test fetching events for July 17, 2024 in Sydney timezone
        user_timezone = 'Australia/Sydney'
        access_token = 'test-token'
        date = '2024-07-17'
        
        # Call the function
        result = fetch_google_calendar_events(access_token, date, user_timezone)
        
        # Verify API was called with correct timezone-adjusted parameters
        mock_requests_get.assert_called_once()
        call_args = mock_requests_get.call_args[1]['params']
        
        # For Sydney timezone (UTC+10), July 17 should be:
        # timeMin: 2024-07-16T14:00:00Z (start of July 17 in Sydney)
        # timeMax: 2024-07-17T13:59:59Z (end of July 17 in Sydney)
        assert call_args['timeMin'] == '2024-07-16T14:00:00Z'
        assert call_args['timeMax'] == '2024-07-17T13:59:59Z'

class TestMockCalendarEvents:
    """Test with mock calendar events to validate the complete fix"""
    
    def test_convert_events_to_tasks_correct_dates(self, mock_calendar_event):
        """Test that all converted events get the correct start_date"""
        requested_date = '2024-07-17'
        
        task = convert_calendar_event_to_task(mock_calendar_event, requested_date)
        assert task is not None
        assert task['start_date'] == requested_date
        assert task['text'] == 'Haircut Appointment'
        assert task['from_gcal'] is True 