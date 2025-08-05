"""
Final Validation Test: Complete Schedule Generation Flow
Tests that the entire pipeline works correctly before legacy code removal

Following dev-guide.md TDD principles to ensure no regressions
"""

import pytest
import json
from unittest.mock import Mock, patch

# Import the core functions to validate they work
from backend.services.schedule_gen import generate_schedule
from backend.services.ai_service import categorize_task, decompose_task, generate_schedule_suggestions


class TestCompleteFlowValidation:
    """Validation tests for complete schedule generation flow"""

    @patch('backend.services.schedule_gen.client')
    def test_schedule_gen_is_primary_implementation(self, mock_client):
        """Validate that schedule_gen.py is the primary schedule generation implementation"""
        
        # Mock LLM responses
        categorization_response = Mock()
        categorization_response.content = [Mock()]
        categorization_response.content[0].text = json.dumps({
            "categorizations": [
                {"task_id": "1", "categories": ["Work"]}
            ]
        })
        
        ordering_response = Mock()
        ordering_response.content = [Mock()]
        ordering_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        
        mock_client.messages.create.side_effect = [categorization_response, ordering_response]
        
        # Test InputsConfig-style payload
        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_morning"],
            "priorities": {"work": "1"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": [{"id": "1", "text": "important meeting", "categories": []}]  # Uncategorized
        }
        
        # Call the current implementation
        result = generate_schedule(user_data)
        
        # Verify it works correctly
        assert result["success"] is True
        assert "tasks" in result
        assert result["layout_type"] == "todolist-structured"
        assert result["ordering_pattern"] == "timebox"
        
        # Verify task was processed correctly
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 1
        assert regular_tasks[0]["id"] == "1"
        assert regular_tasks[0]["categories"] == ["Work"]  # Got categorized

    @patch('backend.services.ai_service.client')
    def test_ai_service_active_functions_work(self, mock_client):
        """Validate that active ai_service functions still work correctly"""
        
        # Test categorize_task
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "Exercise"
        mock_client.messages.create.return_value = mock_response
        
        categories = categorize_task("morning workout")
        assert isinstance(categories, list)
        assert len(categories) > 0
        
        # Test decompose_task
        mock_response.content[0].text = json.dumps({
            "microsteps": [
                {
                    "text": "Set workout clothes out the night before",
                    "rationale": "Reduces friction for morning routine",
                    "estimated_time": "2",
                    "energy_level_required": "low"
                }
            ]
        })
        
        task_data = {"text": "start morning workout routine", "categories": ["Exercise"]}
        user_data = {"energy_patterns": ["peak_morning"], "priorities": {"health": "1"}}
        
        microsteps = decompose_task(task_data, user_data)
        assert isinstance(microsteps, list)
        assert len(microsteps) > 0
        if microsteps:
            assert "text" in microsteps[0]

    def test_legacy_ai_service_functions_not_imported(self):
        """Validate that legacy schedule generation functions are not imported anywhere"""
        
        # This test ensures that imports are clean
        # If legacy functions were imported, this would fail at import time
        
        try:
            # Try to import the current implementation
            from backend.services.schedule_gen import generate_schedule
            assert callable(generate_schedule)
            
            # Verify that we're not accidentally importing from ai_service
            from backend.services import ai_service
            
            # These should exist (active functions)
            assert hasattr(ai_service, 'categorize_task')
            assert hasattr(ai_service, 'decompose_task') 
            assert hasattr(ai_service, 'generate_schedule_suggestions')
            
            # The legacy generate_schedule should no longer exist after removal
            assert not hasattr(ai_service, 'generate_schedule')  # Legacy function removed
            
            print("✅ All imports are clean - schedule_gen.py is primary implementation")
            
        except ImportError as e:
            pytest.fail(f"Import validation failed: {e}")

    def test_routes_use_correct_implementation(self):
        """Validate that routes.py imports the correct implementation"""
        
        # Read the routes file to verify imports
        with open('/Users/justinwu/Desktop/yourdAI/backend/apis/routes.py', 'r') as f:
            routes_content = f.read()
        
        # Verify correct imports
        assert 'from backend.services.schedule_gen import (\n    generate_schedule\n)' in routes_content
        assert 'from backend.services.ai_service import (\n    categorize_task,\n    decompose_task,\n    update_decomposition_patterns,\n    generate_schedule_suggestions\n)' in routes_content
        
        # Verify usage in submit_data endpoint
        assert 'schedule_result = generate_schedule(data)' in routes_content
        
        print("✅ Routes.py uses correct implementation - schedule_gen.py for generation")

    def test_comprehensive_flow_scenarios(self):
        """Test various InputsConfig scenarios work with current implementation"""
        
        # Test different layout preferences
        layout_scenarios = [
            {"layout": "todolist-structured", "subcategory": "day-sections"},
            {"layout": "todolist-structured", "subcategory": "priority"},  
            {"layout": "todolist-structured", "subcategory": "category"},
            {"layout": "todolist-unstructured"}
        ]
        
        for layout in layout_scenarios:
            # Empty tasks should return success with empty task list
            user_data = {
                "work_start_time": "09:00",
                "work_end_time": "17:00", 
                "energy_patterns": [],
                "priorities": {},
                "layout_preference": {**layout, "orderingPattern": "timebox"},
                "tasks": []
            }
            
            result = generate_schedule(user_data)
            assert result["success"] is True
            assert result["tasks"] == []
            assert result["layout_type"] == layout["layout"]
        
        print(f"✅ All {len(layout_scenarios)} layout scenarios work correctly")


if __name__ == "__main__":
    pytest.main([__file__])