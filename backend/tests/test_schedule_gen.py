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
    categorize_tasks,
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
        success = categorize_tasks(uncategorized, registry)
        
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
        
        success = categorize_tasks(uncategorized, registry)
        
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
    
    def test_unplaced_tasks_go_to_last_section_instead_of_other_tasks_section(self):
        """Test that unplaced tasks are placed in the last section instead of creating 'Other Tasks' section"""
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task2 = Task(id="2", text="meeting", categories=["Work"])
        task3 = Task(id="3", text="shopping", categories=["Fun"])
        registry = {"1": task1, "2": task2, "3": task3}
        
        # Only place two tasks, leaving one unplaced
        placements = [
            {"task_id": "1", "section": "Morning", "order": 1},
            {"task_id": "2", "section": "Afternoon", "order": 1}
            # task3 is intentionally unplaced
        ]
        
        sections = ["Morning", "Afternoon", "Evening"]
        layout_preference = {
            "layout": "todolist-structured",
            "orderingPattern": "timebox"
        }
        
        result = assemble_final_schedule(placements, registry, sections, layout_preference)
        
        # Should be successful
        assert result["success"] is True
        
        # Extract sections and tasks
        section_tasks = [t for t in result["tasks"] if t.get("is_section")]
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        
        # Should have exactly 3 sections (no "Other Tasks" section)
        assert len(section_tasks) == 3
        section_names = [s["text"] for s in section_tasks]
        assert "Morning" in section_names
        assert "Afternoon" in section_names  
        assert "Evening" in section_names
        assert "Other Tasks" not in section_names  # Should NOT create "Other Tasks"
        
        # Should have all 3 tasks
        assert len(regular_tasks) == 3
        
        # The unplaced task (task3) should be in the Evening section (last section)
        # and placed at the bottom of that section
        task3_result = next(t for t in regular_tasks if t["id"] == "3")
        assert task3_result["section"] == "Evening"
        
        # Verify task3 appears after any other Evening section tasks
        evening_tasks = [t for t in regular_tasks if t["section"] == "Evening"]
        # In this test, task3 should be the only Evening task, so it should be there
        assert len(evening_tasks) == 1
        assert evening_tasks[0]["id"] == "3"
    
    def test_unplaced_tasks_with_no_sections_unstructured_layout(self):
        """Test unplaced tasks behavior with unstructured layout (no sections)"""
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task2 = Task(id="2", text="meeting", categories=["Work"])
        registry = {"1": task1, "2": task2}
        
        # Only place one task
        placements = [
            {"task_id": "1", "section": "", "order": 1}  # No section for unstructured
        ]
        
        sections = []  # Empty sections for unstructured layout
        layout_preference = {
            "layout": "todolist-unstructured",
            "orderingPattern": "alternating"
        }
        
        result = assemble_final_schedule(placements, registry, sections, layout_preference)
        
        # Should be successful
        assert result["success"] is True
        
        # No sections should be created
        section_tasks = [t for t in result["tasks"] if t.get("is_section")]
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        
        assert len(section_tasks) == 0  # No sections for unstructured
        assert len(regular_tasks) == 2  # Both tasks should be included
        
        # All tasks should have section = None
        for task in regular_tasks:
            assert task["section"] is None


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


