"""
Test Suite for Simple Fallback Strategy

Tests the fast fallback mechanism that displays user's existing schedule
with error toast instead of complex recovery logic.
"""

import pytest
import uuid
from backend.models.task import Task
from backend.services.schedule_gen import (
    create_error_response,
    generate_local_sections
)


class TestSimpleFallbackStrategy:
    """Test simple fallback strategy functionality"""
    
    def test_create_simple_fallback_schedule_basic(self):
        """Test basic fallback schedule creation"""
        tasks = [
            {"id": "1", "text": "Task 1", "categories": ["Work"], "completed": False},
            {"id": "2", "text": "Task 2", "categories": ["Exercise"], "completed": False},
            {"id": "3", "text": "Task 3", "categories": ["Fun"], "completed": True}
        ]
        
        layout_preference = {
            "subcategory": "day-sections",
            "layout": "todolist-structured",
            "orderingPattern": "untimebox"
        }
        
        result = create_simple_fallback_schedule(tasks, layout_preference)
        
        # Check basic structure
        assert result["success"] is True
        assert result["fallback_used"] is True
        assert result["layout_type"] == "todolist-structured"
        assert result["ordering_pattern"] == "untimebox"
        assert "tasks" in result
        
        # Should have section headers and tasks
        task_list = result["tasks"]
        section_headers = [t for t in task_list if t.get("is_section")]
        regular_tasks = [t for t in task_list if not t.get("is_section")]
        
        assert len(section_headers) == 3  # Morning, Afternoon, Evening
        assert len(regular_tasks) == 3    # Original tasks preserved
    
    def test_round_robin_distribution(self):
        """Test that tasks are distributed round-robin across sections"""
        tasks = [
            {"id": "1", "text": "Task 1", "categories": ["Work"]},
            {"id": "2", "text": "Task 2", "categories": ["Work"]},
            {"id": "3", "text": "Task 3", "categories": ["Work"]},
            {"id": "4", "text": "Task 4", "categories": ["Work"]},
            {"id": "5", "text": "Task 5", "categories": ["Work"]},
            {"id": "6", "text": "Task 6", "categories": ["Work"]}
        ]
        
        layout_preference = {"subcategory": "day-sections"}
        
        result = create_simple_fallback_schedule(tasks, layout_preference)
        task_list = result["tasks"]
        
        # Find tasks in each section
        current_section = None
        section_tasks = {"Morning": [], "Afternoon": [], "Evening": []}
        
        for task in task_list:
            if task.get("is_section"):
                current_section = task["text"]
            elif current_section:
                section_tasks[current_section].append(task)
        
        # Should have 2 tasks in each section (round-robin distribution)
        assert len(section_tasks["Morning"]) == 2
        assert len(section_tasks["Afternoon"]) == 2
        assert len(section_tasks["Evening"]) == 2
        
        # Verify task IDs are distributed correctly
        assert section_tasks["Morning"][0]["id"] == "1"  # Index 0 % 3 = 0
        assert section_tasks["Afternoon"][0]["id"] == "2"  # Index 1 % 3 = 1
        assert section_tasks["Evening"][0]["id"] == "3"   # Index 2 % 3 = 2
        assert section_tasks["Morning"][1]["id"] == "4"   # Index 3 % 3 = 0
    
    def test_different_subcategories(self):
        """Test fallback with different layout subcategories"""
        tasks = [{"id": "1", "text": "Task 1", "categories": ["Work"]}]
        
        # Test priority subcategory
        priority_layout = {"subcategory": "priority"}
        result = create_simple_fallback_schedule(tasks, priority_layout)
        section_names = [t["text"] for t in result["tasks"] if t.get("is_section")]
        assert "High Priority" in section_names
        assert "Medium Priority" in section_names
        assert "Low Priority" in section_names
        
        # Test category subcategory
        category_layout = {"subcategory": "category"}
        result = create_simple_fallback_schedule(tasks, category_layout)
        section_names = [t["text"] for t in result["tasks"] if t.get("is_section")]
        assert "Work" in section_names
        assert "Exercise" in section_names
        assert "Fun" in section_names
        
        # Test unknown subcategory (should default to day-sections)
        unknown_layout = {"subcategory": "unknown"}
        result = create_simple_fallback_schedule(tasks, unknown_layout)
        section_names = [t["text"] for t in result["tasks"] if t.get("is_section")]
        assert "Morning" in section_names
        assert "Afternoon" in section_names
        assert "Evening" in section_names
    
    def test_preserve_task_properties(self):
        """Test that task properties are preserved in fallback"""
        tasks = [
            {
                "id": "task-1",
                "text": "Important task",
                "categories": ["Work", "Urgent"],
                "completed": True,
                "is_subtask": True,
                "level": 2,
                "custom_field": "preserved"
            }
        ]
        
        layout_preference = {"subcategory": "day-sections"}
        result = create_simple_fallback_schedule(tasks, layout_preference)
        
        # Find the task in result
        task_result = next(t for t in result["tasks"] if not t.get("is_section"))
        
        # Verify all properties are preserved
        assert task_result["id"] == "task-1"
        assert task_result["text"] == "Important task"
        assert task_result["categories"] == ["Work", "Urgent"]
        assert task_result["completed"] is True
        # Note: custom fields might not be preserved in the simplified structure
    
    def test_empty_task_list(self):
        """Test fallback with empty task list"""
        layout_preference = {"subcategory": "day-sections"}
        result = create_simple_fallback_schedule([], layout_preference)
        
        assert result["success"] is True
        assert result["fallback_used"] is True
        
        # Should still have section headers but no tasks
        section_headers = [t for t in result["tasks"] if t.get("is_section")]
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        
        assert len(section_headers) == 3
        assert len(regular_tasks) == 0
    
    def test_fallback_performance(self):
        """Test that fallback is significantly faster than normal generation"""
        import time
        
        # Create a moderate number of tasks
        tasks = []
        for i in range(20):
            tasks.append({
                "id": f"task-{i}",
                "text": f"Task {i}",
                "categories": ["Work"],
                "completed": False
            })
        
        layout_preference = {"subcategory": "day-sections"}
        
        # Measure fallback time
        start_time = time.time()
        result = create_simple_fallback_schedule(tasks, layout_preference)
        fallback_time = time.time() - start_time
        
        # Fallback should be very fast (< 0.01 seconds for 20 tasks)
        assert fallback_time < 0.01, f"Fallback too slow: {fallback_time:.6f}s"
        
        # Verify correctness
        assert result["success"] is True
        assert len([t for t in result["tasks"] if not t.get("is_section")]) == 20


