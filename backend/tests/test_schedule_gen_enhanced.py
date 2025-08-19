"""
Integration Test Suite for Enhanced Schedule Generation with RAG System
Tests the integration between schedule_gen.py and schedule_rag.py
"""

import pytest
import json
from unittest.mock import Mock, patch, mock_open
from typing import Dict, List, Any

# Import the functions we'll be testing
from backend.services.schedule_gen import (
    create_ordering_prompt,
    generate_schedule,
    create_task_registry
)
from backend.models.task import Task


class TestEnhancedPromptGeneration:
    """Test enhanced prompt generation with RAG integration"""
    
    def setUp_sample_rag_data(self):
        """Helper to set up sample RAG data for testing"""
        return {
            "templates": [
                {
                    "id": "day-sections-timeboxed-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timeboxed",
                    "example": [
                        "Morning 🌞",
                        "□ 7:00am - 7:45am: Morning routine",
                        "□ 8:00am - 9:00am: Read the news",
                        "□ 9:00am - 9:30am: Check emails"
                    ]
                },
                {
                    "id": "day-sections-alternating-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": ["alternating", "timeboxed"],
                    "example": [
                        "Morning 🌞",
                        "□ 7:30am - 8:15am: Coffee walk",
                        "□ 8:30am - 10:00am: Deep work session",
                        "□ 10:00am - 10:30am: Creative brainstorming"
                    ]
                },
                {
                    "id": "priority-batching-1",
                    "subcategory": "priority",
                    "ordering_pattern": ["batching", "timeboxed"],
                    "example": [
                        "High Priority",
                        "□ 9:00am - 11:00am: Project milestone",
                        "□ 11:00am - 12:00pm: Critical bug fixes"
                    ]
                }
            ]
        }
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_enhanced_prompt_includes_pattern_definitions(self, mock_load):
        """Test that enhanced prompt includes pattern definitions"""
        mock_load.return_value = self.setUp_sample_rag_data()
        
        # Create test task registry
        task1 = Task(id="1", text="morning workout", categories=["Exercise"])
        task2 = Task(id="2", text="team meeting", categories=["Work"])
        task_registry = {"1": task1, "2": task2}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5, "Work": 4},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify prompt structure includes definitions
        assert "<definitions>" in prompt
        assert "</definitions>" in prompt
        assert "timeboxed:" in prompt
        assert "time allocations" in prompt.lower()
        assert "untimeboxed" in prompt.lower() and "baseline" in prompt.lower()
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_enhanced_prompt_includes_examples(self, mock_load):
        """Test that enhanced prompt includes relevant examples"""
        mock_load.return_value = self.setUp_sample_rag_data()
        
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify prompt includes examples
        assert "<examples>" in prompt
        assert "</examples>" in prompt
        assert "Example 1:" in prompt
        assert "7:00am - 7:45am: Morning routine" in prompt
        assert "Morning 🌞" in prompt
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_enhanced_prompt_compound_pattern(self, mock_load):
        """Test enhanced prompt with compound ordering pattern"""
        mock_load.return_value = self.setUp_sample_rag_data()
        
        task1 = Task(id="1", text="analyze data", categories=["Work"])
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Work": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": ["alternating", "timeboxed"]
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify compound pattern handling
        assert "alternating:" in prompt
        assert "timeboxed:" in prompt
        assert "Coffee walk" in prompt  # From alternating example
        assert "Selected Pattern: ['alternating', 'timeboxed']" in prompt
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_enhanced_prompt_different_subcategory(self, mock_load):
        """Test enhanced prompt with different subcategory"""
        mock_load.return_value = self.setUp_sample_rag_data()
        
        task1 = Task(id="1", text="critical task", categories=["Work"])
        task_registry = {"1": task1}
        
        sections = ["High Priority", "Medium Priority", "Low Priority"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Work": 5},
            "layout_preference": {
                "subcategory": "priority",
                "orderingPattern": ["batching", "timeboxed"]
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify priority-based examples are used
        assert "High Priority" in prompt
        assert "Project milestone" in prompt
        assert "Critical bug fixes" in prompt
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_enhanced_prompt_no_matching_examples(self, mock_load):
        """Test enhanced prompt when no matching examples found"""
        mock_load.return_value = {"templates": []}  # Empty templates
        
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Should still include definitions but no examples
        assert "<definitions>" in prompt
        assert "timeboxed:" in prompt
        assert "<examples>" not in prompt or "<examples>\n\n</examples>" in prompt


class TestTimeConstraintDetection:
    """Test time constraint detection and preservation"""
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_time_constraint_detection_in_text(self, mock_load):
        """Test detection of time constraints in task text"""
        mock_load.return_value = {"templates": []}
        
        # Task with time in text
        task1 = Task(id="1", text="9:00am - 10:00am: Team standup", categories=["Work"])
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Work": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify time constraints are detected and included
        assert "time_constraints" in prompt
        assert "9:00am" in prompt
        assert "10:00am" in prompt
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_time_constraint_detection_in_task_object(self, mock_load):
        """Test detection of time constraints in task object fields"""
        mock_load.return_value = {"templates": []}
        
        # Task with time fields
        task1 = Task(id="1", text="Team meeting", categories=["Work"])
        task1.start_time = "2:00 PM"
        task1.end_time = "3:00 PM"
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["afternoon"],
            "priorities": {"Work": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify time constraints from object fields are included
        assert "time_constraints" in prompt
        assert "2:00 PM" in prompt
        assert "3:00 PM" in prompt
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_time_preservation_instruction(self, mock_load):
        """Test that time preservation instructions are included"""
        mock_load.return_value = {"templates": []}
        
        task1 = Task(id="1", text="9:00am - 10:00am: Important meeting", categories=["Work"])
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Work": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"  # Not untimeboxed
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify time preservation instruction is included
        assert "preserve those times" in prompt.lower()
        assert "untimeboxed" in prompt


class TestPromptFallback:
    """Test fallback behavior when RAG system fails"""
    
    @patch('backend.services.schedule_gen.create_enhanced_ordering_prompt_content')
    def test_fallback_on_rag_failure(self, mock_enhanced_prompt):
        """Test fallback to basic prompt when RAG system fails"""
        # Mock RAG system failure
        mock_enhanced_prompt.side_effect = Exception("RAG system error")
        
        task1 = Task(id="1", text="workout", categories=["Exercise"])
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Should still generate a valid prompt
        assert "productivity expert" in prompt.lower()
        assert "workout" in prompt
        assert "timeboxed" in prompt
        assert "Morning" in prompt
        assert "placements" in prompt
    
    @patch('backend.services.schedule_gen.create_enhanced_ordering_prompt_content')
    def test_fallback_includes_ordering_pattern(self, mock_enhanced_prompt):
        """Test that fallback prompt includes ordering pattern"""
        mock_enhanced_prompt.side_effect = Exception("RAG system error")
        
        task1 = Task(id="1", text="deep work", categories=["Work"])
        task_registry = {"1": task1}
        
        sections = ["Morning", "Afternoon", "Evening"]
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Work": 5},
            "layout_preference": {
                "subcategory": "day-sections",
                "orderingPattern": "batching"
            }
        }
        
        prompt = create_ordering_prompt(task_registry, sections, user_data)
        
        # Verify ordering pattern is included in fallback
        assert "batching" in prompt
        assert "Follow the ordering pattern: batching" in prompt


class TestIntegrationWithGenerateSchedule:
    """Test integration with the main generate_schedule function"""
    
    @patch('backend.services.schedule_gen.client')
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_generate_schedule_with_enhanced_prompts(self, mock_load, mock_client):
        """Test that generate_schedule uses enhanced prompts"""
        # Mock RAG data
        mock_load.return_value = {
            "templates": [
                {
                    "id": "day-sections-timeboxed-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timeboxed",
                    "example": ["Morning 🌞", "□ 7:00am - 8:00am: Morning routine"]
                }
            ]
        }
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            },
            "tasks": [
                {"id": "1", "text": "morning workout", "categories": ["Exercise"]}
            ]
        }
        
        result = generate_schedule(user_data)
        
        # Verify successful generation
        assert result["success"] is True
        assert "tasks" in result
        
        # Verify that the LLM was called (meaning enhanced prompt was created)
        mock_client.messages.create.assert_called_once()
        
        # Get the prompt that was sent to the LLM
        call_args = mock_client.messages.create.call_args
        prompt_sent = call_args[1]["messages"][0]["content"]
        
        # Verify enhanced prompt features
        assert "<definitions>" in prompt_sent
        assert "timeboxed:" in prompt_sent
        assert "<examples>" in prompt_sent or "Example 1:" in prompt_sent


class TestErrorRecovery:
    """Test error recovery scenarios"""
    
    @patch('backend.services.schedule_gen.client')
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_schedule_generation_with_rag_failure(self, mock_load, mock_client):
        """Test that schedule generation continues even if RAG fails"""
        # Mock RAG failure
        mock_load.side_effect = Exception("File system error")
        
        # Mock successful LLM response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1}
            ]
        })
        mock_client.messages.create.return_value = mock_response
        
        user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5},
            "layout_preference": {
                "layout": "todolist-structured",
                "subcategory": "day-sections",
                "orderingPattern": "timeboxed"
            },
            "tasks": [
                {"id": "1", "text": "workout", "categories": ["Exercise"]}
            ]
        }
        
        result = generate_schedule(user_data)
        
        # Should still succeed with fallback prompt
        assert result["success"] is True
        assert len([t for t in result["tasks"] if not t.get("is_section")]) == 1


if __name__ == "__main__":
    pytest.main([__file__])