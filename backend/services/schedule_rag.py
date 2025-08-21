"""
Schedule RAG (Retrieval-Augmented Generation) System

This module implements template retrieval and formatting functions for enhancing
schedule generation with concrete examples from schedule_templates.json.
"""

import json
import os
import threading
from typing import Dict, List, Any, Union

# Global template cache and thread safety lock
_template_cache: Dict[str, Any] = None
_cache_lock = threading.Lock()


def load_schedule_templates() -> Dict[str, Any]:
    """
    Load schedule templates from the JSON file.
    
    Returns:
        Dictionary containing templates, or empty dict if file not found/invalid
    """
    template_file_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), 
        'data', 
        'schedule_templates.json'
    )
    
    print(f"[RAG] Loading templates from: {template_file_path}")
    
    try:
        if not os.path.exists(template_file_path):
            print(f"[RAG] ERROR: Template file not found at: {template_file_path}")
            return {"templates": []}
        
        with open(template_file_path, 'r') as file:
            data = json.load(file)
            template_count = len(data.get("templates", []))
            print(f"[RAG] Successfully loaded {template_count} templates")
            return data
            
    except json.JSONDecodeError as e:
        print(f"[RAG] ERROR: JSON parsing failed: {str(e)}")
        return {"templates": []}
    except Exception as e:
        print(f"[RAG] ERROR: Template loading failed: {str(e)}")
        return {"templates": []}


def get_cached_templates() -> Dict[str, Any]:
    """
    Get schedule templates using thread-safe caching for performance optimization.
    
    Uses double-check locking pattern to ensure thread safety while minimizing
    lock contention for cache hits.
    
    Returns:
        Dictionary containing templates from cache or loaded from disk
    """
    global _template_cache
    
    # Fast path: check cache without lock
    if _template_cache is not None:
        return _template_cache
    
    # Slow path: acquire lock and double-check
    with _cache_lock:
        # Double-check: another thread might have populated cache
        if _template_cache is not None:
            return _template_cache
        
        # Cache miss: load templates and cache them
        print("[RAG] Cache miss - loading templates from disk")
        _template_cache = load_schedule_templates()
        print(f"[RAG] Templates cached successfully")
        return _template_cache


def clear_template_cache() -> None:
    """
    Clear the template cache. Useful for testing and forcing cache refresh.
    
    This function is thread-safe and will force the next call to get_cached_templates()
    to reload templates from disk.
    """
    global _template_cache
    
    with _cache_lock:
        _template_cache = None
        print("[RAG] Template cache cleared")


def get_pattern_definitions() -> Dict[str, str]:
    """
    Get canonical definitions for timing and ordering patterns.
    
    Returns:
        Dictionary mapping pattern names to their definitions
    """
    return {
        # TIMING PATTERNS (how time is managed)
        "untimebox": "Order tasks using energy patterns and priorities with no set start and end time. This is the baseline pattern that other patterns build upon.",
        
        "timebox": "Untimebox ordering + specific time allocations with strict work/non-work windows. Tasks are assigned specific start and end times.",
        
        # ORDERING PATTERNS (how tasks are sequenced/organized)
        "batching": "Group similar tasks by theme/skill/activity type. Tasks of the same category or requiring similar skills are clustered together.",
        
        "alternating": "Alternate tasks by theme/skill/activity type.",
        
        "3-3-3": "1 deep focus task (~3 hours) + ≤3 medium tasks + ≤3 maintenance tasks.",
        
        # BACKWARD COMPATIBILITY - old naming
        "three-three-three": "1 deep focus task (~3 hours) + ≤3 medium tasks + ≤3 maintenance tasks."
    }



