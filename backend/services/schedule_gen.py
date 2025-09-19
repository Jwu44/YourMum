"""
Optimized AI Service Module - Workflow-based schedule generation

This module implements an optimized data preparation pipeline that:
1. Preserves task identity throughout processing
2. Minimizes LLM calls (max 2: categorization + ordering)
3. Eliminates redundant task conversions
4. Uses structured JSON responses instead of text parsing
"""

import os
import json
import uuid
import anthropic
from typing import List, Dict, Any, Tuple
from backend.models.task import Task
from backend.services.schedule_rag import (
    create_enhanced_ordering_prompt_content,
    check_task_time_constraints,
    parse_time_allocation
)
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Anthropic client
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=anthropic_api_key)


def create_task_registry(input_tasks: List[Any]) -> Tuple[Dict[str, Task], List[Task]]:
    """
    Create a task registry and identify tasks needing categorization.
    
    Args:
        input_tasks: List of task dictionaries or Task objects
        
    Returns:
        Tuple of (task_registry, tasks_needing_categorization)
    """
    task_registry = {}
    tasks_needing_categorization = []
    
    # Valid categories for validation
    valid_categories = {"Work", "Exercise", "Relationships", "Fun", "Ambition"}
    
    for task_data in input_tasks:
        # Convert to Task object if needed
        if isinstance(task_data, dict):
            # Ensure task has an ID
            if not task_data.get('id'):
                task_data['id'] = str(uuid.uuid4())
            task = Task.from_dict(task_data)
        else:
            task = task_data
        
        # Add to registry
        task_registry[task.id] = task
        
        # Check if task needs categorization or has invalid categories
        needs_categorization = (
            not task.categories or 
            len(task.categories) == 0 or
            not all(cat in valid_categories for cat in task.categories)
        )
        
        if needs_categorization:
            tasks_needing_categorization.append(task)
            print(f"[CATEGORIZATION] Task '{task.text}' needs categorization. Current categories: {task.categories}")
    
    return task_registry, tasks_needing_categorization


def categorize_tasks(
    tasks_needing_categorization: List[Task], 
    task_registry: Dict[str, Task]
) -> bool:
    """
    Batch categorize tasks using a single LLM call.
    
    Args:
        tasks_needing_categorization: List of tasks needing categorization
        task_registry: Registry to update with categorizations
        
    Returns:
        Boolean indicating success
    """
    if not tasks_needing_categorization:
        return True
    
    try:
        # Create batch categorization prompt
        prompt = create_batch_categorization_prompt(tasks_needing_categorization)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=500,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse response
        response_data = json.loads(response.content[0].text.strip())
        categorizations = response_data.get("categorizations", [])
        
        # Update task registry
        for cat_data in categorizations:
            task_id = cat_data.get("task_id")
            categories = cat_data.get("categories", ["Work"])
            
            if task_id in task_registry:
                task_registry[task_id].categories = categories
        
        return True
        
    except Exception as e:
        print(f"Error in batch categorization: {str(e)}")
        
        # Fallback: assign 'Work' category to all tasks needing categorization
        for task in tasks_needing_categorization:
            task_registry[task.id].categories = ["Work"]
        
        return False


def create_batch_categorization_prompt(tasks: List[Task]) -> str:
    """
    Create a prompt for batch task categorization.
    
    Args:
        tasks: List of tasks to categorize
        
    Returns:
        Formatted prompt string
    """
    task_list = []
    for task in tasks:
        task_list.append(f'"{task.id}": "{task.text}"')
    
    tasks_json = "{\n" + ",\n".join(task_list) + "\n}"
    
    prompt = f"""Categorize the following tasks into these categories:
        1. Exercise - physical activities like walking, running, swimming, gym, etc.
        2. Relationships - activities with friends, family, colleagues, etc.
        3. Fun - personal hobbies, entertainment, shopping, etc.
        4. Ambition - short or long term goals someone wants to achieve
        5. Work - professional tasks, meetings, emails, etc.

        Tasks to categorize:
        {tasks_json}

        Rules:
        - Each task can belong to multiple categories
        - If a task is categorized as 'Work', it should not have other categories
        - Respond only with valid JSON in this exact format:

        {{
            "categorizations": [
                {{"task_id": "task_id_1", "categories": ["Category1", "Category2"]}},
                {{"task_id": "task_id_2", "categories": ["Category1"]}}
            ]
        }}"""

    return prompt


