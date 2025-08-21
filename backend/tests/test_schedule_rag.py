"""
Test Suite for Schedule RAG (Retrieval-Augmented Generation) System
Tests template retrieval, pattern definitions, and example formatting functions
"""

import pytest
import json
import os
from unittest.mock import Mock, patch, mock_open
from typing import Dict, List, Any

# Import the functions we'll be testing (will be implemented next)
from backend.services.schedule_rag import (
    retrieve_schedule_examples,
    get_pattern_definitions,
    format_examples_for_prompt,
    load_schedule_templates,
    get_cached_templates,
    clear_template_cache
)


class TestTemplateLoading:
    """Test schedule template loading functionality"""
    
    @patch('builtins.open', new_callable=mock_open, read_data='{"templates": []}')
    @patch('os.path.exists', return_value=True)
    def test_load_schedule_templates_success(self, mock_exists, mock_file):
        """Test successful loading of schedule templates"""
        result = load_schedule_templates()
        
        assert result == {"templates": []}
        mock_file.assert_called_once_with('/Users/justinwu/Desktop/yourdAI/backend/data/schedule_templates.json', 'r')
    
    @patch('os.path.exists', return_value=False)
    def test_load_schedule_templates_file_not_found(self, mock_exists):
        """Test handling when template file doesn't exist"""
        result = load_schedule_templates()
        
        assert result == {"templates": []}
    
    @patch('builtins.open', new_callable=mock_open, read_data='invalid json')
    @patch('os.path.exists', return_value=True)
    def test_load_schedule_templates_invalid_json(self, mock_exists, mock_file):
        """Test handling malformed JSON in template file"""
        result = load_schedule_templates()
        
        assert result == {"templates": []}


class TestPatternDefinitions:
    """Test pattern definition functionality"""
    
    def test_get_pattern_definitions_structure(self):
        """Test that pattern definitions include all required patterns"""
        definitions = get_pattern_definitions()
        
        expected_patterns = [
            "untimebox",
            "timebox", 
            "batching",
            "three-three-three",
            "alternating"
        ]
        
        for pattern in expected_patterns:
            assert pattern in definitions
            assert isinstance(definitions[pattern], str)
            assert len(definitions[pattern]) > 0
    
    def test_get_pattern_definitions_content(self):
        """Test that pattern definitions contain expected content"""
        definitions = get_pattern_definitions()
        
        # Test specific pattern definition content
        assert "energy patterns" in definitions["untimebox"].lower()
        assert "time allocations" in definitions["timebox"].lower()
        assert "group similar tasks" in definitions["batching"].lower()
        assert "1 deep focus" in definitions["three-three-three"].lower()
        assert "alternate tasks" in definitions["alternating"].lower()