def retrieve_schedule_examples(
    subcategory: str, 
    ordering_pattern: Union[str, List[str]]
) -> List[Dict[str, Any]]:
    """
    Retrieve relevant schedule examples from templates based on exact matching.
    
    Args:
        subcategory: The layout subcategory to match (e.g., "day-sections", "priority")
        ordering_pattern: Single pattern string or list of patterns to match
        
    Returns:
        List of matching template dictionaries (max 5 examples)
    """
    import time
    start_time = time.time()
    print(f"[TIMING] retrieve_schedule_examples started")
    print(f"[RAG] Searching for examples: subcategory='{subcategory}', pattern='{ordering_pattern}'")
    
    try:
        cache_start_time = time.time()
        templates_data = get_cached_templates()
        cache_duration = time.time() - cache_start_time
        print(f"[TIMING] Template cache access: {cache_duration:.3f}s")
        
        if not templates_data or "templates" not in templates_data:
            print(f"[RAG] No templates data available")
            return []
        
        templates = templates_data["templates"]
        print(f"[RAG] Searching through {len(templates)} total templates")
        
        matching_examples = []
        templates_checked = 0
        invalid_templates = 0
        subcategory_mismatches = 0
        pattern_mismatches = 0
        
        for template in templates:
            templates_checked += 1
            
            # Validate template has required fields
            if not all(key in template for key in ["subcategory", "ordering_pattern", "example"]):
                invalid_templates += 1
                continue
            
            # Check subcategory exact match
            if template["subcategory"] != subcategory:
                subcategory_mismatches += 1
                continue
            
            # Check ordering pattern exact match
            template_pattern = template["ordering_pattern"]
            
            if isinstance(ordering_pattern, str):
                # Single pattern matching
                if template_pattern == ordering_pattern:
                    matching_examples.append(template)
                    print(f"[RAG] Found matching template: {template.get('id', 'unknown')}")
                else:
                    pattern_mismatches += 1
            elif isinstance(ordering_pattern, list):
                # Compound pattern matching - must be exact match including order
                if (isinstance(template_pattern, list) and 
                    template_pattern == ordering_pattern):
                    matching_examples.append(template)
                    print(f"[RAG] Found matching compound template: {template.get('id', 'unknown')}")
                else:
                    pattern_mismatches += 1
            
            # Limit to max 5 examples
            if len(matching_examples) >= 5:
                break
        
        print(f"[RAG] Search results: {len(matching_examples)} matches found")
        print(f"[RAG] Stats: {templates_checked} checked, {invalid_templates} invalid, {subcategory_mismatches} subcategory mismatches, {pattern_mismatches} pattern mismatches")
        
        duration = time.time() - start_time
        print(f"[TIMING] retrieve_schedule_examples: {duration:.3f}s")
        
        return matching_examples
        
    except Exception as e:
        duration = time.time() - start_time
        print(f"[TIMING] retrieve_schedule_examples failed after: {duration:.3f}s")
        print(f"[RAG] ERROR: Exception retrieving examples: {str(e)}")
        return []


def format_examples_for_prompt(examples: List[Dict[str, Any]]) -> str:
    """
    Format retrieved examples for inclusion in the LLM prompt.
    
    Limits to max 3 examples with 5 lines each for token optimization.
    
    Args:
        examples: List of template dictionaries
        
    Returns:
        Formatted string ready for prompt inclusion
    """
    if not examples:
        return ""
    
    # Limit to max 3 examples for token optimization
    examples = examples[:3]
    
    formatted_examples = []
    
    for i, example in enumerate(examples, 1):
        example_lines = example.get("example", [])
        
        # Limit to max 5 lines per example for token optimization
        example_lines = example_lines[:5]
        
        # Format the example
        formatted_example = f"Example {i}:\n"
        for line in example_lines:
            formatted_example += f"{line}\n"
        
        formatted_examples.append(formatted_example)
    
    return "\n".join(formatted_examples)


