#!/usr/bin/env python3
"""
Quick test script to validate RAG system components
"""

import sys
import os
sys.path.append('/Users/justinwu/Desktop/yourdAI')

from backend.services.schedule_rag import (
    load_schedule_templates,
    retrieve_schedule_examples, 
    create_enhanced_ordering_prompt_content,
    normalize_ordering_pattern
)

def test_rag_components():
    print("=== Testing RAG Components ===")
    
    # Test 1: Template loading
    print("\n1. Testing template loading...")
    templates = load_schedule_templates()
    if templates and "templates" in templates:
        print(f"✅ Loaded {len(templates['templates'])} templates")
    else:
        print("❌ Failed to load templates")
        return False
    
    # Test 2: Pattern normalization
    print("\n2. Testing pattern normalization...")
    test_patterns = ['timebox', 'untimebox', 'batching', ['alternating', 'timebox']]
    for pattern in test_patterns:
        normalized = normalize_ordering_pattern(pattern)
        print(f"   {pattern} -> {normalized}")
    
    # Test 3: Example retrieval with common frontend patterns
    print("\n3. Testing example retrieval...")
    test_cases = [
        ('day-sections', 'timebox'),  # Common frontend pattern
        ('day-sections', 'timeboxed'),  # Template pattern
        ('day-sections', 'untimebox'),  # Frontend pattern
        ('priority', 'batching'),
    ]
    
    for subcategory, pattern in test_cases:
        examples = retrieve_schedule_examples(subcategory, pattern)
        print(f"   {subcategory} + {pattern}: {len(examples)} examples found")
        if examples:
            print(f"      First example ID: {examples[0].get('id', 'unknown')}")
    
    # Test 4: Enhanced prompt generation
    print("\n4. Testing enhanced prompt generation...")
    try:
        sample_tasks = [
            {"id": "1", "text": "Morning workout", "categories": ["Exercise"]},
            {"id": "2", "text": "Team meeting", "categories": ["Work"]}
        ]
        
        sample_user_data = {
            "work_start_time": "9:00 AM",
            "work_end_time": "5:00 PM",
            "energy_patterns": ["morning"],
            "priorities": {"Exercise": 5, "Work": 4}
        }
        
        prompt = create_enhanced_ordering_prompt_content(
            subcategory="day-sections",
            ordering_pattern="timebox",  # Frontend pattern
            task_summaries=sample_tasks,
            user_data=sample_user_data,
            sections=["Morning", "Afternoon", "Evening"]
        )
        
        print(f"✅ Generated prompt with {len(prompt)} characters")
        print(f"   Contains '<definitions>': {'<definitions>' in prompt}")
        print(f"   Contains '<examples>': {'<examples>' in prompt}")
        print(f"   Contains 'timeboxed': {'timeboxed' in prompt}")
        
    except Exception as e:
        print(f"❌ Failed to generate enhanced prompt: {e}")
        return False
    
    print("\n=== All Tests Completed ===")
    return True

if __name__ == "__main__":
    success = test_rag_components()
    sys.exit(0 if success else 1)