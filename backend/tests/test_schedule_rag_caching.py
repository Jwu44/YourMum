"""
Test Suite for Schedule RAG Template Caching System

Tests the performance improvements and thread safety of the template caching
mechanism in schedule_rag.py.
"""

import pytest
import time
import threading
import tempfile
import json
import os
from unittest.mock import patch, MagicMock
from backend.services.schedule_rag import (
    load_schedule_templates,
    get_cached_templates,
    clear_template_cache
)
from backend.services import schedule_rag


class TestTemplateCaching:
    """Test template caching functionality"""
    
    def setup_method(self):
        """Reset cache before each test"""
        clear_template_cache()
    
    def teardown_method(self):
        """Clean up after each test"""
        clear_template_cache()
    
    def test_cache_initialization(self):
        """Test that cache starts empty and gets populated"""
        # Cache should start empty
        assert schedule_rag._template_cache is None
        
        # First call should populate cache
        templates = get_cached_templates()
        assert schedule_rag._template_cache is not None
        assert isinstance(templates, dict)
        assert "templates" in templates
    
    def test_cache_persistence(self):
        """Test that subsequent calls use cached data"""
        # First call
        templates1 = get_cached_templates()
        
        # Second call should return same cached object
        templates2 = get_cached_templates()
        
        # Should be the exact same object (memory reference)
        assert templates1 is templates2
    
    def test_cache_performance_improvement(self):
        """Test that caching provides significant performance improvement"""
        # Measure time for first call (cache miss)
        start_time = time.time()
        templates1 = get_cached_templates()
        first_call_time = time.time() - start_time
        
        # Measure time for second call (cache hit)
        start_time = time.time()
        templates2 = get_cached_templates()
        second_call_time = time.time() - start_time
        
        # Cache hit should be significantly faster (at least 80% faster)
        improvement_ratio = (first_call_time - second_call_time) / first_call_time
        assert improvement_ratio > 0.8, f"Expected >80% improvement, got {improvement_ratio:.2%}"
        
        # Verify we got the same data
        assert templates1 == templates2
    
    def test_thread_safety(self):
        """Test concurrent access to caching system"""
        results = []
        errors = []
        
        def cache_access_worker():
            """Worker function for concurrent cache access"""
            try:
                templates = get_cached_templates()
                results.append(templates)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads accessing cache concurrently
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=cache_access_worker)
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check results
        assert len(errors) == 0, f"Thread safety errors: {errors}"
        assert len(results) == 10, "All threads should have completed"
        
        # All results should be identical (same cached object)
        first_result = results[0]
        for result in results[1:]:
            assert result is first_result, "All threads should get same cached object"
    
    def test_cache_invalidation(self):
        """Test cache clearing functionality"""
        # Populate cache
        templates1 = get_cached_templates()
        assert schedule_rag._template_cache is not None
        
        # Clear cache
        clear_template_cache()
        assert schedule_rag._template_cache is None
        
        # Next call should reload from disk
        templates2 = get_cached_templates()
        assert schedule_rag._template_cache is not None
        
        # Should be different object instances (new load)
        assert templates1 is not templates2
        # But should have same content
        assert templates1 == templates2
    
    @patch('backend.services.schedule_rag.os.path.exists')
    @patch('builtins.open')
    def test_cache_with_file_not_found(self, mock_open, mock_exists):
        """Test caching behavior when template file doesn't exist"""
        mock_exists.return_value = False
        
        templates = get_cached_templates()
        
        # Should return empty templates structure
        assert templates == {"templates": []}
        
        # Cache should still be set (caching the empty result)
        assert schedule_rag._template_cache is not None
    
    @patch('backend.services.schedule_rag.os.path.exists')
    @patch('builtins.open')
    def test_cache_with_json_error(self, mock_open, mock_exists):
        """Test caching behavior with JSON parsing errors"""
        mock_exists.return_value = True
        mock_open.return_value.__enter__.return_value.read.return_value = "invalid json"
        
        templates = get_cached_templates()
        
        # Should return empty templates structure on error
        assert templates == {"templates": []}
        
        # Cache should still be set (caching the error result)
        assert schedule_rag._template_cache is not None
    
    def test_multiple_cache_access_patterns(self):
        """Test various cache access patterns"""
        # Pattern 1: Single access
        t1 = get_cached_templates()
        
        # Pattern 2: Rapid repeated access
        results = []
        for _ in range(5):
            results.append(get_cached_templates())
        
        # All should be the same cached object
        for result in results:
            assert result is t1
        
        # Pattern 3: Access after brief delay
        time.sleep(0.1)
        t2 = get_cached_templates()
        assert t2 is t1
        
        # Pattern 4: Access after cache clear and reload
        clear_template_cache()
        t3 = get_cached_templates()
        assert t3 is not t1  # Different object
        assert t3 == t1       # Same content


class TestCacheStatistics:
    """Test cache performance statistics and monitoring"""
    
    def setup_method(self):
        """Reset cache before each test"""
        clear_template_cache()
    
    def test_cache_hit_ratio_calculation(self):
        """Test calculation of cache hit ratios"""
        # First call - cache miss
        get_cached_templates()
        
        # Multiple cache hits
        for _ in range(9):
            get_cached_templates()
        
        # Should have 90% hit ratio (9 hits out of 10 total calls)
        # Note: This would require implementing cache statistics
        # For now, we verify the caching behavior manually
        
        start_time = time.time()
        get_cached_templates()
        cache_hit_time = time.time() - start_time
        
        # Cache hit should be very fast (< 0.001 seconds)
        assert cache_hit_time < 0.001, f"Cache hit too slow: {cache_hit_time:.6f}s"


class TestIntegrationWithExistingFunctions:
    """Test integration with existing RAG functions"""
    
    def setup_method(self):
        """Reset cache before each test"""
        clear_template_cache()
    
    def test_retrieve_schedule_examples_uses_cache(self):
        """Test that retrieve_schedule_examples benefits from caching"""
        from backend.services.schedule_rag import retrieve_schedule_examples
        
        # First call - should populate cache
        start_time = time.time()
        examples1 = retrieve_schedule_examples("day-sections", "timeboxed")
        first_call_time = time.time() - start_time
        
        # Second call - should use cache
        start_time = time.time()
        examples2 = retrieve_schedule_examples("day-sections", "timeboxed")
        second_call_time = time.time() - start_time
        
        # Second call should be faster due to caching
        assert second_call_time < first_call_time
        
        # Results should be identical
        assert examples1 == examples2
    
    def test_create_enhanced_prompt_performance(self):
        """Test that prompt creation benefits from template caching"""
        from backend.services.schedule_rag import create_enhanced_ordering_prompt_content
        
        task_summaries = [
            {"id": "1", "text": "Test task", "categories": ["Work"]}
        ]
        user_data = {
            "energy_patterns": ["morning"],
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "priorities": {"high": "urgent tasks"}
        }
        sections = ["Morning", "Afternoon", "Evening"]
        
        # First call
        start_time = time.time()
        prompt1 = create_enhanced_ordering_prompt_content(
            "day-sections", "timeboxed", task_summaries, user_data, sections
        )
        first_call_time = time.time() - start_time
        
        # Second call
        start_time = time.time()
        prompt2 = create_enhanced_ordering_prompt_content(
            "day-sections", "timeboxed", task_summaries, user_data, sections
        )
        second_call_time = time.time() - start_time
        
        # Second call should be faster due to template caching
        assert second_call_time < first_call_time
        
        # Prompts should be identical
        assert prompt1 == prompt2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])