class TestErrorResponseWithFallback:
    """Test error response creation with fallback strategy"""
    
    def test_create_error_response_basic(self):
        """Test basic error response with simplified fallback"""
        error = ValueError("Test error")
        layout_preference = {
            "layout": "todolist-structured",
            "orderingPattern": "timeboxed"
        }
        
        # Create Task objects
        original_tasks = [
            Task.from_dict({"id": "1", "text": "Task 1", "categories": ["Work"]}),
            Task.from_dict({"id": "2", "text": "Task 2", "categories": ["Fun"]})
        ]
        
        result = create_error_response(error, layout_preference, original_tasks)
        
        # Check error response structure
        assert result["success"] is False
        assert result["error"] == "Test error"
        assert result["show_error_toast"] is True  # New flag for frontend
        assert result["fallback_used"] is True     # Indicates fallback was used
        assert result["layout_type"] == "todolist-structured"
        assert result["ordering_pattern"] == "timeboxed"
        assert "tasks" in result
        
        # Should return original tasks unchanged (simple fallback)
        task_list = result["tasks"]
        
        # Should have original tasks preserved exactly
        assert len(task_list) == 2
        
        # Find the original tasks
        task_ids = {t["id"] for t in task_list}
        assert "1" in task_ids
        assert "2" in task_ids
        
        # Verify tasks have proper structure and properties preserved
        task_1 = next(t for t in task_list if t["id"] == "1")
        task_2 = next(t for t in task_list if t["id"] == "2")
        
        assert task_1["text"] == "Task 1"
        assert task_1["categories"] == ["Work"]
        assert task_2["text"] == "Task 2"
        assert task_2["categories"] == ["Fun"]
    
    def test_error_response_with_show_toast_flag(self):
        """Test error response includes show_error_toast flag"""
        error = Exception("Connection timeout")
        layout_preference = {}
        original_tasks = []
        
        result = create_error_response(error, layout_preference, original_tasks)
        
        # Should indicate this is an error that needs a toast
        assert result["success"] is False
        assert result["error"] == "Connection timeout"
        assert result["show_error_toast"] is True  # Flag for frontend toast notification
        assert result["fallback_used"] is True     # Indicates fallback strategy was used
        assert len(result["tasks"]) == 0           # No tasks in this example
    
    def test_error_response_preserves_task_order(self):
        """Test that error response preserves exact task order and properties"""
        original_tasks = []
        for i in range(5):
            task = Task.from_dict({
                "id": f"task-{i}",
                "text": f"Task {i}",
                "categories": ["Work"],
                "completed": i % 2 == 0  # Alternate completion status
            })
            original_tasks.append(task)
        
        error = RuntimeError("LLM failure")
        result = create_error_response(error, {}, original_tasks)
        
        # Verify task preservation in exact order (simple fallback)
        task_list = result["tasks"]
        
        # Should have all original tasks in exact order
        assert len(task_list) == 5
        
        # Verify all task IDs are present in correct order
        for i, task in enumerate(task_list):
            expected_id = f"task-{i}"
            assert task["id"] == expected_id
            assert task["text"] == f"Task {i}"
            assert task["completed"] == (i % 2 == 0)
            assert task["categories"] == ["Work"]


