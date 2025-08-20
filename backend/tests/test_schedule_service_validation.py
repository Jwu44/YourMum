"""
Test suite for schedule service validation helpers.
Testing validation consolidation methods extracted during Phase 2 refactoring.
"""

import pytest
from typing import Dict, List, Any
from backend.services.schedule_service import ScheduleService


class TestScheduleServiceValidation:
    """Test class for schedule service validation methods."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.service = ScheduleService()
        
        # Valid base document structure
        self.valid_base_document = {
            "userId": "test_user_123",
            "date": "2025-08-15",
            "schedule": [
                {
                    "id": "task1",
                    "text": "Test task",
                    "completed": False,
                    "is_section": False,
                    "type": "task"
                }
            ],
            "inputs": {
                "name": "Test User",
                "work_start_time": "09:00",
                "work_end_time": "17:00",
                "energy_patterns": [],
                "priorities": {},
                "layout_preference": {},
                "tasks": []
            },
            "metadata": {
                "created_at": "2025-08-15T10:00:00Z",
                "last_modified": "2025-08-15T10:00:00Z",
                "source": "manual"
            }
        }
        
        # Raw inputs for processing tests
        self.raw_inputs = {
            "name": "Test User",
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["morning"],
            "priorities": {"work": "high"},
            "layout_preference": {"layout": "todolist-structured"},
            "tasks": ["Task 1", "Task 2"]
        }

    def test_validate_and_prepare_schedule_document_valid(self):
        """Test validation of a valid schedule document."""
        is_valid, error_msg, prepared_doc = self.service._validate_and_prepare_schedule_document(
            self.valid_base_document, 
            "test_user_123", 
            "2025-08-15"
        )
        
        assert is_valid is True
        assert error_msg is None
        assert prepared_doc is not None
        assert prepared_doc["userId"] == "test_user_123"
        assert prepared_doc["date"] == "2025-08-15T00:00:00"  # format_schedule_date adds timestamp

    def test_validate_and_prepare_schedule_document_invalid_structure(self):
        """Test validation of document with invalid structure."""
        invalid_document = {
            "userId": "test_user_123",
            # Missing required 'date' field
            "schedule": [],
            "metadata": {}
        }
        
        is_valid, error_msg, prepared_doc = self.service._validate_and_prepare_schedule_document(
            invalid_document,
            "test_user_123", 
            "2025-08-15"
        )
        
        assert is_valid is False
        assert error_msg is not None
        assert "validation failed" in error_msg.lower()
        assert prepared_doc is None

    def test_validate_and_prepare_schedule_document_missing_metadata(self):
        """Test validation handles missing metadata gracefully."""
        document_no_metadata = {
            "userId": "test_user_123",
            "date": "2025-08-15",
            "schedule": [],
            "inputs": {}
            # Missing metadata
        }
        
        is_valid, error_msg, prepared_doc = self.service._validate_and_prepare_schedule_document(
            document_no_metadata,
            "test_user_123", 
            "2025-08-15"
        )
        
        assert is_valid is False
        assert error_msg is not None

    def test_validate_and_prepare_schedule_document_date_formatting(self):
        """Test that date formatting is handled correctly."""
        # Document with incorrectly formatted date
        document_wrong_date = {
            **self.valid_base_document,
            "date": "08/15/2025"  # Wrong format
        }
        
        is_valid, error_msg, prepared_doc = self.service._validate_and_prepare_schedule_document(
            document_wrong_date,
            "test_user_123", 
            "2025-08-15"
        )
        
        # Should auto-correct the date format
        if is_valid:
            assert prepared_doc["date"] == "2025-08-15T00:00:00"  # format_schedule_date adds timestamp
        # Or should fail validation if strict
        else:
            assert error_msg is not None

    def test_process_schedule_inputs_complete_inputs(self):
        """Test processing complete raw inputs."""
        processed = self.service._process_schedule_inputs(self.raw_inputs)
        
        # Should preserve all provided values
        assert processed["name"] == "Test User"
        assert processed["work_start_time"] == "09:00"
        assert processed["work_end_time"] == "17:00"
        assert processed["energy_patterns"] == ["morning"]
        assert processed["priorities"] == {"work": "high"}
        assert processed["layout_preference"] == {"layout": "todolist-structured"}
        assert processed["tasks"] == ["Task 1", "Task 2"]

    def test_process_schedule_inputs_partial_inputs(self):
        """Test processing partial inputs with defaults."""
        partial_inputs = {
            "name": "Partial User",
            "work_start_time": "10:00"
            # Missing other fields
        }
        
        processed = self.service._process_schedule_inputs(partial_inputs)
        
        # Should preserve provided values
        assert processed["name"] == "Partial User"
        assert processed["work_start_time"] == "10:00"
        
        # Should provide safe defaults for missing fields
        assert processed["work_end_time"] == ""
        assert processed["energy_patterns"] == []
        assert processed["priorities"] == {}
        assert processed["layout_preference"] == {}
        assert processed["tasks"] == []

    def test_process_schedule_inputs_empty_inputs(self):
        """Test processing empty inputs returns safe defaults."""
        processed = self.service._process_schedule_inputs({})
        
        # Should provide all safe defaults
        assert processed["name"] == ""
        assert processed["work_start_time"] == ""
        assert processed["work_end_time"] == ""
        assert processed["energy_patterns"] == []
        assert processed["priorities"] == {}
        assert processed["layout_preference"] == {}
        assert processed["tasks"] == []

    def test_process_schedule_inputs_none_inputs(self):
        """Test processing None inputs returns safe defaults."""
        processed = self.service._process_schedule_inputs(None)
        
        # Should handle None gracefully
        assert processed["name"] == ""
        assert processed["work_start_time"] == ""
        assert processed["work_end_time"] == ""
        assert processed["energy_patterns"] == []
        assert processed["priorities"] == {}
        assert processed["layout_preference"] == {}
        assert processed["tasks"] == []

    def test_process_schedule_inputs_preserves_structure(self):
        """Test that processing preserves the expected input structure."""
        processed = self.service._process_schedule_inputs(self.raw_inputs)
        
        # Should have all expected keys
        expected_keys = {
            "name", "work_start_time", "work_end_time",
            "energy_patterns", "priorities", "layout_preference", "tasks"
        }
        assert set(processed.keys()) == expected_keys

    def test_process_schedule_inputs_sanitizes_dangerous_values(self):
        """Test that inputs are sanitized if needed."""
        dangerous_inputs = {
            "name": "Normal Name",
            "work_start_time": None,  # None value
            "energy_patterns": None,
            "priorities": "not_a_dict"  # Wrong type
        }
        
        processed = self.service._process_schedule_inputs(dangerous_inputs)
        
        # Should sanitize dangerous values to safe defaults
        assert processed["name"] == "Normal Name"  # Good value preserved
        assert processed["work_start_time"] == ""  # None converted to empty string
        assert isinstance(processed["energy_patterns"], list)  # None to list
        assert isinstance(processed["priorities"], dict)  # Wrong type to dict