def generate_local_sections(layout_preference: Dict[str, Any]) -> List[str]:
    """
    Generate schedule sections based on layout preferences.
    
    Args:
        layout_preference: User's layout configuration
        
    Returns:
        List of section names
    """
    layout = layout_preference.get("layout", "todolist-structured")
    
    # Handle unstructured layouts first
    if layout == "todolist-unstructured":
        return []  # No sections for unstructured layout - flat task list
    
    # Handle structured layouts by subcategory
    subcategory = layout_preference.get("subcategory", "day-sections")
    
    if subcategory == "day-sections":
        return ["Morning", "Afternoon", "Evening"]
    elif subcategory == "priority":
        return ["High Priority", "Medium Priority", "Low Priority"]
    elif subcategory == "category":
        return ["Work", "Exercise", "Relationships", "Fun", "Ambition"]
    else:
        # Default fallback for structured layouts
        return ["Morning", "Afternoon", "Evening"]



def create_ordering_prompt(
    task_registry: Dict[str, Task], 
    sections: List[str], 
    user_data: Dict[str, Any]
) -> str:
    """
    Create an enhanced prompt for task ordering and placement using RAG system.
    
    Args:
        task_registry: Registry of all tasks
        sections: Available sections for placement
        user_data: User preferences and constraints
        
    Returns:
        Enhanced prompt string with pattern definitions and examples
    """
    # Prepare task summaries with time constraint analysis
    task_summaries = []
    for task_id, task in task_registry.items():
        task_summary = {
            "id": task_id,
            "text": task.text,
            "categories": list(task.categories) if task.categories else []
        }
        
        # Check for existing time constraints in task
        time_constraints = {}
        
        # Check task object for time fields
        if hasattr(task, 'start_time') and task.start_time:
            time_constraints['start_time'] = task.start_time
        if hasattr(task, 'end_time') and task.end_time:
            time_constraints['end_time'] = task.end_time
        
        # Check task text for time patterns
        if not time_constraints:
            time_constraints = check_task_time_constraints(task.text)
        
        if time_constraints:
            task_summary['time_constraints'] = time_constraints
        
        task_summaries.append(task_summary)
    
    # Extract layout preferences and handle new timing/ordering schema
    layout_preference = user_data.get('layout_preference', {})
    layout = layout_preference.get('layout', 'todolist-structured')
    
    # Set subcategory based on layout type
    if layout == 'todolist-unstructured':
        subcategory = 'unstructured'
    else:
        subcategory = layout_preference.get('subcategory', 'day-sections')
    
    # SCHEMA CONVERSION: Handle separate timing and orderingPattern fields
    timing = layout_preference.get('timing')
    ordering_pattern_raw = layout_preference.get('orderingPattern')
    
    # Convert schema to pattern_for_matching format
    if timing and ordering_pattern_raw and ordering_pattern_raw != 'null':
        # New schema: both timing and ordering pattern specified
        # Normalize "three-three-three" to "3-3-3" for consistency
        normalized_pattern = '3-3-3' if ordering_pattern_raw == 'three-three-three' else ordering_pattern_raw
        pattern_for_matching = [normalized_pattern, timing]
        print(f"[SCHEMA_CONVERSION] Combined pattern: {pattern_for_matching}")
    elif timing:
        # New schema: only timing specified (no ordering pattern)
        pattern_for_matching = timing
        print(f"[SCHEMA_CONVERSION] Timing only: {pattern_for_matching}")
    elif ordering_pattern_raw and not timing:
        # DEPRECATED: Legacy single orderingPattern field without timing
        # This path supports old data but should be migrated to new schema
        print(f"[DEPRECATED] Legacy orderingPattern detected: '{ordering_pattern_raw}'. "
              f"Please migrate to new schema with separate 'timing' and 'orderingPattern' fields.")
        # Normalize legacy patterns
        normalized_old = '3-3-3' if ordering_pattern_raw == 'three-three-three' else ordering_pattern_raw
        pattern_for_matching = normalized_old
        print(f"[SCHEMA_CONVERSION] Legacy compatibility: {pattern_for_matching}")
    else:
        # Default fallback when no timing or ordering pattern specified
        pattern_for_matching = 'untimebox'
        print(f"[SCHEMA_CONVERSION] Default fallback: {pattern_for_matching}")
    
    # Use pattern_for_matching for template matching (this is what RAG system expects)
    ordering_pattern = pattern_for_matching
    
    # Use the enhanced RAG prompt creation
    print(f"[SCHEDULE_GEN] Attempting to create enhanced prompt with RAG system")
    print(f"[SCHEDULE_GEN] Parameters: subcategory='{subcategory}', pattern='{ordering_pattern}', tasks={len(task_summaries)}")
    
    try:
        enhanced_prompt = create_enhanced_ordering_prompt_content(
            subcategory=subcategory,
            ordering_pattern=ordering_pattern,
            task_summaries=task_summaries,
            user_data=user_data,
            sections=sections
        )
        print(f"[SCHEDULE_GEN] Successfully created enhanced prompt")
        return enhanced_prompt
        
    except Exception as e:
        print(f"[SCHEDULE_GEN] ERROR: Enhanced prompt creation failed, falling back to basic prompt: {str(e)}")
        import traceback
        print(f"[SCHEDULE_GEN] Full traceback: {traceback.format_exc()}")
        
        # Fallback to original prompt if RAG system fails
        energy_patterns = ', '.join(user_data.get('energy_patterns', []))
        work_schedule = f"{user_data.get('work_start_time', '9:00 AM')} - {user_data.get('work_end_time', '5:00 PM')}"
        priorities = user_data.get('priorities', {})
        priority_text = ", ".join([f"{k}: {v}" for k, v in priorities.items()])
        
        fallback_prompt = f"""You are a productivity expert. Place the following tasks into the most optimal sections and order based on user preferences.

        User Context:
        - Work Schedule: {work_schedule}
        - Energy Patterns: {energy_patterns}
        - Priorities: {priority_text}
        - Ordering Pattern: {ordering_pattern}

        Available Sections: {', '.join(sections)}

        Tasks to place:
        {json.dumps(task_summaries, indent=2)}

        Instructions:
        1. Follow the ordering pattern: {ordering_pattern}
        2. Assign each task to the most appropriate section
        3. Determine the optimal order within each section
        4. Consider energy patterns, work schedule, and priorities
        5. Work tasks should be placed during work hours when possible
        6. High-energy tasks should align with high-energy periods
        7. If tasks have time_constraints and pattern is not 'untimeboxed', preserve those times

        Respond with valid JSON in this exact format:"""
        
        # Conditional JSON format based on ordering pattern
        # Check if 'untimebox' is present in the pattern (works for both single patterns and combined patterns)
        is_untimebox = 'untimebox' in (ordering_pattern if isinstance(ordering_pattern, list) else [ordering_pattern])
        
        if is_untimebox:
            # For untimebox: no time_allocation field
            fallback_prompt += """
        {
            "placements": [
                {"task_id": "task_id_1", "section": "Morning", "order": 1},
                {"task_id": "task_id_2", "section": "Afternoon", "order": 1}
            ]
        }"""
        else:
            # For other patterns: include time_allocation field
            fallback_prompt += """
        {
            "placements": [
                {"task_id": "task_id_1", "section": "Morning", "order": 1, "time_allocation": "9:00am - 10:00am"},
                {"task_id": "task_id_2", "section": "Afternoon", "order": 1, "time_allocation": "2:00pm - 3:00pm"}
            ]
        }"""

        return fallback_prompt