class TestScheduleExampleRetrieval:
    """Test schedule example retrieval functionality"""
    
    def setup_method(self):
        """Clear cache before each test to ensure mocked data is used"""
        clear_template_cache()
    
    def setUp_sample_templates(self):
        """Helper to create sample templates for testing"""
        return {
            "templates": [
                {
                    "id": "day-sections-timebox-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timebox",
                    "example": [
                        "Morning 🌞",
                        "□ 7:00am - 7:45am: Morning routine",
                        "□ 8:00am - 9:00am: Read the news"
                    ]
                },
                {
                    "id": "day-sections-timebox-2", 
                    "subcategory": "day-sections",
                    "ordering_pattern": "timebox",
                    "example": [
                        "Morning 🌞",
                        "□ 6:30am - 7:15am: Morning jog"
                    ]
                },
                {
                    "id": "day-sections-untimebox-1",
                    "subcategory": "day-sections", 
                    "ordering_pattern": "untimebox",
                    "example": [
                        "Morning 🌞",
                        "□ Morning routine",
                        "□ Read the news"
                    ]
                },
                {
                    "id": "day-sections-alternating-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": ["alternating", "timebox"],
                    "example": [
                        "Morning 🌞",
                        "□ 7:30am - 8:15am: Coffee walk",
                        "□ 8:30am - 10:00am: Analyze data"
                    ]
                },
                {
                    "id": "priority-batching-1",
                    "subcategory": "priority",
                    "ordering_pattern": ["batching", "timebox"],
                    "example": [
                        "High Priority",
                        "□ 9:00am - 11:00am: Complete project"
                    ]
                }
            ]
        }
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_single_pattern_match(self, mock_load):
        """Test retrieving examples for single pattern"""
        mock_load.return_value = self.setUp_sample_templates()
        
        examples = retrieve_schedule_examples("day-sections", "timebox")
        
        assert len(examples) == 2
        assert all(ex["ordering_pattern"] == "timebox" for ex in examples)
        assert all(ex["subcategory"] == "day-sections" for ex in examples)
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_compound_pattern_match(self, mock_load):
        """Test retrieving examples for compound pattern"""
        mock_load.return_value = self.setUp_sample_templates()
        
        examples = retrieve_schedule_examples("day-sections", ["alternating", "timebox"])
        
        assert len(examples) == 1
        assert examples[0]["ordering_pattern"] == ["alternating", "timebox"]
        assert examples[0]["subcategory"] == "day-sections"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_no_matches(self, mock_load):
        """Test retrieving examples when no matches found"""
        mock_load.return_value = self.setUp_sample_templates()
        
        examples = retrieve_schedule_examples("nonexistent", "pattern")
        
        assert examples == []
    
    @patch('backend.services.schedule_rag.get_cached_templates')
    def test_retrieve_examples_max_limit(self, mock_get_cached):
        """Test that max 5 examples are returned"""
        # Create 7 matching templates
        templates = {
            "templates": [
                {
                    "id": f"day-sections-timebox-{i}",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timebox",
                    "example": [f"Example {i}"]
                }
                for i in range(1, 8)
            ]
        }
        mock_get_cached.return_value = templates
        
        examples = retrieve_schedule_examples("day-sections", "timebox")
        
        assert len(examples) == 5  # Should be limited to 5
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_different_subcategories(self, mock_load):
        """Test exact matching on subcategory"""
        mock_load.return_value = self.setUp_sample_templates()
        
        day_examples = retrieve_schedule_examples("day-sections", "timebox")
        priority_examples = retrieve_schedule_examples("priority", ["batching", "timebox"])
        
        assert len(day_examples) == 2
        assert len(priority_examples) == 1
        assert day_examples[0]["subcategory"] == "day-sections"
        assert priority_examples[0]["subcategory"] == "priority"