def create_enhanced_ordering_prompt_content(
    subcategory: str,
    ordering_pattern: Union[str, List[str]],
    task_summaries: List[Dict[str, Any]],
    user_data: Dict[str, Any],
    sections: List[str]
) -> str:
    """
    Create enhanced prompt content with pattern definitions and examples.
    
    Args:
        subcategory: Layout subcategory
        ordering_pattern: Ordering pattern(s) to use
        task_summaries: List of task summaries
        user_data: User preferences and constraints
        sections: Available sections for placement
        
    Returns:
        Enhanced prompt string with definitions and examples
    """
    # Start timing
    import time
    total_start_time = time.time()
    print(f"[TIMING] create_enhanced_ordering_prompt_content started")
    print(f"[RAG] Creating enhanced prompt for subcategory='{subcategory}', pattern='{ordering_pattern}'")
    
    # Get pattern definitions
    definitions_start_time = time.time()
    pattern_definitions = get_pattern_definitions()
    definitions_duration = time.time() - definitions_start_time
    print(f"[TIMING] Pattern definitions loading: {definitions_duration:.3f}s")
    print(f"[RAG] Loaded {len(pattern_definitions)} pattern definitions")
    
    # Retrieve relevant examples using ordering pattern directly
    examples_start_time = time.time()
    examples = retrieve_schedule_examples(subcategory, ordering_pattern)
    examples_duration = time.time() - examples_start_time
    print(f"[TIMING] Schedule examples retrieval: {examples_duration:.3f}s")
    
    formatting_start_time = time.time()
    formatted_examples = format_examples_for_prompt(examples)
    formatting_duration = time.time() - formatting_start_time
    print(f"[TIMING] Examples formatting: {formatting_duration:.3f}s")
    print(f"[RAG] Formatted examples length: {len(formatted_examples)} characters")
    
    # Extract user preferences
    energy_patterns = ', '.join(user_data.get('energy_patterns', []))
    work_schedule = f"{user_data.get('work_start_time', '9:00 AM')} - {user_data.get('work_end_time', '5:00 PM')}"
    priorities = user_data.get('priorities', {})
    priority_text = ", ".join([f"{k}: {v}" for k, v in priorities.items()])
    
    # Build enhanced prompt
    prompt = f"""You are a productivity expert. Place the following tasks into the most optimal sections and order based on user preferences and the provided examples.

<definitions>
Pattern Definitions:
"""
    
    # Include relevant pattern definitions
    pattern_count = 0
    if isinstance(ordering_pattern, str):
        if ordering_pattern in pattern_definitions:
            prompt += f"- {ordering_pattern}: {pattern_definitions[ordering_pattern]}\n"
            pattern_count += 1
    else:
        for pattern in ordering_pattern:
            if pattern in pattern_definitions:
                prompt += f"- {pattern}: {pattern_definitions[pattern]}\n"
                pattern_count += 1
    
    print(f"[RAG] Added {pattern_count} pattern definitions to prompt")
    
    prompt += """
Note: 'untimebox' is the baseline pattern. Other patterns build upon it by adding specific constraints or structures.
</definitions>

"""
    
    # Include examples if available
    if formatted_examples:
        prompt += f"""<examples>
{formatted_examples}
</examples>

"""
        print(f"[RAG] Added examples section to prompt")
    else:
        print(f"[RAG] No examples added to prompt")
    
    # User context section
    prompt += f"""<user_context>
- Work Schedule: {work_schedule}
- Energy Patterns: {energy_patterns}
- Priorities: {priority_text}
- Selected Pattern: {ordering_pattern}
- Available Sections: {', '.join(sections)}
</user_context>

<instructions>
Tasks to place:
{json.dumps(task_summaries, indent=2)}

Instructions:
1. Follow the selected ordering pattern: {ordering_pattern}
2. Assign each task to the most appropriate section
3. Determine the optimal order within each section based on the pattern
4. Consider energy patterns, work schedule, and priorities
5. Work tasks should be placed during work hours when possible
6. High-energy tasks should align with high-energy periods
7. If tasks have existing time constraints, preserve those times when ordering pattern is not 'untimebox'

Respond with valid JSON in this exact format:
"""
    
    # Conditional JSON format based on ordering pattern
    # Check if 'untimebox' is present in the pattern (works for both single patterns and combined patterns)
    is_untimebox = 'untimebox' in (ordering_pattern if isinstance(ordering_pattern, list) else [ordering_pattern])
    
    if is_untimebox:
        # For untimebox: no time_allocation field
        prompt += """
{
    "placements": [
        {"task_id": "task_id_1", "section": "Morning", "order": 1},
        {"task_id": "task_id_2", "section": "Afternoon", "order": 1}
    ]
}
</instructions>"""
    else:
        # For other patterns: include time_allocation field
        prompt += """
{
    "placements": [
        {"task_id": "task_id_1", "section": "Morning", "order": 1, "time_allocation": "9:00am - 10:00am"},
        {"task_id": "task_id_2", "section": "Afternoon", "order": 1, "time_allocation": "2:00pm - 3:00pm"}
    ]
}
</instructions>"""
    
    prompt_length = len(prompt)
    print(f"[RAG] Generated enhanced prompt with {prompt_length} characters")
    
    # Add safeguards for prompt length
    MAX_PROMPT_LENGTH = 12000  # Conservative limit for Claude
    if prompt_length > MAX_PROMPT_LENGTH:
        print(f"[RAG] ERROR: Prompt too long ({prompt_length} chars), exceeds {MAX_PROMPT_LENGTH} limit")
        print(f"[RAG] Truncating examples to reduce prompt size")
        
        # Try reducing examples first
        if len(examples) > 2:
            truncated_examples = examples[:2]
            truncated_formatted = format_examples_for_prompt(truncated_examples)
            
            # Rebuild prompt with fewer examples
            prompt_parts = prompt.split('<examples>')
            if len(prompt_parts) > 1:
                before_examples = prompt_parts[0]
                after_examples = '</examples>' + prompt_parts[1].split('</examples>', 1)[1]
                
                if truncated_formatted:
                    prompt = before_examples + f"<examples>\n{truncated_formatted}\n</examples>" + after_examples
                else:
                    prompt = before_examples + after_examples
                
                new_length = len(prompt)
                print(f"[RAG] Reduced prompt to {new_length} characters by limiting examples")
                
                if new_length > MAX_PROMPT_LENGTH:
                    print(f"[RAG] ERROR: Still too long after truncation, raising exception")
                    raise ValueError(f"Prompt too long even after truncation: {new_length} chars")
        else:
            print(f"[RAG] ERROR: Prompt too long but cannot reduce further, raising exception")
            raise ValueError(f"Prompt too long and cannot be reduced: {prompt_length} chars")
    
    elif prompt_length > 8000:
        print(f"[RAG] WARNING: Prompt is long ({prompt_length} chars), monitor for issues")
    
    total_duration = time.time() - total_start_time
    print(f"[TIMING] Total create_enhanced_ordering_prompt_content: {total_duration:.3f}s")
    
    return prompt