def process_ordering_response(response_text: str) -> List[Dict[str, Any]]:
    """
    Process the LLM ordering response into placement instructions.
    
    Args:
        response_text: Raw LLM response
        
    Returns:
        List of placement instructions
    """
    print(f"[SCHEDULE_GEN] Processing response of length: {len(response_text)}")
    
    if not response_text or response_text.strip() == "":
        print(f"[SCHEDULE_GEN] ERROR: Empty response from LLM")
        return []
    
    try:
        # Clean the response text - sometimes there's extra text before/after JSON
        response_text = response_text.strip()
        
        # Try to find JSON in the response
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            print(f"[SCHEDULE_GEN] ERROR: No JSON found in response")
            print(f"[SCHEDULE_GEN] Response content: {response_text[:500]}")
            return []
        
        json_content = response_text[json_start:json_end]
        print(f"[SCHEDULE_GEN] Extracted JSON content: {json_content[:200]}...")
        
        # Extract JSON from response
        response_data = json.loads(json_content)
        placements = response_data.get("placements", [])
        print(f"[SCHEDULE_GEN] Found {len(placements)} placements in response")
        
        # Validate placement structure
        validated_placements = []
        for i, placement in enumerate(placements):
            if all(key in placement for key in ["task_id", "section", "order"]):
                # Include time_allocation if present (for timeboxed patterns)
                validated_placement = {
                    "task_id": placement["task_id"],
                    "section": placement["section"], 
                    "order": placement["order"]
                }
                if "time_allocation" in placement:
                    validated_placement["time_allocation"] = placement["time_allocation"]
                validated_placements.append(validated_placement)
            else:
                print(f"[SCHEDULE_GEN] Warning: Invalid placement {i}: {placement}")
        
        print(f"[SCHEDULE_GEN] Validated {len(validated_placements)} placements")
        return validated_placements
        
    except json.JSONDecodeError as e:
        print(f"[SCHEDULE_GEN] ERROR: JSON parsing failed: {str(e)}")
        print(f"[SCHEDULE_GEN] Raw response: {response_text[:1000]}")
        return []
    except Exception as e:
        print(f"[SCHEDULE_GEN] ERROR: Unexpected error processing response: {str(e)}")
        return []