class TestTaskMetadataPreservation:
    """Test task metadata preservation for Google Calendar and Slack tasks"""

    @patch('backend.services.schedule_gen.client')
    def test_google_calendar_task_preserves_metadata_and_times(self, mock_client):
        """Test that Google Calendar tasks preserve gcal_event_id, from_gcal, source and original times"""
        # Mock LLM ordering response with time allocation
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "gcal-123", "section": "Morning", "order": 1, "time_allocation": "10:00am - 11:00am"}
            ]
        })
        mock_client.messages.create.return_value = mock_response

        # Google Calendar task with metadata and original times
        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_morning"],
            "priorities": {"work": "1"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "timing": "timebox"
            },
            "tasks": [{
                "id": "gcal-123",
                "text": "go to walmart",
                "categories": [],
                "completed": False,
                "is_subtask": False,
                "is_section": False,
                "section": None,
                "parent_id": None,
                "level": 0,
                "section_index": 0,
                "type": "task",
                "start_time": "15:00",        # Original calendar time
                "end_time": "16:00",          # Original calendar time
                "is_recurring": None,
                "start_date": "2025-09-24",
                "gcal_event_id": "gcal-123",  # Google Calendar metadata
                "from_gcal": True,            # Google Calendar flag
                "source": "calendar"          # Source field
            }]
        }

        result = generate_schedule(user_data)

        assert result["success"] is True
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 1

        gcal_task = regular_tasks[0]

        # Verify Google Calendar metadata is preserved
        assert gcal_task["gcal_event_id"] == "gcal-123"
        assert gcal_task["from_gcal"] is True
        assert gcal_task["source"] == "calendar"

        # Verify original times are preserved (NOT overwritten by LLM time allocation)
        assert gcal_task["start_time"] == "15:00"
        assert gcal_task["end_time"] == "16:00"

        # Verify scheduling fields are added
        assert gcal_task["section"] == "Morning"
        assert gcal_task["id"] == "gcal-123"
        assert gcal_task["text"] == "go to walmart"

    @patch('backend.services.schedule_gen.client')
    def test_slack_task_preserves_metadata_and_times(self, mock_client):
        """Test that Slack tasks preserve slack_message_url, source and original times if present"""
        # Mock LLM ordering response with time allocation
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "slack-456", "section": "Afternoon", "order": 1, "time_allocation": "2:00pm - 3:00pm"}
            ]
        })
        mock_client.messages.create.return_value = mock_response

        # Slack task with metadata and original times
        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_afternoon"],
            "priorities": {"work": "1"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "timing": "timebox"
            },
            "tasks": [{
                "id": "slack-456",
                "text": "Follow up on project",
                "categories": ["Work"],
                "completed": False,
                "start_time": "13:30",                    # Original Slack time
                "end_time": "14:00",                      # Original Slack time
                "slack_message_url": "https://slack.com/message/456",  # Slack metadata
                "source": "slack"                         # Source field
            }]
        }

        result = generate_schedule(user_data)

        assert result["success"] is True
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 1

        slack_task = regular_tasks[0]

        # Verify Slack metadata is preserved
        assert slack_task["slack_message_url"] == "https://slack.com/message/456"
        assert slack_task["source"] == "slack"

        # Verify original times are preserved (NOT overwritten by LLM time allocation)
        assert slack_task["start_time"] == "13:30"
        assert slack_task["end_time"] == "14:00"

        # Verify scheduling fields are added
        assert slack_task["section"] == "Afternoon"
        assert slack_task["id"] == "slack-456"
        assert slack_task["text"] == "Follow up on project"

    @patch('backend.services.schedule_gen.client')
    def test_manual_task_gets_llm_time_allocation(self, mock_client):
        """Test that manual tasks (no source) get LLM time allocation normally"""
        # Mock LLM ordering response with time allocation
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "manual-789", "section": "Evening", "order": 1, "time_allocation": "7:00pm - 8:00pm"}
            ]
        })
        mock_client.messages.create.return_value = mock_response

        # Manual task without source metadata
        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_evening"],
            "priorities": {"fun": "1"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "timing": "timebox"
            },
            "tasks": [{
                "id": "manual-789",
                "text": "Read book",
                "categories": ["Fun"],
                "completed": False
                # No source metadata, no original times
            }]
        }

        result = generate_schedule(user_data)

        assert result["success"] is True
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 1

        manual_task = regular_tasks[0]

        # Verify LLM time allocation is applied (since no original times to preserve)
        assert manual_task["start_time"] == "7:00pm"  # LLM time allocation format
        assert manual_task["end_time"] == "8:00pm"    # LLM time allocation format

        # Verify scheduling fields are added
        assert manual_task["section"] == "Evening"
        assert manual_task["id"] == "manual-789"
        assert manual_task["text"] == "Read book"

    @patch('backend.services.schedule_gen.client')
    def test_mixed_tasks_preserve_metadata_correctly(self, mock_client):
        """Test mixed Google Calendar, Slack, and manual tasks all handled correctly"""
        # Mock LLM ordering response with time allocations
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "gcal-111", "section": "Morning", "order": 1, "time_allocation": "9:00am - 10:00am"},
                {"task_id": "slack-222", "section": "Afternoon", "order": 1, "time_allocation": "2:00pm - 3:00pm"},
                {"task_id": "manual-333", "section": "Evening", "order": 1, "time_allocation": "6:00pm - 7:00pm"}
            ]
        })
        mock_client.messages.create.return_value = mock_response

        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_morning"],
            "priorities": {"work": "1"},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "timing": "timebox"
            },
            "tasks": [
                # Google Calendar task
                {
                    "id": "gcal-111",
                    "text": "Doctor appointment",
                    "categories": [],
                    "start_time": "10:30",
                    "end_time": "11:00",
                    "gcal_event_id": "gcal-111",
                    "from_gcal": True,
                    "source": "calendar"
                },
                # Slack task
                {
                    "id": "slack-222",
                    "text": "Team standup",
                    "categories": ["Work"],
                    "start_time": "14:00",
                    "end_time": "14:30",
                    "slack_message_url": "https://slack.com/message/222",
                    "source": "slack"
                },
                # Manual task
                {
                    "id": "manual-333",
                    "text": "Grocery shopping",
                    "categories": ["Fun"]
                    # No source metadata or times
                }
            ]
        }

        result = generate_schedule(user_data)

        assert result["success"] is True
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 3

        # Find each task
        gcal_task = next(t for t in regular_tasks if t["id"] == "gcal-111")
        slack_task = next(t for t in regular_tasks if t["id"] == "slack-222")
        manual_task = next(t for t in regular_tasks if t["id"] == "manual-333")

        # Verify Google Calendar task preserves original times and metadata
        assert gcal_task["start_time"] == "10:30"  # Original preserved
        assert gcal_task["end_time"] == "11:00"    # Original preserved
        assert gcal_task["gcal_event_id"] == "gcal-111"
        assert gcal_task["from_gcal"] is True
        assert gcal_task["source"] == "calendar"

        # Verify Slack task preserves original times and metadata
        assert slack_task["start_time"] == "14:00"  # Original preserved
        assert slack_task["end_time"] == "14:30"    # Original preserved
        assert slack_task["slack_message_url"] == "https://slack.com/message/222"
        assert slack_task["source"] == "slack"

        # Verify manual task gets LLM time allocation
        assert manual_task["start_time"] == "6:00pm"  # LLM time allocation format
        assert manual_task["end_time"] == "7:00pm"    # LLM time allocation format
        # Manual task should not have source metadata
        assert "gcal_event_id" not in manual_task
        assert "slack_message_url" not in manual_task

    @patch('backend.services.schedule_gen.client')
    def test_unstructured_layout_preserves_metadata(self, mock_client):
        """Test metadata preservation also works with unstructured layout"""
        # Mock LLM ordering response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "gcal-555", "section": "", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response

        user_data = {
            "work_start_time": "09:00",
            "work_end_time": "17:00",
            "energy_patterns": ["peak_morning"],
            "priorities": {"health": "1"},
            "layout_preference": {
                "layout": "todolist-unstructured",
                "timing": "untimebox"
            },
            "tasks": [{
                "id": "gcal-555",
                "text": "Gym class",
                "categories": [],
                "start_time": "08:00",
                "end_time": "09:00",
                "gcal_event_id": "gcal-555",
                "from_gcal": True,
                "source": "calendar"
            }]
        }

        result = generate_schedule(user_data)

        assert result["success"] is True
        # No sections for unstructured layout
        section_tasks = [t for t in result["tasks"] if t.get("is_section")]
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(section_tasks) == 0
        assert len(regular_tasks) == 1

        gcal_task = regular_tasks[0]

        # Verify Google Calendar metadata is preserved even in unstructured layout
        assert gcal_task["gcal_event_id"] == "gcal-555"
        assert gcal_task["from_gcal"] is True
        assert gcal_task["source"] == "calendar"

        # Verify original times are preserved (for untimebox, times should still be preserved for calendar tasks)
        assert gcal_task["start_time"] == "08:00"
        assert gcal_task["end_time"] == "09:00"

        # Verify unstructured layout fields
        assert gcal_task["section"] is None
        assert gcal_task["id"] == "gcal-555"


if __name__ == "__main__":
    pytest.main([__file__])