class TestLocalSectionGeneration:
    """Test local section generation for different layouts"""
    
    def test_generate_day_sections(self):
        """Test day-sections layout generation"""
        layout = {"subcategory": "day-sections"}
        sections = generate_local_sections(layout)
        
        expected = ["Morning", "Afternoon", "Evening"]
        assert sections == expected
    
    def test_generate_priority_sections(self):
        """Test priority layout generation"""
        layout = {"subcategory": "priority"}
        sections = generate_local_sections(layout)
        
        expected = ["High Priority", "Medium Priority", "Low Priority"]
        assert sections == expected
    
    def test_generate_category_sections(self):
        """Test category layout generation"""
        layout = {"subcategory": "category"}
        sections = generate_local_sections(layout)
        
        expected = ["Work", "Exercise", "Relationships", "Fun", "Ambition"]
        assert sections == expected
    
    def test_generate_default_sections(self):
        """Test default layout when subcategory is unknown"""
        layouts = [
            {"subcategory": "unknown"},
            {"subcategory": ""},
            {},
            {"other_field": "value"}
        ]
        
        for layout in layouts:
            sections = generate_local_sections(layout)
            expected = ["Morning", "Afternoon", "Evening"]
            assert sections == expected, f"Failed for layout: {layout}"


class TestFallbackIntegration:
    """Test integration between fallback strategy and existing code"""
    
    def test_fallback_task_format_compatibility(self):
        """Test that fallback tasks are compatible with frontend format"""
        tasks = [
            {"id": "1", "text": "Test task", "categories": ["Work"], "completed": False}
        ]
        layout = {"subcategory": "day-sections"}
        
        result = create_simple_fallback_schedule(tasks, layout)
        task_list = result["tasks"]
        
        # Check that each task has required frontend fields
        for task in task_list:
            assert "id" in task
            assert "text" in task
            assert "completed" in task
            assert "is_section" in task
            assert "section" in task
            assert "parent_id" in task
            assert "level" in task
            assert "type" in task
    
    def test_fallback_maintains_task_hierarchy(self):
        """Test that fallback handles task hierarchy properly"""
        tasks = [
            {"id": "1", "text": "Parent task", "categories": ["Work"], "level": 0},
            {"id": "2", "text": "Child task", "categories": ["Work"], "level": 1, "parent_id": "1"}
        ]
        layout = {"subcategory": "day-sections"}
        
        result = create_simple_fallback_schedule(tasks, layout)
        
        # Should preserve hierarchy structure
        regular_tasks = [t for t in result["tasks"] if not t.get("is_section")]
        assert len(regular_tasks) == 2
        
        # Tasks should maintain their hierarchy info
        parent_task = next(t for t in regular_tasks if t["id"] == "1")
        child_task = next(t for t in regular_tasks if t["id"] == "2")
        
        assert parent_task["level"] == 0
        assert child_task["level"] == 1
        assert child_task.get("parent_id") == "1"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])