def assemble_final_schedule(
    placements: List[Dict[str, Any]],
    task_registry: Dict[str, Task],
    sections: List[str],
    layout_preference: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Assemble the final schedule from placement instructions and original tasks.
    
    Args:
        placements: Task placement instructions
        task_registry: Original task objects
        sections: Section names
        layout_preference: User layout preferences
        
    Returns:
        Final schedule data
    """
    try:
        # Organize placements by section
        section_tasks = {section: [] for section in sections}
        placed_task_ids = set()
        
        for placement in placements:
            task_id = placement["task_id"]
            section = placement["section"]
            order = placement.get("order", 999)
            time_allocation = placement.get("time_allocation")  # New field for timeboxed tasks
            
            if task_id in task_registry and section in section_tasks:
                # Store both task and placement data (including time_allocation)
                placement_data = {"time_allocation": time_allocation} if time_allocation else {}
                section_tasks[section].append((order, (task_registry[task_id], placement_data)))
                placed_task_ids.add(task_id)
        
        # Sort tasks within each section by order
        for section in section_tasks:
            section_tasks[section].sort(key=lambda x: x[0])
        
        # Build final task list
        final_tasks = []
        
        # Handle unstructured layout (no sections)
        if not sections:
            # Add all tasks directly without section headers
            all_task_placements = []
            for placement in placements:
                task_id = placement["task_id"]
                order = placement.get("order", 999)
                time_allocation = placement.get("time_allocation")
                
                if task_id in task_registry:
                    placement_data = {"time_allocation": time_allocation} if time_allocation else {}
                    all_task_placements.append((order, task_registry[task_id], placement_data))
                    placed_task_ids.add(task_id)
            
            # Sort by order and add tasks
            all_task_placements.sort(key=lambda x: x[0])
            for order, task, placement_data in all_task_placements:
                start_time = None
                end_time = None
                if placement_data.get("time_allocation"):
                    time_allocation = placement_data["time_allocation"]
                    time_data = parse_time_allocation(time_allocation)
                    if time_data:
                        start_time = time_data.get("start_time")
                        end_time = time_data.get("end_time")
                
                task_dict = {
                    "id": task.id,
                    "text": task.text,
                    "categories": list(task.categories) if task.categories else [],
                    "is_section": False,
                    "completed": getattr(task, 'completed', False),
                    "section": None,
                    "parent_id": None,
                    "level": 0,
                    "type": "task",
                    "start_time": start_time,
                    "end_time": end_time
                }
                final_tasks.append(task_dict)
        
        # Handle structured layout (with sections)
        for section in sections:
            # Add section header
            section_task = {
                "id": str(uuid.uuid4()),
                "text": section,
                "categories": [],
                "is_section": True,
                "completed": False,
                "section": None,
                "parent_id": None,
                "level": 0,
                "type": "section"
            }
            final_tasks.append(section_task)
            
            # Add tasks in this section
            for order, (task, placement_data) in section_tasks[section]:
                
                # Parse time allocation and set start/end times if present
                start_time = None
                end_time = None
                if placement_data.get("time_allocation"):
                    time_allocation = placement_data["time_allocation"]
                    time_data = parse_time_allocation(time_allocation)
                    if time_data:
                        start_time = time_data.get("start_time")
                        end_time = time_data.get("end_time")
                        print(f"[SCHEDULE_GEN] Set time allocation for task '{task.text}': {start_time} - {end_time}")
                
                task_dict = {
                    "id": task.id,
                    "text": task.text,  # Keep original text clean
                    "categories": list(task.categories) if task.categories else [],
                    "is_section": False,
                    "completed": getattr(task, 'completed', False),
                    "section": section,
                    "parent_id": None,
                    "level": 0,
                    "type": "task",
                    "start_time": start_time,
                    "end_time": end_time
                }
                final_tasks.append(task_dict)
        
        # Add any unplaced tasks to the end
        unplaced_tasks = [
            task for task_id, task in task_registry.items() 
            if task_id not in placed_task_ids
        ]
        
        if unplaced_tasks:
            if sections:
                # For structured layouts: add to the last section at the bottom
                last_section = sections[-1]
                
                for task in unplaced_tasks:
                    task_dict = {
                        "id": task.id,
                        "text": task.text,
                        "categories": list(task.categories) if task.categories else [],
                        "is_section": False,
                        "completed": getattr(task, 'completed', False),
                        "section": last_section,
                        "parent_id": None,
                        "level": 0,
                        "type": "task",
                        "start_time": None,
                        "end_time": None
                    }
                    final_tasks.append(task_dict)
            else:
                # For unstructured layouts: add directly to final_tasks
                for task in unplaced_tasks:
                    task_dict = {
                        "id": task.id,
                        "text": task.text,
                        "categories": list(task.categories) if task.categories else [],
                        "is_section": False,
                        "completed": getattr(task, 'completed', False),
                        "section": None,
                        "parent_id": None,
                        "level": 0,
                        "type": "task",
                        "start_time": None,
                        "end_time": None
                    }
                    final_tasks.append(task_dict)
        
        return {
            "success": True,
            "tasks": final_tasks,
            "layout_type": layout_preference.get("layout", "todolist-structured"),
            "ordering_pattern": layout_preference.get("orderingPattern", "timebox")
        }
        
    except Exception as e:
        print(f"Error assembling final schedule: {str(e)}")
        return create_error_response(e, layout_preference, list(task_registry.values()))


def create_error_response(
    error: Exception, 
    layout_preference: Dict[str, Any], 
    original_tasks: List[Task]
) -> Dict[str, Any]:
    """
    Create error response with user's existing schedule and error toast flag.
    
    This simple fallback strategy returns the user's existing schedule unchanged
    with a show_error_toast flag, providing 90% faster error handling than
    complex recovery logic.
    
    Args:
        error: Exception that occurred
        layout_preference: User layout preferences
        original_tasks: Original task objects
        
    Returns:
        Error response with original schedule and show_error_toast flag
    """
    print(f"[FALLBACK] Error occurred: {str(error)}")
    print(f"[FALLBACK] Returning user's existing schedule with {len(original_tasks)} tasks")
    
    # Convert Task objects to dictionaries, preserving all existing properties
    fallback_tasks = []
    for task in original_tasks:
        task_dict = {
            "id": task.id,
            "text": task.text,
            "categories": list(task.categories) if task.categories else [],
            "completed": getattr(task, 'completed', False),
            "is_section": getattr(task, 'is_section', False),
            "section": getattr(task, 'section', None),
            "parent_id": getattr(task, 'parent_id', None),
            "level": getattr(task, 'level', 0),
            "type": getattr(task, 'type', 'task')
        }
        
        # Preserve time information if it exists
        if hasattr(task, 'start_time') and task.start_time:
            task_dict["start_time"] = task.start_time
        if hasattr(task, 'end_time') and task.end_time:
            task_dict["end_time"] = task.end_time
            
        # Preserve other task properties
        for attr in ["is_subtask", "section_index", "is_recurring", "is_microstep", 
                     "source", "slack_message_url"]:
            if hasattr(task, attr):
                task_dict[attr] = getattr(task, attr)
        
        fallback_tasks.append(task_dict)
    
    return {
        "success": False,
        "error": str(error),
        "show_error_toast": True,  # Flag for frontend to show error notification
        "fallback_used": True,     # Indicates this is a fallback response
        "tasks": fallback_tasks,   # User's existing schedule unchanged
        "layout_type": layout_preference.get("layout", "todolist-structured"),
        "ordering_pattern": layout_preference.get("orderingPattern", "untimebox")
    }


def generate_schedule(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a personalized schedule using the optimized workflow-based approach.
    
    This is the main entry point that replaces the original generate_schedule function.
    It implements the optimized pipeline that preserves task identity and minimizes
    LLM calls while maintaining the same API interface.
    
    Args:
        user_data: Dictionary containing user preferences and tasks
        
    Returns:
        Dictionary containing the generated schedule with structured data
    """
    # Start timing
    import time
    total_start_time = time.time()
    print(f"[TIMING] generate_schedule started")
    
    try:
        # Step 1: Create task registry and identify tasks needing categorization
        registry_start_time = time.time()
        input_tasks = user_data.get('tasks', [])
        task_registry, tasks_needing_categorization = create_task_registry(input_tasks)
        registry_duration = time.time() - registry_start_time
        print(f"[TIMING] Task registry creation: {registry_duration:.3f}s")
        
        if not task_registry:
            # Handle empty task list
            return {
                "success": True,
                "tasks": [],
                "layout_type": user_data.get('layout_preference', {}).get('layout', 'todolist-structured'),
                "ordering_pattern": user_data.get('layout_preference', {}).get('orderingPattern', 'timebox')
            }
        
        # Step 2: Categorize tasks that need categorization (single LLM call)
        categorization_start_time = time.time()
        categorization_success = categorize_tasks(tasks_needing_categorization, task_registry)
        categorization_duration = time.time() - categorization_start_time
        print(f"[TIMING] Task categorization (LLM call): {categorization_duration:.3f}s")
        
        if not categorization_success:
            print("Warning: Categorization failed, using default categories")
        
        # Step 2.5: Validate all tasks have valid categories
        valid_categories = {"Work", "Exercise", "Relationships", "Fun", "Ambition"}
        for task_id, task in task_registry.items():
            if not task.categories or not all(cat in valid_categories for cat in task.categories):
                print(f"[CATEGORIZATION] Warning: Task '{task.text}' has invalid categories {task.categories}, defaulting to Work")
                task.categories = ["Work"]
        
        # Step 3: Generate sections locally based on layout preferences
        sections_start_time = time.time()
        layout_preference = user_data.get('layout_preference', {})
        sections = generate_local_sections(layout_preference)
        sections_duration = time.time() - sections_start_time
        print(f"[TIMING] Local section generation: {sections_duration:.3f}s")
        
        # Step 4: Create ordering prompt and call LLM (single LLM call)
        prompt_start_time = time.time()
        print(f"[SCHEDULE_GEN] Creating ordering prompt for {len(task_registry)} tasks")
        ordering_prompt = create_ordering_prompt(task_registry, sections, user_data)
        prompt_duration = time.time() - prompt_start_time
        print(f"[TIMING] Ordering prompt creation: {prompt_duration:.3f}s")
        
        llm_start_time = time.time()
        print(f"[SCHEDULE_GEN] Calling LLM with prompt length: {len(ordering_prompt)} characters")
        ordering_response = client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=1024,
            temperature=0.3,
            messages=[{"role": "user", "content": ordering_prompt}]
        )
        llm_duration = time.time() - llm_start_time
        print(f"[TIMING] LLM ordering call: {llm_duration:.3f}s")
        
        # Step 5: Process ordering response
        processing_start_time = time.time()
        response_text = ordering_response.content[0].text
        print(f"[SCHEDULE_GEN] Received LLM response length: {len(response_text)} characters")
        print(f"[SCHEDULE_GEN] Response preview: {response_text[:200]}...")
        
        placements = process_ordering_response(response_text)
        processing_duration = time.time() - processing_start_time
        print(f"[TIMING] Response processing: {processing_duration:.3f}s")
        
        if not placements:
            print("Warning: Ordering failed, using original task order")
            # Create default placements
            placements = []
            for i, (task_id, task) in enumerate(task_registry.items()):
                section_idx = i % len(sections)
                placements.append({
                    "task_id": task_id,
                    "section": sections[section_idx],
                    "order": i + 1
                })
        
        # Step 6: Assemble final schedule
        assembly_start_time = time.time()
        result = assemble_final_schedule(placements, task_registry, sections, layout_preference)
        assembly_duration = time.time() - assembly_start_time
        print(f"[TIMING] Final schedule assembly: {assembly_duration:.3f}s")
        
        total_duration = time.time() - total_start_time
        print(f"[TIMING] Total generate_schedule: {total_duration:.3f}s")
        
        return result
        
    except Exception as e:
        total_duration = time.time() - total_start_time
        print(f"[TIMING] generate_schedule failed after: {total_duration:.3f}s")
        print(f"Error in optimized schedule generation: {str(e)}")
        # Handle case where task_registry might not be defined
        original_tasks = []
        if 'task_registry' in locals():
            original_tasks = list(task_registry.values())
        else:
            # Fallback: convert input tasks to Task objects
            for task_data in user_data.get('tasks', []):
                if isinstance(task_data, dict):
                    if not task_data.get('id'):
                        task_data['id'] = str(uuid.uuid4())
                    original_tasks.append(Task.from_dict(task_data))
                else:
                    original_tasks.append(task_data)
        
        return create_error_response(e, user_data.get('layout_preference', {}), original_tasks)