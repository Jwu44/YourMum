"""
Schedule RAG (Retrieval-Augmented Generation) System

This module implements template retrieval and formatting functions for enhancing
schedule generation with concrete examples from schedule_templates.json.
"""

import json
import os
from typing import Dict, List, Any, Union


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


def get_pattern_definitions() -> Dict[str, str]:
    """
    Get canonical definitions for all ordering patterns.
    
    Returns:
        Dictionary mapping pattern names to their definitions
    """
    return {
        "untimeboxed": "Base ordering using energy patterns and priorities (no specific times). This is the baseline pattern that other patterns build upon.",
        
        "timeboxed": "Untimeboxed ordering + specific time allocations with strict work/non-work windows. Tasks are assigned specific start and end times.",
        
        "batching": "Group similar tasks by theme/skill/activity type. Tasks of the same category or requiring similar skills are clustered together.",
        
        "three-three-three": "1 deep focus task (~3 hours) + ≤3 medium tasks + ≤3 maintenance tasks. This creates a balanced workload structure.",
        
        "alternating": "Alternate between different theme/skill/activity types. Prevents mental fatigue by switching between different kinds of work."
    }


def normalize_ordering_pattern(pattern: Union[str, List[str]]) -> Union[str, List[str]]:
    """
    Normalize ordering patterns to match template format.
    Frontend uses 'timebox'/'untimebox' but templates use 'timeboxed'/'untimeboxed'.
    """
    pattern_mapping = {
        'timebox': 'timeboxed',
        'untimebox': 'untimeboxed'
    }
    
    if isinstance(pattern, str):
        return pattern_mapping.get(pattern, pattern)
    elif isinstance(pattern, list):
        return [pattern_mapping.get(p, p) for p in pattern]
    else:
        return pattern


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
    # Normalize pattern names to match template format
    normalized_pattern = normalize_ordering_pattern(ordering_pattern)
    print(f"[RAG] Searching for examples: subcategory='{subcategory}', pattern='{ordering_pattern}' -> normalized='{normalized_pattern}'")
    
    try:
        templates_data = load_schedule_templates()
        
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
            
            # Check ordering pattern exact match using normalized pattern
            template_pattern = template["ordering_pattern"]
            
            if isinstance(normalized_pattern, str):
                # Single pattern matching
                if template_pattern == normalized_pattern:
                    matching_examples.append(template)
                    print(f"[RAG] Found matching template: {template.get('id', 'unknown')}")
                else:
                    pattern_mismatches += 1
            elif isinstance(normalized_pattern, list):
                # Compound pattern matching - must be exact match including order
                if (isinstance(template_pattern, list) and 
                    template_pattern == normalized_pattern):
                    matching_examples.append(template)
                    print(f"[RAG] Found matching compound template: {template.get('id', 'unknown')}")
                else:
                    pattern_mismatches += 1
            
            # Limit to max 5 examples
            if len(matching_examples) >= 5:
                break
        
        print(f"[RAG] Search results: {len(matching_examples)} matches found")
        print(f"[RAG] Stats: {templates_checked} checked, {invalid_templates} invalid, {subcategory_mismatches} subcategory mismatches, {pattern_mismatches} pattern mismatches")
        
        return matching_examples
        
    except Exception as e:
        print(f"[RAG] ERROR: Exception retrieving examples: {str(e)}")
        return []


def format_examples_for_prompt(examples: List[Dict[str, Any]]) -> str:
    """
    Format retrieved examples for inclusion in the LLM prompt.
    
    Args:
        examples: List of template dictionaries
        
    Returns:
        Formatted string ready for prompt inclusion
    """
    if not examples:
        return ""
    
    formatted_examples = []
    
    for i, example in enumerate(examples, 1):
        example_lines = example.get("example", [])
        
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
    print(f"[RAG] Creating enhanced prompt for subcategory='{subcategory}', pattern='{ordering_pattern}'")
    
    # Get pattern definitions
    pattern_definitions = get_pattern_definitions()
    print(f"[RAG] Loaded {len(pattern_definitions)} pattern definitions")
    
    # Normalize the ordering pattern for template matching
    normalized_pattern = normalize_ordering_pattern(ordering_pattern)
    
    # Retrieve relevant examples using normalized pattern
    examples = retrieve_schedule_examples(subcategory, normalized_pattern)
    formatted_examples = format_examples_for_prompt(examples)
    print(f"[RAG] Formatted examples length: {len(formatted_examples)} characters")
    
    # Extract user preferences
    energy_patterns = ', '.join(user_data.get('energy_patterns', []))
    work_schedule = f"{user_data.get('work_start_time', '9:00 AM')} - {user_data.get('work_end_time', '5:00 PM')}"
    priorities = user_data.get('priorities', {})
    priority_text = ", ".join([f"{k}: {v}" for k, v in priorities.items()])
    
    # Determine primary pattern for definition - use normalized pattern
    primary_pattern = normalized_pattern if isinstance(normalized_pattern, str) else normalized_pattern[0]
    
    # Build enhanced prompt
    prompt = f"""You are a productivity expert. Place the following tasks into the most optimal sections and order based on user preferences and the provided examples.

<definitions>
Pattern Definitions:
"""
    
    # Include relevant pattern definitions using normalized patterns
    pattern_count = 0
    if isinstance(normalized_pattern, str):
        if normalized_pattern in pattern_definitions:
            prompt += f"- {normalized_pattern}: {pattern_definitions[normalized_pattern]}\n"
            pattern_count += 1
    else:
        for pattern in normalized_pattern:
            if pattern in pattern_definitions:
                prompt += f"- {pattern}: {pattern_definitions[pattern]}\n"
                pattern_count += 1
    
    print(f"[RAG] Added {pattern_count} pattern definitions to prompt")
    
    prompt += """
Note: 'untimeboxed' is the baseline pattern. Other patterns build upon it by adding specific constraints or structures.
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
- Selected Pattern: {ordering_pattern} (normalized: {normalized_pattern})
- Available Sections: {', '.join(sections)}
</user_context>

<instructions>
Tasks to place:
{json.dumps(task_summaries, indent=2)}

Instructions:
1. Follow the selected ordering pattern: {normalized_pattern}
2. Assign each task to the most appropriate section
3. Determine the optimal order within each section based on the pattern
4. Consider energy patterns, work schedule, and priorities
5. Work tasks should be placed during work hours when possible
6. High-energy tasks should align with high-energy periods
7. If tasks have existing time constraints, preserve those times when ordering pattern is not 'untimeboxed'

Respond with valid JSON in this exact format:
{{
    "placements": [
        {{"task_id": "task_id_1", "section": "Morning", "order": 1}},
        {{"task_id": "task_id_2", "section": "Afternoon", "order": 1}}
    ]
}}
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