class TestExampleFormatting:
    """Test example formatting for prompts"""
    
    def test_format_examples_for_prompt_single_example(self):
        """Test formatting single example for prompt"""
        examples = [
            {
                "id": "test-1",
                "subcategory": "day-sections",
                "ordering_pattern": "timeboxed",
                "example": [
                    "Morning 🌞",
                    "□ 7:00am - 7:45am: Morning routine",
                    "□ 8:00am - 9:00am: Read the news"
                ]
            }
        ]
        
        formatted = format_examples_for_prompt(examples)
        
        assert "Example 1:" in formatted
        assert "Morning 🌞" in formatted
        assert "7:00am - 7:45am: Morning routine" in formatted
        assert "8:00am - 9:00am: Read the news" in formatted
    
    def test_format_examples_for_prompt_multiple_examples(self):
        """Test formatting multiple examples for prompt"""
        examples = [
            {
                "id": "test-1",
                "subcategory": "day-sections", 
                "ordering_pattern": "timeboxed",
                "example": ["Morning 🌞", "□ 7:00am - 7:45am: Task 1"]
            },
            {
                "id": "test-2",
                "subcategory": "day-sections",
                "ordering_pattern": "timeboxed", 
                "example": ["Afternoon 🌇", "□ 1:00pm - 2:00pm: Task 2"]
            }
        ]
        
        formatted = format_examples_for_prompt(examples)
        
        assert "Example 1:" in formatted
        assert "Example 2:" in formatted
        assert "Task 1" in formatted
        assert "Task 2" in formatted
    
    def test_format_examples_for_prompt_empty_list(self):
        """Test formatting empty examples list"""
        examples = []
        
        formatted = format_examples_for_prompt(examples)
        
        assert formatted == ""
    
    def test_format_examples_for_prompt_limits_examples(self):
        """Test that function limits to max 3 examples"""
        # Create 5 examples
        examples = []
        for i in range(1, 6):
            examples.append({
                "id": f"test-{i}",
                "subcategory": "day-sections",
                "ordering_pattern": "timeboxed",
                "example": [f"Example {i} line 1", f"Example {i} line 2"]
            })
        
        formatted = format_examples_for_prompt(examples)
        
        # Should only have 3 examples
        assert "Example 1:" in formatted
        assert "Example 2:" in formatted
        assert "Example 3:" in formatted
        assert "Example 4:" not in formatted
        assert "Example 5:" not in formatted
    
    def test_format_examples_for_prompt_limits_lines_per_example(self):
        """Test that function limits to max 5 lines per example"""
        examples = [
            {
                "id": "test-1",
                "subcategory": "day-sections",
                "ordering_pattern": "timeboxed",
                "example": [
                    "Line 1",
                    "Line 2", 
                    "Line 3",
                    "Line 4",
                    "Line 5",
                    "Line 6 - should be cut",
                    "Line 7 - should be cut"
                ]
            }
        ]
        
        formatted = format_examples_for_prompt(examples)
        
        # Should include first 5 lines
        assert "Line 1" in formatted
        assert "Line 2" in formatted
        assert "Line 3" in formatted
        assert "Line 4" in formatted
        assert "Line 5" in formatted
        
        # Should NOT include lines 6 and 7
        assert "Line 6 - should be cut" not in formatted
        assert "Line 7 - should be cut" not in formatted


class TestPatternMatching:
    """Test pattern matching logic"""
    
    def setup_method(self):
        """Clear cache before each test to ensure mocked data is used"""
        clear_template_cache()
    
    def setUp_pattern_test_templates(self):
        """Helper for pattern matching tests"""
        return {
            "templates": [
                {
                    "id": "single-pattern",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timebox",
                    "example": ["Single pattern example"]
                },
                {
                    "id": "compound-pattern-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": ["alternating", "timebox"],
                    "example": ["Compound pattern example 1"]
                },
                {
                    "id": "compound-pattern-2", 
                    "subcategory": "day-sections",
                    "ordering_pattern": ["timebox", "alternating"],  # Different order
                    "example": ["Compound pattern example 2"]
                }
            ]
        }
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_pattern_matching_exact_single(self, mock_load):
        """Test exact matching for single patterns"""
        mock_load.return_value = self.setUp_pattern_test_templates()
        
        examples = retrieve_schedule_examples("day-sections", "timebox")
        
        # Should only match the single pattern, not compounds containing timebox
        assert len(examples) == 1
        assert examples[0]["id"] == "single-pattern"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_pattern_matching_exact_compound(self, mock_load):
        """Test exact matching for compound patterns"""
        mock_load.return_value = self.setUp_pattern_test_templates()
        
        examples = retrieve_schedule_examples("day-sections", ["alternating", "timebox"])
        
        # Should match exact compound pattern
        assert len(examples) == 1
        assert examples[0]["id"] == "compound-pattern-1"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_pattern_matching_order_sensitive(self, mock_load):
        """Test that pattern order matters in matching"""
        mock_load.return_value = self.setUp_pattern_test_templates()
        
        examples1 = retrieve_schedule_examples("day-sections", ["alternating", "timebox"])
        examples2 = retrieve_schedule_examples("day-sections", ["timebox", "alternating"])
        
        assert len(examples1) == 1
        assert len(examples2) == 1
        assert examples1[0]["id"] != examples2[0]["id"]


