"""
Test Suite for Optimized AI Service Data Preparation
Tests the new workflow-based approach for schedule generation
"""

import pytest
import json
from unittest.mock import Mock, patch
from typing import Dict, List, Any

# Import the functions we'll be testing
from backend.services.schedule_gen import (
    create_task_registry,
    categorize_uncategorized_tasks,
    generate_local_sections,
    create_ordering_prompt,
    process_ordering_response,
    assemble_final_schedule,
    generate_schedule
)
from backend.models.task import Task


class TestTaskRegistry:
    """Test task registry creation and management"""
    
    def test_create_task_registry_with_dict_tasks(self):
        """Test creating registry from dictionary tasks"""
        input_tasks = [
            {"id": "1", "text": "workout", "categories": ["Exercise"]},
            {"id": "2", "text": "meeting", "categories": ["Work"]},
            {"id": "3", "text": "shopping", "categories": []}  # uncategorized
        ]
        
        registry, uncategorized = create_task_registry(input_tasks)
        
        assert len(registry) == 3
        assert len(uncategorized) == 1
        assert uncategorized[0].id == "3"
        assert all(isinstance(task, Task) for task in registry.values())
    
    def test_create_task_registry_with_task_objects(self):
        """Test creating registry from Task objects"""
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task2 = Task(id="2", text="meeting", categories=["Work"])
        task3 = Task(id="3", text="shopping", categories=[])
        
        input_tasks = [task1, task2, task3]
        registry, uncategorized = create_task_registry(input_tasks)
        
        assert len(registry) == 3
        assert len(uncategorized) == 1
        assert registry["1"] == task1
    
    def test_empty_task_list(self):
        """Test handling empty task list"""
        registry, uncategorized = create_task_registry([])
        
        assert len(registry) == 0
        assert len(uncategorized) == 0


class TestCategorization:
    """Test task categorization pipeline"""
    
    @patch('backend.services.schedule_gen.client')
    def test_categorize_uncategorized_tasks_success(self, mock_client):
        """Test successful batch categorization"""
        # Mock API response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "categorizations": [
                {"task_id": "1", "categories": ["Exercise"]},
                {"task_id": "2", "categories": ["Work", "Relationships"]}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        # Create test tasks
        task1 = Task(id="1", text="gym workout", categories=[])
        task2 = Task(id="2", text="team meeting", categories=[])
        uncategorized = [task1, task2]
        
        registry = {"1": task1, "2": task2}
        
        # Test categorization
        success = categorize_uncategorized_tasks(uncategorized, registry)
        
        assert success is True
        assert registry["1"].categories == ["Exercise"]
        assert registry["2"].categories == ["Work", "Relationships"]
    
    @patch('backend.services.schedule_gen.client')
    def test_categorize_uncategorized_tasks_failure(self, mock_client):
        """Test categorization failure fallback to 'Work'"""
        # Mock API failure
        mock_client.messages.create.side_effect = Exception("API Error")
        
        task1 = Task(id="1", text="gym workout", categories=[])
        uncategorized = [task1]
        registry = {"1": task1}
        
        success = categorize_uncategorized_tasks(uncategorized, registry)
        
        assert success is False
        assert registry["1"].categories == ["Work"]  # Default fallback


class TestSectionGeneration:
    """Test local section generation"""
    
    def test_generate_day_sections(self):
        """Test generating day-based sections"""
        layout_preference = {
            "layout": "todolist-structured",
            "subcategory": "day-sections",
            "orderingPattern": "timebox"
        }
        
        sections = generate_local_sections(layout_preference)
        
        expected_sections = ["Morning", "Afternoon", "Evening"]
        assert sections == expected_sections
    
    def test_generate_priority_sections(self):
        """Test generating priority-based sections"""
        layout_preference = {
            "layout": "todolist-structured", 
            "subcategory": "priority",
            "orderingPattern": "timebox"
        }
        
        sections = generate_local_sections(layout_preference)
        
        expected_sections = ["High Priority", "Medium Priority", "Low Priority"]
        assert sections == expected_sections
    
    def test_generate_category_sections(self):
        """Test generating category-based sections"""
        layout_preference = {
            "layout": "todolist-structured",
            "subcategory": "category", 
            "orderingPattern": "timebox"
        }
        
        sections = generate_local_sections(layout_preference)
        
        expected_sections = ["Work", "Exercise", "Relationships", "Fun", "Ambition"]
        assert sections == expected_sections


class TestOrderingPrompt:
    """Test ordering prompt creation"""
    
    def test_create_ordering_prompt(self):
        """Test prompt creation for task ordering"""
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task2 = Task(id="2", text="meeting", categories=["Work"])
        registry = {"1": task1, "2": task2}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "energy_patterns": ["morning", "high-energy"],
            "priorities": {"Exercise": 5, "Work": 4},
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM"
        }
        
        prompt = create_ordering_prompt(registry, sections, user_data)
        
        assert "workout" in prompt
        assert "meeting" in prompt
        assert "Morning" in prompt
        assert "9:00 AM" in prompt
        assert "high-energy" in prompt