def check_task_time_constraints(task_text: str) -> Dict[str, str]:
    """
    Check if a task has time constraints in its text.
    
    Args:
        task_text: The task text to analyze
        
    Returns:
        Dictionary with start_time and end_time if found, empty dict otherwise
    """
    import re
    
    # Pattern to match time ranges like "9:00am - 10:00am: Task name"
    time_pattern = r'(\d{1,2}:\d{2}(?:am|pm))\s*-\s*(\d{1,2}:\d{2}(?:am|pm)):'
    
    match = re.search(time_pattern, task_text, re.IGNORECASE)
    if match:
        return {
            "start_time": match.group(1),
            "end_time": match.group(2)
        }
    
    return {}


def parse_time_allocation(time_allocation: str) -> Dict[str, str]:
    """
    Parse time allocation string into start and end times.
    
    Args:
        time_allocation: Time allocation string (e.g., "9:00am - 10:00am")
        
    Returns:
        Dictionary with start_time and end_time if parsed successfully
    """
    import re
    
    if not time_allocation:
        return {}
    
    # Pattern to match time ranges like "9:00am - 10:00am"
    time_pattern = r'(\d{1,2}:\d{2}(?:am|pm))\s*-\s*(\d{1,2}:\d{2}(?:am|pm))'
    
    match = re.search(time_pattern, time_allocation, re.IGNORECASE)
    if match:
        return {
            "start_time": match.group(1),
            "end_time": match.group(2)
        }
    
    return {}