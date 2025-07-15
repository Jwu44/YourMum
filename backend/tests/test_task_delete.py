"""
Test Suite for Task Delete Functionality
Tests the deletion of tasks from schedules following TDD approach
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from bson import ObjectId

# Import the Flask app and routes
from backend.apis.routes import api_bp
from backend.db_config import get_user_schedules_collection


class TestTaskDeletion:
    """Test cases for task deletion functionality"""

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
    def sample_schedule_with_tasks(self):
        """Sample schedule with multiple tasks for testing deletion"""
        return {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "userId": "test_user_123",
            "date": "2025-01-20T00:00:00",
            "schedule": [
                {
                    "id": "task-1",
                    "text": "Morning workout",
                    "categories": ["Exercise"],
                    "completed": False,
                    "is_section": False,
                    "type": "task"
                },
                {
                    "id": "task-2",
                    "text": "Team meeting",
                    "categories": ["Work"],
                    "completed": False,
                    "is_section": False,
                    "type": "task"
                },
                {
                    "id": "task-3",
                    "text": "Grocery shopping",
                    "categories": ["Personal"],
                    "completed": False,
                    "is_section": False,
                    "type": "task"
                }
            ],
            "metadata": {
                "created_at": "2025-01-20T08:00:00",
                "last_modified": "2025-01-20T08:00:00",
                "source": "manual"
            }
        }

    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_delete_task_success(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_app,
        sample_schedule_with_tasks
    ):
        """Test successful task deletion from schedule"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        
        # Mock schedule service to return schedule without deleted task
        expected_schedule_after_delete = [
            {
                "id": "task-1",
                "text": "Morning workout",
                "categories": ["Exercise"],
                "completed": False,
                "is_section": False,
                "type": "task"
            },
            {
                "id": "task-3",
                "text": "Grocery shopping",
                "categories": ["Personal"],
                "completed": False,
                "is_section": False,
                "type": "task"
            }
        ]
        
        mock_schedule_service.get_schedule_by_date.return_value = (
            True, 
            {"schedule": sample_schedule_with_tasks["schedule"], "date": "2025-01-20"}
        )
        mock_schedule_service.update_schedule_tasks.return_value = (
            True,
            {
                "schedule": expected_schedule_after_delete,
                "date": "2025-01-20",
                "metadata": {"totalTasks": 2}
            }
        )
        
        # Test the API endpoint
        with mock_app.test_client() as client:
            response = client.delete(
                '/api/tasks/task-2',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json={'date': '2025-01-20'}
            )
            
            # Verify response
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True
            assert len(response_data['schedule']) == 2
            assert not any(task['id'] == 'task-2' for task in response_data['schedule'])
            
            # Verify the schedule service was called correctly
            mock_schedule_service.get_schedule_by_date.assert_called_once_with(
                'test_user_123', '2025-01-20'
            )
            mock_schedule_service.update_schedule_tasks.assert_called_once()

    @patch('backend.apis.routes.get_user_from_token')
    def test_delete_task_missing_auth(self, mock_get_user_from_token, mock_app):
        """Test task deletion fails without authentication"""
        
        # Test without authorization header
        with mock_app.test_client() as client:
            response = client.delete(
                '/api/tasks/task-1',
                headers={'Content-Type': 'application/json'},
                json={'date': '2025-01-20'}
            )
            
            # Verify response
            assert response.status_code == 401
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'authentication required' in response_data['error'].lower()

    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_delete_task_not_found(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_app,
        sample_schedule_with_tasks
    ):
        """Test deletion of non-existent task returns 404"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        mock_schedule_service.get_schedule_by_date.return_value = (
            True, 
            {"schedule": sample_schedule_with_tasks["schedule"], "date": "2025-01-20"}
        )
        
        # Test the API endpoint
        with mock_app.test_client() as client:
            response = client.delete(
                '/api/tasks/non-existent-task',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json={'date': '2025-01-20'}
            )
            
            # Verify response
            assert response.status_code == 404
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'task not found' in response_data['error'].lower()

    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_delete_task_no_schedule_found(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_app
    ):
        """Test deletion when schedule doesn't exist returns 404"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        mock_schedule_service.get_schedule_by_date.return_value = (
            False, 
            {"error": "No schedule found for this date"}
        )
        
        # Test the API endpoint
        with mock_app.test_client() as client:
            response = client.delete(
                '/api/tasks/task-1',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json={'date': '2025-01-20'}
            )
            
            # Verify response
            assert response.status_code == 404
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'schedule' in response_data['error'].lower()

    @patch('backend.apis.routes.get_user_from_token')
    def test_delete_task_missing_date(self, mock_get_user_from_token, mock_app):
        """Test task deletion fails without date parameter"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        
        # Test case 1: JSON with missing date field - should fail with missing date
        with mock_app.test_client() as client:
            response = client.delete(
                '/api/tasks/task-1',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json={'other_field': 'value'}  # Valid JSON but no date field
            )
            
            # Verify response
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'missing required field' in response_data['error'].lower()
        
        # Test case 2: Empty JSON object - Flask treats this as no data
        with mock_app.test_client() as client:
            response = client.delete(
                '/api/tasks/task-1',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json={}
            )
            
            # Verify response - Flask test client treats {} as no data
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'no data provided' in response_data['error'].lower()

    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_delete_section_task_fails(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_app
    ):
        """Test that section tasks cannot be deleted (only regular tasks)"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        
        schedule_with_section = [
            {
                "id": "section-1",
                "text": "Morning Section",
                "categories": [],
                "completed": False,
                "is_section": True,
                "type": "section"
            },
            {
                "id": "task-1",
                "text": "Morning workout",
                "categories": ["Exercise"],
                "completed": False,
                "is_section": False,
                "type": "task"
            }
        ]
        
        mock_schedule_service.get_schedule_by_date.return_value = (
            True,
            {"schedule": schedule_with_section, "date": "2025-01-20"}
        )
        
        # Test the API endpoint
        with mock_app.test_client() as client:
            response = client.delete(
                '/api/tasks/section-1',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json={'date': '2025-01-20'}
            )
            
            # Verify response
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'section' in response_data['error'].lower() 