class TestOrderingResponse:
    """Test ordering response processing"""
    
    def test_process_ordering_response_success(self):
        """Test successful parsing of ordering instructions"""
        response_text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1},
                {"task_id": "2", "section": "Afternoon", "order": 1}
            ]
        })
        
        placements = process_ordering_response(response_text)
        
        assert len(placements) == 2
        assert placements[0]["task_id"] == "1"
        assert placements[0]["section"] == "Morning"
        assert placements[1]["order"] == 1
    
    def test_process_ordering_response_invalid_json(self):
        """Test handling invalid JSON response"""
        response_text = "Invalid JSON response"
        
        placements = process_ordering_response(response_text)
        
        assert placements == []


class TestScheduleAssembly:
    """Test final schedule assembly"""
    
    def test_assemble_final_schedule_success(self):
        """Test successful schedule assembly"""
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task2 = Task(id="2", text="meeting", categories=["Work"])
        registry = {"1": task1, "2": task2}
        
        placements = [
            {"task_id": "1", "section": "Morning", "order": 1},
            {"task_id": "2", "section": "Afternoon", "order": 1}
        ]
        
        sections = ["Morning", "Afternoon", "Evening"]
        layout_preference = {
            "layout": "todolist-structured",
            "orderingPattern": "timebox"
        }
        
        result = assemble_final_schedule(placements, registry, sections, layout_preference)
        
        assert result["success"] is True
        assert len(result["tasks"]) == 5  # 3 sections + 2 tasks
        
        # Check section structure
        section_tasks = [t for t in result["tasks"] if t.get("is_section")]
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        
        assert len(section_tasks) == 3
        assert len(regular_tasks) == 2
    
    def test_assemble_final_schedule_with_missing_tasks(self):
        """Test assembly when some tasks are missing from placements"""
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task2 = Task(id="2", text="meeting", categories=["Work"])
        registry = {"1": task1, "2": task2}
        
        # Only place one task
        placements = [
            {"task_id": "1", "section": "Morning", "order": 1}
        ]
        
        sections = ["Morning", "Afternoon", "Evening"]
        layout_preference = {
            "layout": "todolist-structured",
            "orderingPattern": "timebox"
        }
        
        result = assemble_final_schedule(placements, registry, sections, layout_preference)
        
        # Should include the unplaced task at the end
        assert result["success"] is True
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 2


class TestIntegration:
    """Integration tests for the complete optimized pipeline"""
    
    @patch('backend.services.schedule_gen.client')
    def test_generate_schedule_optimized_complete_flow(self, mock_client):
        """Test the complete optimized schedule generation flow"""
        # Mock both LLM calls
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
        
        mock_client.messages.create.side_effect = [categorization_response, ordering_response]
        
        # Test data
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5, "Work": 4, "Fun": 3},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": [
                {"id": "1", "text": "workout", "categories": ["Exercise"]},
                {"id": "2", "text": "meeting", "categories": ["Work"]},
                {"id": "3", "text": "shopping", "categories": []}  # needs categorization
            ]
        }
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        assert "tasks" in result
        assert "layout_type" in result
        assert "ordering_pattern" in result
        
        # Verify task preservation
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 3
        
        # Verify original task IDs are preserved
        task_ids = [t["id"] for t in regular_tasks]
        assert "1" in task_ids
        assert "2" in task_ids
        assert "3" in task_ids


# Pytest fixtures
@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "work_start_time": "9:00 AM",
        "work_end_time": "5:00 PM", 
        "energy_patterns": ["morning", "high-energy"],
        "priorities": {"Exercise": 5, "Work": 4, "Fun": 3},
        "layout_preference": {
            "layout": "todolist-structured",
            "subcategory": "day-sections",
            "orderingPattern": "timebox"
        },
        "tasks": [
            {"id": "1", "text": "workout", "categories": ["Exercise"]},
            {"id": "2", "text": "meeting", "categories": ["Work"]},
            {"id": "3", "text": "shopping", "categories": []}
        ]
    }


@pytest.fixture
def sample_task_registry():
    """Sample task registry for testing"""
    task1 = Task(id="1", text="workout", categories=["Exercise"])
    task2 = Task(id="2", text="meeting", categories=["Work"])
    return {"1": task1, "2": task2}


