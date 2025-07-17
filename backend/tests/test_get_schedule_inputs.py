"""
Test Suite for get_schedule_by_date inputs return fix
Tests that get_schedule_by_date returns inputs config for next-day schedule creation
"""

import pytest
from unittest.mock import Mock, patch
from backend.services.schedule_service import ScheduleService
from backend.models.schedule_schema import format_schedule_date

class TestGetScheduleInputsReturn:
    """Test cases to verify get_schedule_by_date returns inputs config"""
    
    @pytest.fixture
    def schedule_service(self):
        """Create ScheduleService instance for testing"""
        return ScheduleService()
    
    @pytest.fixture
    def mock_schedules_collection(self):
        """Mock MongoDB schedules collection"""
        return Mock()
    
    @pytest.fixture
    def sample_schedule_document(self):
        """Sample schedule document with inputs"""
        return {
            "_id": "test_id_123",
            "userId": "test_user_123", 
            "date": "2025-01-16T00:00:00",
            "schedule": [
                {"id": "1", "text": "Task 1", "completed": False, "is_section": False},
                {"id": "2", "text": "Task 2", "completed": True, "is_section": False}
            ],
            "inputs": {
                "name": "Test User",
                "work_start_time": "09:00",
                "work_end_time": "17:00", 
                "working_days": ["Monday", "Tuesday"],
                "energy_patterns": ["morning"],
                "priorities": {"Work": 5, "Exercise": 3},
                "layout_preference": {"layout": "structured"},
                "tasks": ["Task 1", "Task 2"]
            },
            "metadata": {
                "created_at": "2025-01-16T08:00:00Z",
                "last_modified": "2025-01-16T08:00:00Z",
                "source": "ai_service"
            }
        }

    @patch.object(ScheduleService, '__init__', lambda x: None)
    def test_get_schedule_by_date_returns_inputs_config(
        self, 
        schedule_service, 
        mock_schedules_collection,
        sample_schedule_document
    ):
        """Test that get_schedule_by_date includes inputs in response"""
        
        # Setup mocks
        schedule_service.schedules_collection = mock_schedules_collection
        mock_schedules_collection.find_one.return_value = sample_schedule_document
        
        # Call the method
        success, result = schedule_service.get_schedule_by_date("test_user_123", "2025-01-16")
        
        # Verify success
        assert success is True
        
        # Verify inputs are included in response
        assert "inputs" in result
        assert result["inputs"] == sample_schedule_document["inputs"]
        
        # Verify existing fields still exist
        assert "schedule" in result
        assert "date" in result  
        assert "metadata" in result
        
        # Verify database query was called correctly
        mock_schedules_collection.find_one.assert_called_once_with({
            "userId": "test_user_123",
            "date": format_schedule_date("2025-01-16")
        })
    
    @patch.object(ScheduleService, '__init__', lambda x: None)
    def test_get_schedule_by_date_returns_empty_inputs_when_missing(
        self,
        schedule_service,
        mock_schedules_collection
    ):
        """Test that get_schedule_by_date returns empty inputs when not in document"""
        
        # Setup mocks - document without inputs field
        schedule_doc_without_inputs = {
            "_id": "test_id_123",
            "userId": "test_user_123",
            "date": "2025-01-16T00:00:00", 
            "schedule": [{"id": "1", "text": "Task 1", "completed": False}],
            "metadata": {"created_at": "2025-01-16T08:00:00Z", "source": "manual"}
        }
        
        schedule_service.schedules_collection = mock_schedules_collection
        mock_schedules_collection.find_one.return_value = schedule_doc_without_inputs
        
        # Call the method
        success, result = schedule_service.get_schedule_by_date("test_user_123", "2025-01-16")
        
        # Verify success
        assert success is True
        
        # Verify inputs field exists with empty dict
        assert "inputs" in result
        assert result["inputs"] == {}