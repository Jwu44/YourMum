"""
Test Suite for Task 4: Empty Schedule Creation Bug Fix
Tests that empty schedules are created in backend with user inputs when none exist
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from bson import ObjectId

# Import the Flask app and services
from backend.apis.routes import api_bp
from backend.services.schedule_service import ScheduleService
from backend.db_config import get_user_schedules_collection


class TestEmptyScheduleCreation:
    """Test cases for creating empty schedules in backend with user inputs"""

    @pytest.fixture
    def mock_app(self):
        """Create a test Flask app with the API blueprint"""
        from flask import Flask
        app = Flask(__name__)
        app.register_blueprint(api_bp, url_prefix='/api')
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def mock_user_schedules_collection(self):
        """Mock user schedules collection"""
        mock_collection = Mock()
        return mock_collection

    @pytest.fixture
    def mock_firebase_token_valid(self):
        """Mock valid Firebase token verification"""
        mock_user = {
            'googleId': 'test_user_123',
            'email': 'test@example.com',
            'displayName': 'Test User'
        }
        return mock_user

    @pytest.fixture
    def sample_user_inputs(self):
        """Sample user inputs from FormContext"""
        return {
            "name": "Test User",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "energy_patterns": ["morning_person"],
            "priorities": {
                "health": "Exercise daily",
                "relationships": "Call family",
                "fun_activities": "Read books",
                "ambitions": "Learn programming"
            },
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": []
        }

    def test_schedule_service_create_empty_schedule_with_inputs(
        self, 
        mock_user_schedules_collection,
        sample_user_inputs
    ):
        """Test that ScheduleService.create_empty_schedule stores user inputs correctly"""
        
        # Mock successful database operation
        mock_result = Mock()
        mock_result.upserted_id = ObjectId()
        mock_user_schedules_collection.replace_one.return_value = mock_result
        
        # Create schedule service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_user_schedules_collection
        
        # Test creating empty schedule with user inputs
        user_id = "test_user_123"
        date = "2025-01-16"
        empty_tasks = []
        
        success, result = schedule_service.create_empty_schedule(
            user_id=user_id,
            date=date,
            tasks=empty_tasks
        )
        
        # Verify success
        assert success is True
        assert result['schedule'] == empty_tasks
        assert result['date'] == date
        assert 'metadata' in result
        
        # Verify database was called with correct document structure
        mock_user_schedules_collection.replace_one.assert_called_once()
        call_args = mock_user_schedules_collection.replace_one.call_args
        
        # Check the filter (first argument)
        filter_dict = call_args[0][0]
        assert filter_dict['userId'] == user_id
        assert date in filter_dict['date']  # Date should be formatted to include time
        
        # Check the document (second argument)
        document = call_args[0][1]
        assert document['userId'] == user_id
        assert document['schedule'] == empty_tasks
        assert 'metadata' in document
        assert document['metadata']['source'] == 'manual'

    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_create_schedule_endpoint_with_empty_tasks(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_app,
        sample_user_inputs
    ):
        """Test that POST /api/schedules endpoint creates empty schedule with user inputs"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        mock_schedule_service.create_empty_schedule.return_value = (
            True, 
            {
                "schedule": [],
                "date": "2025-01-16",
                "scheduleId": "mock_schedule_id",
                "metadata": {
                    "totalTasks": 0,
                    "calendarEvents": 0,
                    "recurringTasks": 0,
                    "generatedAt": "2025-01-16T12:00:00Z"
                }
            }
        )
        
        # Test request payload
        request_payload = {
            "date": "2025-01-16",
            "tasks": []  # Empty tasks array
        }
        
        # Test the API endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/schedules',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=request_payload
            )
            
            # Verify response
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True
            assert response_data['schedule'] == []
            assert response_data['date'] == "2025-01-16"
            assert 'metadata' in response_data
            
            # Verify schedule service was called correctly
            mock_schedule_service.create_empty_schedule.assert_called_once_with(
                user_id='test_user_123',
                date='2025-01-16',
                tasks=[]
            )

    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_get_schedule_returns_404_when_no_schedule_exists(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_app
    ):
        """Test that GET /api/schedules/<date> returns 404 when no schedule exists"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        mock_schedule_service.get_schedule_by_date.return_value = (
            False, 
            {"error": "No schedule found for this date"}
        )
        
        # Test the API endpoint
        with mock_app.test_client() as client:
            response = client.get(
                '/api/schedules/2025-01-16',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                }
            )
            
            # Verify 404 response
            assert response.status_code == 404
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'No schedule found' in response_data['error']
            
            # Verify schedule service was called correctly
            mock_schedule_service.get_schedule_by_date.assert_called_once_with(
                'test_user_123',
                '2025-01-16'
            )

    def test_schedule_service_handles_user_inputs_correctly(
        self,
        mock_user_schedules_collection,
        sample_user_inputs
    ):
        """Test that schedule service stores user inputs in the correct format"""
        
        # Mock successful database operation
        mock_result = Mock()
        mock_result.upserted_id = ObjectId()
        mock_user_schedules_collection.replace_one.return_value = mock_result
        
        # Create schedule service instance
        schedule_service = ScheduleService()
        schedule_service.schedules_collection = mock_user_schedules_collection
        
        # Test creating empty schedule
        user_id = "test_user_123"
        date = "2025-01-16"
        
        success, result = schedule_service.create_empty_schedule(
            user_id=user_id,
            date=date,
            tasks=[]
        )
        
        # Verify the document structure includes default inputs
        call_args = mock_user_schedules_collection.replace_one.call_args
        document = call_args[0][1]
        
        # Check that inputs field exists with default structure
        assert 'inputs' in document
        inputs = document['inputs']
        assert 'name' in inputs
        assert 'work_start_time' in inputs
        assert 'work_end_time' in inputs
        assert 'working_days' in inputs
        assert 'energy_patterns' in inputs
        assert 'priorities' in inputs
        assert 'layout_preference' in inputs
        assert 'tasks' in inputs 