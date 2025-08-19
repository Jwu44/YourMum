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
    load_schedule_templates
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
            "untimeboxed",
            "timeboxed", 
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
        assert "energy patterns" in definitions["untimeboxed"].lower()
        assert "time allocations" in definitions["timeboxed"].lower()
        assert "group similar tasks" in definitions["batching"].lower()
        assert "1 deep focus" in definitions["three-three-three"].lower()
        assert "alternate between" in definitions["alternating"].lower()


class TestScheduleExampleRetrieval:
    """Test schedule example retrieval functionality"""
    
    def setUp_sample_templates(self):
        """Helper to create sample templates for testing"""
        return {
            "templates": [
                {
                    "id": "day-sections-timeboxed-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timeboxed",
                    "example": [
                        "Morning 🌞",
                        "□ 7:00am - 7:45am: Morning routine",
                        "□ 8:00am - 9:00am: Read the news"
                    ]
                },
                {
                    "id": "day-sections-timeboxed-2", 
                    "subcategory": "day-sections",
                    "ordering_pattern": "timeboxed",
                    "example": [
                        "Morning 🌞",
                        "□ 6:30am - 7:15am: Morning jog"
                    ]
                },
                {
                    "id": "day-sections-untimeboxed-1",
                    "subcategory": "day-sections", 
                    "ordering_pattern": "untimeboxed",
                    "example": [
                        "Morning 🌞",
                        "□ Morning routine",
                        "□ Read the news"
                    ]
                },
                {
                    "id": "day-sections-alternating-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": ["alternating", "timeboxed"],
                    "example": [
                        "Morning 🌞",
                        "□ 7:30am - 8:15am: Coffee walk",
                        "□ 8:30am - 10:00am: Analyze data"
                    ]
                },
                {
                    "id": "priority-batching-1",
                    "subcategory": "priority",
                    "ordering_pattern": ["batching", "timeboxed"],
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
        
        examples = retrieve_schedule_examples("day-sections", "timeboxed")
        
        assert len(examples) == 2
        assert all(ex["ordering_pattern"] == "timeboxed" for ex in examples)
        assert all(ex["subcategory"] == "day-sections" for ex in examples)
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_compound_pattern_match(self, mock_load):
        """Test retrieving examples for compound pattern"""
        mock_load.return_value = self.setUp_sample_templates()
        
        examples = retrieve_schedule_examples("day-sections", ["alternating", "timeboxed"])
        
        assert len(examples) == 1
        assert examples[0]["ordering_pattern"] == ["alternating", "timeboxed"]
        assert examples[0]["subcategory"] == "day-sections"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_no_matches(self, mock_load):
        """Test retrieving examples when no matches found"""
        mock_load.return_value = self.setUp_sample_templates()
        
        examples = retrieve_schedule_examples("nonexistent", "pattern")
        
        assert examples == []
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_max_limit(self, mock_load):
        """Test that max 5 examples are returned"""
        # Create 7 matching templates
        templates = {
            "templates": [
                {
                    "id": f"day-sections-timeboxed-{i}",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timeboxed",
                    "example": [f"Example {i}"]
                }
                for i in range(1, 8)
            ]
        }
        mock_load.return_value = templates
        
        examples = retrieve_schedule_examples("day-sections", "timeboxed")
        
        assert len(examples) == 5  # Should be limited to 5
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_different_subcategories(self, mock_load):
        """Test exact matching on subcategory"""
        mock_load.return_value = self.setUp_sample_templates()
        
        day_examples = retrieve_schedule_examples("day-sections", "timeboxed")
        priority_examples = retrieve_schedule_examples("priority", ["batching", "timeboxed"])
        
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


class TestPatternMatching:
    """Test pattern matching logic"""
    
    def setUp_pattern_test_templates(self):
        """Helper for pattern matching tests"""
        return {
            "templates": [
                {
                    "id": "single-pattern",
                    "subcategory": "day-sections",
                    "ordering_pattern": "timeboxed",
                    "example": ["Single pattern example"]
                },
                {
                    "id": "compound-pattern-1",
                    "subcategory": "day-sections",
                    "ordering_pattern": ["alternating", "timeboxed"],
                    "example": ["Compound pattern example 1"]
                },
                {
                    "id": "compound-pattern-2", 
                    "subcategory": "day-sections",
                    "ordering_pattern": ["timeboxed", "alternating"],  # Different order
                    "example": ["Compound pattern example 2"]
                }
            ]
        }
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_pattern_matching_exact_single(self, mock_load):
        """Test exact matching for single patterns"""
        mock_load.return_value = self.setUp_pattern_test_templates()
        
        examples = retrieve_schedule_examples("day-sections", "timeboxed")
        
        # Should only match the single pattern, not compounds containing timeboxed
        assert len(examples) == 1
        assert examples[0]["id"] == "single-pattern"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_pattern_matching_exact_compound(self, mock_load):
        """Test exact matching for compound patterns"""
        mock_load.return_value = self.setUp_pattern_test_templates()
        
        examples = retrieve_schedule_examples("day-sections", ["alternating", "timeboxed"])
        
        # Should match exact compound pattern
        assert len(examples) == 1
        assert examples[0]["id"] == "compound-pattern-1"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_pattern_matching_order_sensitive(self, mock_load):
        """Test that pattern order matters in matching"""
        mock_load.return_value = self.setUp_pattern_test_templates()
        
        examples1 = retrieve_schedule_examples("day-sections", ["alternating", "timeboxed"])
        examples2 = retrieve_schedule_examples("day-sections", ["timeboxed", "alternating"])
        
        assert len(examples1) == 1
        assert len(examples2) == 1
        assert examples1[0]["id"] != examples2[0]["id"]


class TestErrorHandling:
    """Test error handling scenarios"""
    
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
                    "ordering_pattern": "timeboxed",
                    "example": ["Complete example"]
                }
            ]
        }
        mock_load.return_value = templates
        
        examples = retrieve_schedule_examples("day-sections", "timeboxed")
        
        # Should only return complete template
        assert len(examples) == 1
        assert examples[0]["id"] == "complete-1"
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_with_empty_templates(self, mock_load):
        """Test handling empty templates list"""
        mock_load.return_value = {"templates": []}
        
        examples = retrieve_schedule_examples("day-sections", "timeboxed")
        
        assert examples == []
    
    @patch('backend.services.schedule_rag.load_schedule_templates')
    def test_retrieve_examples_with_none_templates(self, mock_load):
        """Test handling None return from load_schedule_templates"""
        mock_load.return_value = None
        
        examples = retrieve_schedule_examples("day-sections", "timeboxed")
        
        assert examples == []


# Pytest fixtures
@pytest.fixture
def sample_schedule_templates():
    """Sample schedule templates for testing"""
    return {
        "templates": [
            {
                "id": "day-sections-timeboxed-1",
                "subcategory": "day-sections",
                "ordering_pattern": "timeboxed", 
                "example": [
                    "Morning 🌞",
                    "□ 7:00am - 7:45am: Morning routine",
                    "□ 8:00am - 9:00am: Read the news"
                ]
            },
            {
                "id": "day-sections-alternating-1",
                "subcategory": "day-sections",
                "ordering_pattern": ["alternating", "timeboxed"],
                "example": [
                    "Morning 🌞", 
                    "□ 7:30am - 8:15am: Coffee walk",
                    "□ 8:30am - 10:00am: Analyze data"
                ]
            }
        ]
    }


if __name__ == "__main__":
    pytest.main([__file__])