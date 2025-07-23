"""
Test Suite for TASK-10: Preserve Inputs Config
Tests that inputs config is properly preserved when creating next day schedules
"""

import pytest
from unittest.mock import Mock, patch
from backend.services.schedule_service import ScheduleService
from backend.models.schedule_schema import format_schedule_date
from bson import ObjectId

class TestInputsConfigPreservation:
    """Test cases to verify inputs config preservation in next-day schedule creation"""
    
    @pytest.fixture
    def schedule_service(self):
        """Create ScheduleService instance for testing"""
        return ScheduleService()
    
    @pytest.fixture
    def mock_schedules_collection(self):
        """Mock MongoDB schedules collection"""
        return Mock()
    
    @pytest.fixture
    def sample_inputs_config(self):
        """Sample inputs config from previous day"""
        return {
            "name": "Test User",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "energy_patterns": ["peak_morning", "high_all_day"],
            "priorities": {
                "health": "1",
                "relationships": "2", 
                "fun_activities": "3",
                "ambitions": "4"
            },
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": []
        }
    
    @pytest.fixture
    def sample_filtered_tasks(self):
        """Sample tasks filtered for next day (incomplete tasks + sections)"""
        return [
            {
                "id": "section_1",
                "text": "Morning", 
                "type": "section",
                "is_section": True,
                "completed": False
            },
            {
                "id": "task_1",
                "text": "Complete project review",
                "type": "task", 
                "is_section": False,
                "completed": False,
                "section": "Morning"
            },
            {
                "id": "task_2", 
                "text": "Daily exercise",
                "type": "task",
                "is_section": False,
                "completed": False,
                "is_recurring": {"frequency": "daily"},
                "section": "Morning"
            }
        ]

    @patch.object(ScheduleService, '__init__', lambda x: None)
    def test_create_empty_schedule_preserves_inputs_config(
        self, 
        schedule_service,
        mock_schedules_collection,
        sample_inputs_config,
        sample_filtered_tasks
    ):
        """Test that create_empty_schedule stores inputs config correctly for next day"""
        
        # Mock successful database operation
        mock_result = Mock()
        mock_result.upserted_id = ObjectId()
        mock_schedules_collection.replace_one.return_value = mock_result
        
        # Setup schedule service
        schedule_service.schedules_collection = mock_schedules_collection
        
        # Create schedule with preserved inputs config
        user_id = "test_user_123"
        next_day_date = "2025-07-24"
        
        success, result = schedule_service.create_empty_schedule(
            user_id=user_id,
            date=next_day_date,
            tasks=sample_filtered_tasks,
            inputs=sample_inputs_config
        )
        
        # Verify success
        assert success is True
        assert result['schedule'] == sample_filtered_tasks
        assert result['date'] == next_day_date
        
        # Verify database was called with correct document structure
        mock_schedules_collection.replace_one.assert_called_once()
        call_args = mock_schedules_collection.replace_one.call_args
        
        # Check the filter (first argument) 
        filter_dict = call_args[0][0]
        assert filter_dict['userId'] == user_id
        assert next_day_date in filter_dict['date']  # Date should be formatted to include time
        
        # Check the document (second argument)
        document = call_args[0][1]
        assert document['userId'] == user_id
        assert document['schedule'] == sample_filtered_tasks
        
        # Verify inputs config is preserved exactly
        assert 'inputs' in document
        stored_inputs = document['inputs']
        assert stored_inputs == sample_inputs_config
        
        # Verify specific inputs config fields are preserved
        assert stored_inputs['work_start_time'] == "09:00"
        assert stored_inputs['work_end_time'] == "17:00"
        assert stored_inputs['working_days'] == ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        assert stored_inputs['energy_patterns'] == ["peak_morning", "high_all_day"]
        assert stored_inputs['priorities']['health'] == "1"
        assert stored_inputs['layout_preference']['layout'] == "todolist-structured"
        assert stored_inputs['layout_preference']['orderingPattern'] == "timebox"

    @patch.object(ScheduleService, '__init__', lambda x: None)
    def test_get_schedule_returns_preserved_inputs_config(
        self,
        schedule_service,
        mock_schedules_collection,
        sample_inputs_config,
        sample_filtered_tasks
    ):
        """Test that get_schedule_by_date returns the preserved inputs config"""
        
        # Mock schedule document with preserved inputs config
        schedule_document = {
            "_id": "test_schedule_id",
            "userId": "test_user_123",
            "date": "2025-07-24T00:00:00",
            "schedule": sample_filtered_tasks,
            "inputs": sample_inputs_config,
            "metadata": {
                "created_at": "2025-07-24T08:00:00Z",
                "last_modified": "2025-07-24T08:00:00Z", 
                "source": "manual"
            }
        }
        
        # Setup mocks
        schedule_service.schedules_collection = mock_schedules_collection
        mock_schedules_collection.find_one.return_value = schedule_document
        
        # Call get_schedule_by_date
        success, result = schedule_service.get_schedule_by_date("test_user_123", "2025-07-24")
        
        # Verify success
        assert success is True
        
        # Verify inputs config is returned
        assert "inputs" in result
        returned_inputs = result["inputs"]
        assert returned_inputs == sample_inputs_config
        
        # Verify specific preserved fields
        assert returned_inputs['work_start_time'] == "09:00" 
        assert returned_inputs['energy_patterns'] == ["peak_morning", "high_all_day"]
        assert returned_inputs['priorities']['health'] == "1"
        assert returned_inputs['layout_preference']['orderingPattern'] == "timebox"
        
        # Verify other fields still exist
        assert "schedule" in result
        assert "date" in result
        assert "metadata" in result

    @patch.object(ScheduleService, '__init__', lambda x: None)
    def test_empty_inputs_config_fallback(
        self,
        schedule_service,
        mock_schedules_collection
    ):
        """Test that empty inputs config returns empty dict when no inputs stored"""
        
        # Mock schedule document without inputs field
        schedule_document = {
            "_id": "test_schedule_id",
            "userId": "test_user_123", 
            "date": "2025-07-24T00:00:00",
            "schedule": [],
            "metadata": {
                "created_at": "2025-07-24T08:00:00Z",
                "source": "manual"
            }
            # Note: no 'inputs' field
        }
        
        # Setup mocks
        schedule_service.schedules_collection = mock_schedules_collection
        mock_schedules_collection.find_one.return_value = schedule_document
        
        # Call get_schedule_by_date
        success, result = schedule_service.get_schedule_by_date("test_user_123", "2025-07-24")
        
        # Verify success
        assert success is True
        
        # Verify inputs field exists with empty dict (as per user requirement)
        assert "inputs" in result
        assert result["inputs"] == {}

    @patch.object(ScheduleService, '__init__', lambda x: None) 
    def test_create_empty_schedule_with_none_inputs(
        self,
        schedule_service,
        mock_schedules_collection
    ):
        """Test that create_empty_schedule handles None inputs gracefully"""
        
        # Mock successful database operation
        mock_result = Mock()
        mock_result.upserted_id = ObjectId()
        mock_schedules_collection.replace_one.return_value = mock_result
        
        # Setup schedule service
        schedule_service.schedules_collection = mock_schedules_collection
        
        # Create schedule with None inputs (should use defaults)
        user_id = "test_user_123"
        date = "2025-07-24"
        
        success, result = schedule_service.create_empty_schedule(
            user_id=user_id,
            date=date,
            tasks=[],
            inputs=None
        )
        
        # Verify success
        assert success is True
        
        # Verify database was called
        mock_schedules_collection.replace_one.assert_called_once()
        call_args = mock_schedules_collection.replace_one.call_args
        document = call_args[0][1]
        
        # Verify inputs field exists with default structure
        assert 'inputs' in document
        inputs = document['inputs']
        
        # Verify default inputs structure (as per existing _create_schedule_document)
        expected_defaults = {
            "name": "",
            "work_start_time": "",
            "work_end_time": "",
            "working_days": [],
            "energy_patterns": [],
            "priorities": {},
            "layout_preference": {},
            "tasks": []
        }
        assert inputs == expected_defaults