class TestInputsConfigScenarios:
    """Test various InputsConfig payload scenarios following dev-guide.md TDD principles"""
    
    @patch('backend.services.schedule_gen.client')
    def test_minimal_inputs_config(self, mock_client):
        """Test minimal required fields from InputsConfig.tsx"""
        # Mock LLM responses
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        # Minimal required payload from InputsConfig
        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": [],
            "priorities": {},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timebox"
            },
            "tasks": [{"id": "1", "text": "test task", "categories": ["Work"]}]
        }
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        assert "tasks" in result
        assert result["layout_type"] == "todolist-structured"
        assert result["ordering_pattern"] == "timebox"
    
    @patch('backend.services.schedule_gen.client')
    def test_full_inputs_config(self, mock_client):
        """Test complete InputsConfig payload with all fields"""
        # Mock LLM responses
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1},
                {"task_id": "2", "section": "Afternoon", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        # Full payload from InputsConfig.tsx
        user_data = {
            "date": "2024-01-15",
            "name": "Test User",
            "work_start_time": "09:00",
            "work_end_time": "17:00", 
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
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
                {"id": "2", "text": "team meeting", "categories": ["Work"]}
            ]
        }
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        assert len([t for t in result["tasks"] if not t.get("is_section")]) == 2
        
        # Verify task preservation with original IDs
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        task_ids = [t["id"] for t in regular_tasks]
        assert "1" in task_ids and "2" in task_ids
    
    @patch('backend.services.schedule_gen.client')
    def test_priority_subcategory_layout(self, mock_client):
        """Test priority-based layout preference"""
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "High Priority", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        user_data = {
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
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        # Check that priority sections are created
        sections = [t for t in result["tasks"] if t.get("is_section")]
        section_names = [s["text"] for s in sections]
        assert "High Priority" in section_names
    
    @patch('backend.services.schedule_gen.client')
    def test_category_subcategory_layout(self, mock_client):
        """Test category-based layout preference"""
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Work", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_afternoon"],
            "priorities": {"work": "1"},
            "layout_preference": {
                "layout": "todolist-structured", 
                "subcategory": "category",
                "orderingPattern": "batching"
            },
            "tasks": [{"id": "1", "text": "project work", "categories": ["Work"]}]
        }
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        assert result["ordering_pattern"] == "batching"
        # Check that category sections are created
        sections = [t for t in result["tasks"] if t.get("is_section")]
        section_names = [s["text"] for s in sections]
        assert "Work" in section_names
    
    @patch('backend.services.schedule_gen.client')
    def test_unstructured_layout(self, mock_client):
        """Test unstructured layout preference"""
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        user_data = {
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
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        assert result["layout_type"] == "todolist-unstructured"
        assert result["ordering_pattern"] == "alternating"
    
    def test_empty_tasks_list(self):
        """Test handling empty tasks list from InputsConfig"""
        user_data = {
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
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        assert result["tasks"] == []
    
    @patch('backend.services.schedule_gen.client')
    def test_mixed_categorized_uncategorized_tasks(self, mock_client):
        """Test mixed categorized and uncategorized tasks"""
        # Mock categorization call
        categorization_response = Mock()
        categorization_response.content = [Mock()]
        categorization_response.content[0].text = json.dumps({
            "categorizations": [
                {"task_id": "2", "categories": ["Fun"]}
            ]
        })
        
        # Mock ordering call
        ordering_response = Mock()
        ordering_response.content = [Mock()]
        ordering_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1},
                {"task_id": "2", "section": "Evening", "order": 1}
            ]
        })
        
        mock_client.messages.create.side_effect = [categorization_response, ordering_response]
        
        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_evening"],
            "priorities": {"work": "1", "fun": "2"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "three-three-three"
            },
            "tasks": [
                {"id": "1", "text": "categorized task", "categories": ["Work"]},
                {"id": "2", "text": "uncategorized task", "categories": []}
            ]
        }
        
        result = generate_schedule(user_data)
        
        assert result["success"] is True
        assert result["ordering_pattern"] == "three-three-three"
        
        # Verify both tasks are included
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 2
        
        # Verify the uncategorized task got categorized
        uncategorized_task = next(t for t in regular_tasks if t["id"] == "2")
        assert uncategorized_task["categories"] == ["Fun"]


class TestErrorHandling:
    """Test error handling scenarios following dev-guide.md practices"""
    
    @patch('backend.services.schedule_gen.client')
    def test_llm_categorization_failure(self, mock_client):
        """Test graceful handling of categorization API failure"""
        # Mock categorization failure, but ordering success
        categorization_response = Exception("API Error")
        ordering_response = Mock()
        ordering_response.content = [Mock()]
        ordering_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        
        mock_client.messages.create.side_effect = [categorization_response, ordering_response]
        
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
            "tasks": [{"id": "1", "text": "uncategorized task", "categories": []}]
        }
        
        result = generate_schedule(user_data)
        
        # Should still succeed with fallback categories
        assert result["success"] is True
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 1
        assert regular_tasks[0]["categories"] == ["Work"]  # Fallback category
    
    @patch('backend.services.schedule_gen.client')
    def test_llm_ordering_failure(self, mock_client):
        """Test graceful handling of ordering API failure"""
        # Mock ordering failure (second call fails)
        mock_client.messages.create.side_effect = [Mock(), Exception("API Error")]
        
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
            "tasks": [{"id": "1", "text": "test task", "categories": ["Work"]}]
        }
        
        result = generate_schedule(user_data)
        
        # Should still succeed with fallback error response
        assert result["success"] is False
        assert "error" in result
        assert "tasks" in result  # Should include fallback tasks


if __name__ == "__main__":
    pytest.main([__file__])