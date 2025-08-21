"""
Test Suite for Prompt Size Optimization

Tests the prompt length reduction optimizations while maintaining
schedule generation quality and accuracy.
"""

import pytest
from backend.services.schedule_rag import (
    create_enhanced_ordering_prompt_content,
    format_examples_for_prompt,
    retrieve_schedule_examples,
    get_pattern_definitions
)


class TestPromptSizeOptimization:
    """Test prompt size optimization functionality"""
    
    def test_prompt_length_under_target(self):
        """Test that optimized prompts stay under 4000 character target"""
        task_summaries = [
            {"id": "1", "text": "Complete project proposal", "categories": ["Work"]},
            {"id": "2", "text": "Go for morning jog", "categories": ["Exercise"]},
            {"id": "3", "text": "Call mom", "categories": ["Relationships"]},
            {"id": "4", "text": "Read book chapter", "categories": ["Fun"]},
            {"id": "5", "text": "Practice guitar", "categories": ["Ambition"]}
        ]
        
        user_data = {
            "energy_patterns": ["morning", "evening"],
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "priorities": {"high": "urgent tasks", "medium": "important tasks"}
        }
        
        sections = ["Morning", "Afternoon", "Evening"]
        
        # Test with different patterns to ensure consistency
        patterns = ["untimeboxed", "timeboxed", "batching", "three-three-three"]
        
        for pattern in patterns:
            prompt = create_enhanced_ordering_prompt_content(
                subcategory="day-sections",
                ordering_pattern=pattern,
                task_summaries=task_summaries,
                user_data=user_data,
                sections=sections
            )
            
            # Target: under 4000 characters (60% reduction from ~12000)
            assert len(prompt) < 4000, f"Prompt too long for pattern {pattern}: {len(prompt)} chars"
            
            # But should still be substantial (not too aggressive cutting)
            assert len(prompt) > 1000, f"Prompt too short for pattern {pattern}: {len(prompt)} chars"
    
    def test_prompt_contains_essential_elements(self):
        """Test that optimized prompts still contain essential elements"""
        task_summaries = [
            {"id": "1", "text": "Test task", "categories": ["Work"]}
        ]
        
        user_data = {
            "energy_patterns": ["morning"],
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "priorities": {"high": "urgent"}
        }
        
        sections = ["Morning", "Afternoon", "Evening"]
        
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections",
            ordering_pattern="untimeboxed",
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        
        # Essential elements that must be present
        essential_elements = [
            "productivity expert",  # Role definition
            "untimeboxed",  # Pattern specification
            "9:00 AM",  # Work schedule
            "Morning",  # Sections
            "JSON",  # Response format
            "task_id",  # Response structure
            "section",  # Response structure
            "order"  # Response structure
        ]
        
        for element in essential_elements:
            assert element in prompt, f"Essential element '{element}' missing from prompt"
        
        # Should not contain excessive debug information
        debug_patterns = ["[RAG]", "DEBUG", "VERBOSE", "TRACE"]
        for debug_pattern in debug_patterns:
            assert debug_pattern not in prompt, f"Debug pattern '{debug_pattern}' found in prompt"
    
    def test_examples_limitation(self):
        """Test that examples are limited to reduce prompt size"""
        # This test verifies that we limit examples appropriately
        examples = [
            {"example": [f"Task {i}", f"Another task {i}"] for i in range(10)}  # 10 examples
        ]
        
        formatted = format_examples_for_prompt(examples)
        
        # Should not include all 10 examples in formatted output
        # The optimization should limit to 1-2 most relevant examples
        line_count = len(formatted.split('\n'))
        
        # With proper optimization, should have much fewer lines
        # Each example has ~3-4 lines, so 10 examples = ~30-40 lines
        # Optimized should be more like 6-12 lines (1-2 examples)
        assert line_count < 20, f"Too many example lines: {line_count}"
    
    def test_pattern_definitions_conciseness(self):
        """Test that pattern definitions are concise"""
        definitions = get_pattern_definitions()
        
        for pattern, definition in definitions.items():
            # Each definition should be concise (under 150 chars)
            assert len(definition) < 150, f"Definition for '{pattern}' too long: {len(definition)} chars"
            
            # But should still be informative (over 30 chars)
            assert len(definition) > 30, f"Definition for '{pattern}' too short: {len(definition)} chars"
    
    def test_user_context_optimization(self):
        """Test that user context section is optimized"""
        task_summaries = [{"id": "1", "text": "Test", "categories": ["Work"]}]
        sections = ["Morning"]
        
        # Test with verbose user data
        verbose_user_data = {
            "energy_patterns": ["morning", "afternoon", "evening", "late-night"],
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "priorities": {
                "urgent": "tasks that must be done today",
                "important": "tasks that are significant for goals",
                "low": "tasks that can be postponed",
                "someday": "tasks for future consideration"
            }
        }
        
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections",
            ordering_pattern="untimeboxed",
            task_summaries=task_summaries,
            user_data=verbose_user_data,
            sections=sections
        )
        
        # User context should be present but concise
        user_context_start = prompt.find("<user_context>")
        user_context_end = prompt.find("</user_context>")
        
        assert user_context_start != -1, "User context section missing"
        assert user_context_end != -1, "User context section not closed"
        
        user_context = prompt[user_context_start:user_context_end]
        
        # User context should be under 500 characters
        assert len(user_context) < 500, f"User context too long: {len(user_context)} chars"


