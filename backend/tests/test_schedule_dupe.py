"""
Test Suite for Schedule Duplication Bug Fix
Tests that schedules are updated correctly instead of creating duplicates
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from bson import ObjectId

# Import the Flask app and routes
from backend.apis.routes import api_bp
from backend.db_config import get_user_schedules_collection


class TestScheduleDuplicationFix:
    """Test cases for the schedule duplication bug fix"""

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

    @patch('backend.apis.routes.get_user_schedules_collection')
    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.generate_schedule')
    def test_submit_data_updates_existing_schedule_with_valid_token(
        self, 
        mock_generate_schedule,
        mock_get_user_from_token, 
        mock_get_schedules_collection,
        mock_app
    ):
        """Test that submit_data updates existing schedule when valid token is provided"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        mock_generate_schedule.return_value = {
            "success": True,
            "tasks": [{"id": "1", "text": "test task"}]
        }
        
        # Mock existing schedule
        existing_schedule = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "userId": "test_user_123",
            "date": "2025-06-19T00:00:00"
        }
        
        mock_collection = Mock()
        mock_collection.find_one.return_value = existing_schedule
        mock_collection.update_one.return_value = Mock(modified_count=1)
        mock_get_schedules_collection.return_value = mock_collection
        
        # Test data
        test_data = {
            "name": "Test User",
            "tasks": [],
            "work_start_time": "09:00",
            "work_end_time": "17:00"
        }
        
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                json=test_data,
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            # Verify response
            assert response.status_code == 200
            response_data = response.get_json()
            assert response_data['success'] == True
            assert 'scheduleId' in response_data
            
            # Verify that find_one was called with userId filter
            mock_collection.find_one.assert_called_once()
            call_args = mock_collection.find_one.call_args[0][0]
            assert 'userId' in call_args
            assert call_args['userId'] == 'test_user_123'
            assert 'date' in call_args
            
            # Verify that update_one was called (not insert_one)
            mock_collection.update_one.assert_called_once()
            mock_collection.insert_one.assert_not_called()

    @patch('backend.apis.routes.get_user_schedules_collection')
    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.generate_schedule')
    def test_submit_data_creates_new_schedule_when_none_exists(
        self, 
        mock_generate_schedule,
        mock_get_user_from_token, 
        mock_get_schedules_collection,
        mock_app
    ):
        """Test that submit_data creates new schedule when none exists for user"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = {'googleId': 'test_user_123'}
        mock_generate_schedule.return_value = {
            "success": True,
            "tasks": [{"id": "1", "text": "test task"}]
        }
        
        # Mock no existing schedule
        mock_collection = Mock()
        mock_collection.find_one.return_value = None
        mock_collection.insert_one.return_value = Mock(inserted_id=ObjectId("507f1f77bcf86cd799439011"))
        mock_get_schedules_collection.return_value = mock_collection
        
        # Test data
        test_data = {
            "name": "Test User",
            "tasks": [],
            "work_start_time": "09:00",
            "work_end_time": "17:00"
        }
        
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                json=test_data,
                headers={'Authorization': 'Bearer valid_token'}
            )
            
            # Verify response
            assert response.status_code == 200
            response_data = response.get_json()
            assert response_data['success'] == True
            assert 'scheduleId' in response_data
            
            # Verify that find_one was called with userId filter
            mock_collection.find_one.assert_called_once()
            call_args = mock_collection.find_one.call_args[0][0]
            assert 'userId' in call_args
            assert call_args['userId'] == 'test_user_123'
            
            # Verify that insert_one was called (not update_one)
            mock_collection.insert_one.assert_called_once()
            mock_collection.update_one.assert_not_called()

    @patch('backend.apis.routes.get_user_schedules_collection')
    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.generate_schedule')
    def test_submit_data_fallback_to_name_when_no_token(
        self, 
        mock_generate_schedule,
        mock_get_user_from_token, 
        mock_get_schedules_collection,
        mock_app
    ):
        """Test that submit_data falls back to name field when no valid token provided"""
        
        # Setup mocks - no valid token
        mock_get_user_from_token.return_value = None
        mock_generate_schedule.return_value = {
            "success": True,
            "tasks": [{"id": "1", "text": "test task"}]
        }
        
        # Mock no existing schedule
        mock_collection = Mock()
        mock_collection.find_one.return_value = None
        mock_collection.insert_one.return_value = Mock(inserted_id=ObjectId("507f1f77bcf86cd799439011"))
        mock_get_schedules_collection.return_value = mock_collection
        
        # Test data
        test_data = {
            "name": "fallback_user",
            "tasks": [],
            "work_start_time": "09:00",
            "work_end_time": "17:00"
        }
        
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                json=test_data
                # No Authorization header
            )
            
            # Verify response
            assert response.status_code == 200
            
            # Verify that find_one was called with fallback userId
            mock_collection.find_one.assert_called_once()
            call_args = mock_collection.find_one.call_args[0][0]
            assert 'userId' in call_args
            assert call_args['userId'] == 'fallback_user'


if __name__ == '__main__':
    pytest.main([__file__])