"""
Integration Test Suite for /api/submit_data endpoint
Tests the complete flow: InputsConfig.tsx → /api/submit_data → schedule_gen.py

Following dev-guide.md TDD principles to ensure comprehensive coverage
of the schedule generation pipeline from frontend to backend.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from bson import ObjectId

# Import the Flask app and services
from backend.apis.routes import api_bp
from backend.services.schedule_service import ScheduleService


class TestSubmitDataIntegration:
    """Integration tests for /api/submit_data endpoint following dev-guide.md practices"""

    @pytest.fixture
    def mock_app(self):
        """Create a test Flask app with the API blueprint"""
        from flask import Flask
        app = Flask(__name__)
        app.register_blueprint(api_bp, url_prefix='/api')
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def mock_firebase_user(self):
        """Mock authenticated Firebase user"""
        return {
            'googleId': 'test_user_123',
            'email': 'test@example.com',
            'displayName': 'Test User'
        }

    @pytest.fixture
    def minimal_inputs_config_payload(self):
        """Minimal required payload from InputsConfig.tsx"""
        return {
            "date": "2024-01-15",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": [],
            "priorities": {},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": []
        }

    @pytest.fixture
    def full_inputs_config_payload(self):
        """Complete payload from InputsConfig.tsx with all fields"""
        return {
            "date": "2024-01-15",
            "name": "Test User",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_morning", "high_all_day"],
            "priorities": {
                "health": "1",
                "relationships": "2",
                "ambitions": "3",
                "fun_activities": "4"
            },
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": [
                {"id": "1", "text": "morning workout", "categories": ["Exercise"]},
                {"id": "2", "text": "team meeting", "categories": ["Work"]},
                {"id": "3", "text": "grocery shopping", "categories": []}  # Uncategorized
            ]
        }

    @patch('backend.services.schedule_gen.client')
    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_minimal_payload_success(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_llm_client,
        mock_app,
        mock_firebase_user,
        minimal_inputs_config_payload
    ):
        """Test /api/submit_data with minimal required InputsConfig payload"""
        
        # Setup authentication mock
        mock_get_user_from_token.return_value = mock_firebase_user
        
        # Mock existing schedule for fallback (empty tasks trigger fallback behavior)
        mock_schedule_service.get_schedule_by_date.return_value = (
            False,
            {"error": "No schedule found"}
        )
        
        # Test the endpoint (empty tasks will trigger generation failure)
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=minimal_inputs_config_payload
            )
            
            # With empty tasks, generation fails and returns error with fallback
            assert response.status_code == 500
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'Failed to generate schedule' in response_data['error']
            assert response_data['fallback'] is True
            assert response_data['schedule'] == []  # Empty fallback schedule

    @patch('backend.services.schedule_gen.client')
    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_full_payload_with_tasks(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_llm_client,
        mock_app,
        mock_firebase_user,
        full_inputs_config_payload
    ):
        """Test /api/submit_data with complete InputsConfig payload including tasks"""
        
        # Setup authentication mock
        mock_get_user_from_token.return_value = mock_firebase_user
        
        # Mock LLM responses for schedule generation
        categorization_response = Mock()
        categorization_response.content = [Mock()]
        categorization_response.content[0].text = json.dumps({
            "categorizations": [
                {"task_id": "3", "categories": ["Fun"]}
            ]
        })
        
        ordering_response = Mock()
        ordering_response.content = [Mock()]
        ordering_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1},
                {"task_id": "2", "section": "Afternoon", "order": 1},
                {"task_id": "3", "section": "Evening", "order": 1}
            ]
        })
        
        mock_llm_client.messages.create.side_effect = [categorization_response, ordering_response]
        
        # Mock schedule service response
        generated_tasks = [
            {"id": "section1", "text": "Morning", "is_section": True, "type": "section"},
            {"id": "1", "text": "morning workout", "categories": ["Exercise"], "section": "Morning"},
            {"id": "section2", "text": "Afternoon", "is_section": True, "type": "section"},
            {"id": "2", "text": "team meeting", "categories": ["Work"], "section": "Afternoon"},
            {"id": "section3", "text": "Evening", "is_section": True, "type": "section"},
            {"id": "3", "text": "grocery shopping", "categories": ["Fun"], "section": "Evening"}
        ]
        
        mock_schedule_service.create_schedule_from_ai_generation.return_value = (
            True,
            {
                "schedule": generated_tasks,
                "date": "2024-01-15",
                "scheduleId": "mock_schedule_id",
                "metadata": {
                    "totalTasks": 3,
                    "calendarEvents": 0,
                    "recurringTasks": 0,
                    "generatedAt": "2024-01-15T12:00:00Z"
                }
            }
        )
        
        # Test the endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=full_inputs_config_payload
            )
            
            # Verify successful response
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True
            assert len(response_data['schedule']) == 6  # 3 sections + 3 tasks
            assert response_data['date'] == "2024-01-15"
            
            # Verify original task IDs are preserved
            regular_tasks = [t for t in response_data['schedule'] if not t.get('is_section')]
            task_ids = [t['id'] for t in regular_tasks]
            assert '1' in task_ids and '2' in task_ids and '3' in task_ids
            
            # Verify uncategorized task got categorized
            task_3 = next(t for t in regular_tasks if t['id'] == '3')
            assert task_3['categories'] == ['Fun']
            
            # Verify schedule service was called correctly
            mock_schedule_service.create_schedule_from_ai_generation.assert_called_once()

    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_missing_required_fields(
        self,
        mock_get_user_from_token,
        mock_app,
        mock_firebase_user
    ):
        """Test /api/submit_data with missing required fields returns 400"""
        
        # Setup authentication mock
        mock_get_user_from_token.return_value = mock_firebase_user
        
        # Test payload missing required fields
        invalid_payload = {
            "date": "2024-01-15",
            # Missing work_start_time and work_end_time
            "energy_patterns": [],
            "priorities": {}
        }
        
        # Test the endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=invalid_payload
            )
            
            # Verify error response
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'Missing required fields' in response_data['error']

    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_invalid_date_format(
        self,
        mock_get_user_from_token,
        mock_app,
        mock_firebase_user
    ):
        """Test /api/submit_data with invalid date format returns 400"""
        
        # Setup authentication mock
        mock_get_user_from_token.return_value = mock_firebase_user
        
        # Test payload with invalid date format
        invalid_payload = {
            "date": "2024/01/15",  # Invalid format, should be YYYY-MM-DD
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": [],
            "priorities": {},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": []
        }
        
        # Test the endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=invalid_payload
            )
            
            # Verify error response
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'Invalid date format' in response_data['error']

    def test_submit_data_no_authentication(self, mock_app, minimal_inputs_config_payload):
        """Test /api/submit_data without authentication returns 401"""
        
        # Test the endpoint without Authorization header
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={'Content-Type': 'application/json'},
                json=minimal_inputs_config_payload
            )
            
            # Verify authentication required
            assert response.status_code == 401
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'User identification required' in response_data['error']

    @patch('backend.services.schedule_gen.client')
    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_schedule_generation_failure_with_fallback(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_llm_client,
        mock_app,
        mock_firebase_user,
        full_inputs_config_payload
    ):
        """Test /api/submit_data graceful handling of schedule generation failure"""
        
        # Setup authentication mock
        mock_get_user_from_token.return_value = mock_firebase_user
        
        # Mock LLM failure
        mock_llm_client.messages.create.side_effect = Exception("API Error")
        
        # Mock existing schedule for fallback
        mock_schedule_service.get_schedule_by_date.return_value = (
            True,
            {"schedule": [{"id": "1", "text": "existing task"}]}
        )
        
        # Test the endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=full_inputs_config_payload
            )
            
            # Verify error response with fallback
            assert response.status_code == 500
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'Failed to generate schedule' in response_data['error']
            assert response_data['fallback'] is True
            assert len(response_data['schedule']) == 1  # Existing schedule returned

    @patch('backend.services.schedule_gen.client')
    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_storage_failure_returns_generated_schedule(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_llm_client,
        mock_app,
        mock_firebase_user
    ):
        """Test /api/submit_data handles storage failure but returns generated schedule"""
        
        # Setup authentication mock
        mock_get_user_from_token.return_value = mock_firebase_user
        
        # Use payload with tasks to avoid generation failure
        payload_with_tasks = {
            "date": "2024-01-15",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_morning"],
            "priorities": {"work": "1"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": [{"id": "1", "text": "test task", "categories": ["Work"]}]
        }
        
        # Mock LLM response for successful generation
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        mock_llm_client.messages.create.return_value = mock_response
        
        # Mock successful generation but failed storage
        mock_schedule_service.create_schedule_from_ai_generation.return_value = (
            False,
            {"error": "Database connection failed"}
        )
        
        # Test the endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=payload_with_tasks
            )
            
            # Verify success response despite storage failure
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True
            # Should include the result from storage attempt
            assert 'error' in response_data


class TestSubmitDataLayoutPreferences:
    """Test various layout preferences from InputsConfig.tsx"""

    @pytest.fixture
    def mock_app(self):
        """Create a test Flask app with the API blueprint"""
        from flask import Flask
        app = Flask(__name__)
        app.register_blueprint(api_bp, url_prefix='/api')
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def mock_firebase_user(self):
        """Mock authenticated Firebase user"""
        return {'googleId': 'test_user_123'}

    @patch('backend.services.schedule_gen.client')
    @patch('backend.apis.routes.schedule_service')
    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_priority_layout_preference(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_llm_client,
        mock_app,
        mock_firebase_user
    ):
        """Test /api/submit_data with priority-based layout preference"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = mock_firebase_user
        
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "High Priority", "order": 1}
            ]
        })
        mock_llm_client.messages.create.return_value = mock_response
        
        generated_tasks = [
            {"id": "section1", "text": "High Priority", "is_section": True},
            {"id": "1", "text": "important task", "categories": ["Work"], "section": "High Priority"}
        ]
        
        mock_schedule_service.create_schedule_from_ai_generation.return_value = (
            True,
            {"schedule": generated_tasks, "date": "2024-01-15", "metadata": {}}
        )
        
        # Test payload with priority layout
        payload = {
            "date": "2024-01-15",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_morning"],
            "priorities": {"health": "1", "work": "2"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "priority",
                "orderingPattern": "timebox"
            },
            "tasks": [{"id": "1", "text": "important task", "categories": ["Work"]}]
        }
        
        # Test the endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=payload
            )
            
            # Verify successful response
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True
            
            # Verify priority sections are created
            sections = [t for t in response_data['schedule'] if t.get('is_section')]
            section_names = [s['text'] for s in sections]
            assert 'High Priority' in section_names

    @patch('backend.services.schedule_gen.client')
    @patch('backend.apis.routes.schedule_service')  
    @patch('backend.apis.routes.get_user_from_token')
    def test_submit_data_unstructured_layout_preference(
        self,
        mock_get_user_from_token,
        mock_schedule_service,
        mock_llm_client,
        mock_app,
        mock_firebase_user
    ):
        """Test /api/submit_data with unstructured layout preference"""
        
        # Setup mocks
        mock_get_user_from_token.return_value = mock_firebase_user
        
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        mock_llm_client.messages.create.return_value = mock_response
        
        generated_tasks = [
            {"id": "1", "text": "flexible task", "categories": ["Fun"]}
        ]
        
        mock_schedule_service.create_schedule_from_ai_generation.return_value = (
            True,
            {"schedule": generated_tasks, "date": "2024-01-15", "metadata": {}}
        )
        
        # Test payload with unstructured layout
        payload = {
            "date": "2024-01-15",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["low_energy"],
            "priorities": {"health": "1"},
            "layout_preference": {
                "layout": "todolist-unstructured",
                "orderingPattern": "alternating"
            },
            "tasks": [{"id": "1", "text": "flexible task", "categories": ["Fun"]}]
        }
        
        # Test the endpoint
        with mock_app.test_client() as client:
            response = client.post(
                '/api/submit_data',
                headers={
                    'Authorization': 'Bearer valid_token',
                    'Content-Type': 'application/json'
                },
                json=payload
            )
            
            # Verify successful response
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True


if __name__ == "__main__":
    pytest.main([__file__])