class TestPromptQualityMaintenance:
    """Test that prompt optimization maintains quality"""
    
    def test_response_format_clarity(self):
        """Test that response format instructions remain clear"""
        task_summaries = [{"id": "1", "text": "Test task", "categories": ["Work"]}]
        user_data = {"work_start_time": "9:00 AM", "work_end_time": "5:00 PM"}
        sections = ["Morning"]
        
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections",
            ordering_pattern="untimeboxed",
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        
        # Response format should be clearly specified
        format_indicators = [
            "JSON",
            "placements",
            "task_id",
            "section",
            "order"
        ]
        
        for indicator in format_indicators:
            assert indicator in prompt, f"Format indicator '{indicator}' missing"
        
        # Should include example JSON structure
        assert "{" in prompt and "}" in prompt, "JSON example structure missing"
    
    def test_pattern_specific_instructions(self):
        """Test that pattern-specific instructions are preserved"""
        task_summaries = [{"id": "1", "text": "Test task", "categories": ["Work"]}]
        user_data = {"work_start_time": "9:00 AM", "work_end_time": "5:00 PM"}
        sections = ["Morning"]
        
        # Test different patterns have specific guidance
        patterns_to_test = ["timeboxed", "batching", "three-three-three"]
        
        for pattern in patterns_to_test:
            prompt = create_enhanced_ordering_prompt_content(
                subcategory="day-sections",
                ordering_pattern=pattern,
                task_summaries=task_summaries,
                user_data=user_data,
                sections=sections
            )
            
            # Pattern should be mentioned in the prompt
            assert pattern in prompt, f"Pattern '{pattern}' not mentioned in prompt"
            
            # Should have pattern-specific instructions
            if pattern == "timeboxed":
                assert "time" in prompt.lower(), "Timeboxed pattern missing time instructions"
            elif pattern == "batching":
                assert "group" in prompt.lower() or "similar" in prompt.lower(), "Batching pattern missing grouping instructions"
            elif pattern == "three-three-three":
                assert "3" in prompt, "Three-three-three pattern missing numeric instructions"
    
    def test_optimization_vs_original_comparison(self):
        """Test prompt optimization by comparing with baseline"""
        task_summaries = [
            {"id": str(i), "text": f"Task {i}", "categories": ["Work"]} 
            for i in range(5)
        ]
        user_data = {
            "energy_patterns": ["morning", "evening"],
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "priorities": {"high": "urgent", "medium": "normal", "low": "later"}
        }
        sections = ["Morning", "Afternoon", "Evening"]
        
        # Generate optimized prompt
        optimized_prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections",
            ordering_pattern="timeboxed",
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        
        # Verify token efficiency (rough estimate: 1 token ≈ 4 characters)
        estimated_tokens = len(optimized_prompt) / 4
        
        # Target: under 1000 tokens (vs original ~3000+ tokens)
        assert estimated_tokens < 1000, f"Estimated tokens too high: {estimated_tokens:.0f}"
        
        # But should still be substantial for quality
        assert estimated_tokens > 250, f"Estimated tokens too low: {estimated_tokens:.0f}"


class TestPromptErrorHandling:
    """Test prompt optimization error handling"""
    
    def test_empty_examples_handling(self):
        """Test prompt generation with no examples available"""
        # Mock scenario where no examples are found
        task_summaries = [{"id": "1", "text": "Test task", "categories": ["Work"]}]
        user_data = {"work_start_time": "9:00 AM", "work_end_time": "5:00 PM"}
        sections = ["Morning"]
        
        # This should work even if retrieve_schedule_examples returns empty
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="unknown-category",  # Likely to return no examples
            ordering_pattern="unknown-pattern",
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        
        # Should still generate a valid prompt
        assert len(prompt) > 500, "Prompt too short without examples"
        assert "JSON" in prompt, "Response format missing without examples"
        
        # Should not contain empty examples section
        assert "<examples>\n\n</examples>" not in prompt, "Empty examples section present"
    
    def test_large_task_list_handling(self):
        """Test prompt optimization with large task lists"""
        # Create a large task list
        task_summaries = [
            {"id": str(i), "text": f"Task {i} with detailed description", "categories": ["Work"]}
            for i in range(50)  # Large task list
        ]
        
        user_data = {"work_start_time": "9:00 AM", "work_end_time": "5:00 PM"}
        sections = ["Morning", "Afternoon", "Evening"]
        
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections",
            ordering_pattern="untimeboxed",
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        
        # Should handle large task lists without exceeding limits
        # Even with 50 tasks, prompt should stay reasonable
        assert len(prompt) < 8000, f"Prompt too long with large task list: {len(prompt)} chars"
        
        # Should still contain all task IDs
        task_json_section = prompt[prompt.find("Tasks to place:"):]
        for i in range(50):
            assert f'"{i}"' in task_json_section, f"Task {i} missing from prompt"
    
    def test_malformed_user_data_handling(self):
        """Test prompt generation with malformed user data"""
        task_summaries = [{"id": "1", "text": "Test task", "categories": ["Work"]}]
        sections = ["Morning"]
        
        # Test with missing/malformed user data
        malformed_data_sets = [
            {},  # Empty
            {"energy_patterns": None},  # None values
            {"work_start_time": ""},  # Empty strings
            {"priorities": []},  # Wrong types
        ]
        
        for malformed_data in malformed_data_sets:
            prompt = create_enhanced_ordering_prompt_content(
                subcategory="day-sections",
                ordering_pattern="untimeboxed",
                task_summaries=task_summaries,
                user_data=malformed_data,
                sections=sections
            )
            
            # Should still generate valid prompt
            assert len(prompt) > 500, f"Prompt too short with malformed data: {malformed_data}"
            assert "JSON" in prompt, f"Invalid prompt with malformed data: {malformed_data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])