class TestErrorHandling:
    """Test error handling scenarios"""
    
    def setup_method(self):
        """Clear cache before each test to ensure mocked data is used"""
        clear_template_cache()
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_with_malformed_template(self, mock_load):
        """Test handling templates with missing fields"""
        templates = {
            "templates": [
                {
                    "id": "incomplete-1",
                    "subcategory": "day-sections",
                    # Missing ordering_pattern
                    "example": ["Example"]
                },
                {
                    "id": "complete-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timebox",
                    "example": ["Complete example"]
                }
            ]
        }
        mock_load.return_value = templates
        
        examples = retrieve_schedule_examples("day-sections", "timebox")
        
        # Should only return complete template
        assert len(examples) == 1
        assert examples[0]["id"] == "complete-1"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_with_empty_templates(self, mock_load):
        """Test handling empty templates list"""
        mock_load.return_value = {"templates": []}
        
        examples = retrieve_schedule_examples("day-sections", "timebox")
        
        assert examples == []
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_with_none_templates(self, mock_load):
        """Test handling None return from load_schedule_templates"""
        mock_load.return_value = None
        
        examples = retrieve_schedule_examples("day-sections", "timebox")
        
        assert examples == []


# Pytest fixtures
@pytest.fixture
def sample_schedule_templates():
    """Sample schedule templates for testing"""
    return {
        "templates": [
            {
                "id": "day-sections-timebox-1",
                "subcategory": "day-sections",
                "ordering_pattern": "timebox", 
                "example": [
                    "Morning 🌞",
                    "□ 7:00am - 7:45am: Morning routine",
                    "□ 8:00am - 9:00am: Read the news"
                ]
            },
            {
                "id": "day-sections-alternating-1",
                "subcategory": "day-sections",
                "ordering_pattern": ["alternating", "timebox"],
                "example": [
                    "Morning 🌞", 
                    "□ 7:30am - 8:15am: Coffee walk",
                    "□ 8:30am - 10:00am: Analyze data"
                ]
            }
        ]
    }


class TestNormalizeDeprecation:
    """Test suite for verifying safe removal of normalize_ordering_pattern"""
    
    def setup_method(self):
        """Clear cache before each test to ensure clean state"""
        clear_template_cache()
    
    def test_direct_pattern_usage_smoke_test(self):
        """Smoke test: Verify template retrieval works without normalization"""
        from backend.services.schedule_rag import retrieve_schedule_examples
        
        # Test single pattern - should work directly
        examples = retrieve_schedule_examples("day-sections", "timebox")
        assert isinstance(examples, list)
        
        # Test unknown pattern - should return empty list gracefully  
        examples = retrieve_schedule_examples("day-sections", "unknown_pattern")
        assert examples == []
        
        # Test compound pattern - should work directly
        examples = retrieve_schedule_examples("day-sections", ["alternating", "timebox"])
        assert isinstance(examples, list)
    
    def test_prompt_generation_without_normalization_smoke_test(self):
        """Smoke test: Verify prompt generation works without normalization"""
        from backend.services.schedule_rag import create_enhanced_ordering_prompt_content
        
        task_summaries = [{"id": "1", "text": "Test task", "categories": ["Work"]}]
        user_data = {
            "energy_patterns": ["morning"],
            "work_start_time": "9:00 AM", 
            "work_end_time": "5:00 PM",
            "priorities": {"high": "urgent"}
        }
        sections = ["Morning", "Afternoon", "Evening"]
        
        # Test single pattern
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections",
            ordering_pattern="timebox",
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        
        assert len(prompt) > 0
        assert "timebox" in prompt
        assert "Test task" in prompt
        
        # Test compound pattern
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections", 
            ordering_pattern=["alternating", "timebox"],
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        
        assert len(prompt) > 0
        assert "alternating" in prompt
        assert "timebox" in prompt
    
    def test_pattern_consistency_validation(self):
        """Validate that templates and code use consistent naming"""
        from backend.services.schedule_rag import get_pattern_definitions
        
        definitions = get_pattern_definitions()
        
        # Verify pattern definitions use the expected naming
        assert "timebox" in definitions
        assert "untimebox" in definitions
        
        # Verify no old naming exists
        assert "timeboxed" not in definitions
        assert "untimeboxed" not in definitions


if __name__ == "__main__":
    pytest.main([__file__])