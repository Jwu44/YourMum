"""
AI Service Module - Local implementation of AI functionality previously in Colab

This module provides direct access to AI services for:
- Schedule generation
- Task categorization
- Task decomposition
- Schedule suggestions
"""

import os
import re
import json
import anthropic
from typing import List, Dict, Any, Tuple, Optional
from cachetools import TTLCache, LRUCache
from backend.models.task import Task
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the Anthropic client
anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=anthropic_api_key)

# Add cache for decomposition results (TTL of 24 hours, max 1000 entries)
decomposition_cache = TTLCache(maxsize=1000, ttl=86400)
# Add LRU cache for frequent tasks (max 100 entries)
frequent_tasks_cache = LRUCache(maxsize=100)
# Add cache for storing successful decomposition patterns
decomposition_patterns_cache = {}

def create_prompt_schedule(work_schedule, energy_patterns, priority_description, 
                          categorized_tasks, example_schedule):
    """Create a concise prompt for schedule generation using Claude best practices."""
    
    # Format tasks with categories inline for clarity
    task_list = []
    for category, tasks in categorized_tasks.items():
        for task in tasks:
            task_list.append(f"- {task} [{category}]")
    
    prompt = f"""Create an optimized daily schedule using these inputs:

        Work hours: {work_schedule}
        Energy: {energy_patterns}  
        Priorities: {priority_description}

        Tasks to schedule:
        {chr(10).join(task_list)}

        Create a schedule exactly like this example:
        {example_schedule}

        Rules: Only use work hours for [Work] tasks. Schedule other tasks by priority and energy. Keep tasks separate.

        <schedule>
        """
    
    return prompt

def create_prompt_categorize(task: str) -> str:
    """
    Creates a prompt for task categorization.
    
    Args:
        task: The task text to categorize
        
    Returns:
        Formatted prompt string
    """
    prompt = f"""Given the following 5 categories to an ordinary life:
    1. Exercise - such as walking, running, swimming, gym, bouldering etc...
    2. Relationships - activities with friends, family, colleagues, etc...
    3. Fun - personal hobbies such as painting, croteching, baking, gaming, etc.., or miscallenous activities like shopping or packing etc...
    4. Ambition - short term or long term goals someone wants to achieve
    5. Work - such as going through emails, attending meetings etc... and do not fall in the same category as exercise, relationships, fun or ambitions.

    Categorize the following task: {task}.

    Respond only with the category name.
    The task may belong to multiple categories. Ensure if a task has been categorised as 'Work', then there should be no other category. Respond with a comma-separated list of category names, or 'Work' if no categories apply.
    """

    return prompt

def create_prompt_decompose(task: str, user_data: Dict[str, Any], categories: List[str]) -> str:
    """
    Creates a prompt for decomposing a task into microsteps.

    Args:
        task: The task to decompose
        user_data: User preferences and context
        categories: Task categories

    Returns:
        Formatted prompt string
    """
    # Extract relevant user context
    energy_patterns = ', '.join(user_data.get('energy_patterns', []))
    priorities = ', '.join(f"{k}: {v}" for k, v in user_data.get('priorities', {}).items())

    prompt = f"""You are an expert in behavior change and productivity optimization, tasked with helping users break down their goals into achievable microsteps. Your role is to analyze the given task and user context, then create a set of practical, science-backed microsteps that will lead to successful habit formation and task completion.

    First, review the following information:

    Task to be broken down:
    <task>
    {task}
    </task>

    User's energy patterns:
    <energy_patterns>
    {energy_patterns}
    </energy_patterns>

    User's life priorities:
    <priorities>
    {priorities}
    </priorities>

    Categories related to the task:
    <categories>
    {', '.join(str(c) for c in categories)}
    </categories>

    Now, let's define what makes an effective microstep:

    1. Too small to fail: The action should be so minor that it requires minimal willpower to complete.
    2. Immediately actionable: It can be done right away without extensive preparation.
    3. Highly specific: The step should be clear and unambiguous.
    4. Linked to existing habits or timeframes: It should fit naturally into the user's current routine.
    5. Supportive of the larger task: Each microstep should contribute to the overall goal.

    Your task is to break down the given task into 2-5 concrete microsteps that adhere to these principles. Consider the following guidelines:

    1. Ensure each microstep is specific and actionable.
    2. Design microsteps that can be completed in a single session.
    3. Create microsteps that build upon each other logically.
    4. Take into account the user's energy patterns and priorities when designing and ordering the microsteps.
    5. Make each microstep small enough to require minimal willpower but meaningful enough to create progress.

    Before providing your final output, wrap your thought process in <task_breakdown> tags:

    <task_breakdown>
    1. Analyze the main task and its components.
    2. List the key elements of the task that need to be addressed.
    3. Consider how the task aligns with the user's energy patterns and priorities.
    4. Identify potential obstacles and how they could be addressed in the microsteps.
    5. Brainstorm potential microsteps that meet the criteria for effectiveness.
    6. For each potential microstep, evaluate its alignment with the effectiveness criteria (too small to fail, immediately actionable, highly specific, linked to existing habits, supportive of the larger task).
    7. Determine the logical order of the microsteps based on dependencies and the user's context.
    8. Estimate the time required and energy level needed for each microstep.
    9. Refine the microsteps to ensure they build upon each other and lead to the overall goal.
    </task_breakdown>

    After completing your analysis, provide your response in the following JSON format:

    {{
        "microsteps": [
            {{
                "text": "Brief description of the microstep",
                "rationale": "Explanation of why this step is important and how it relates to the overall task",
                "estimated_time": "Time in minutes",
                "energy_level_required": "low/medium/high"
            }}
        ]
    }}

    Remember to focus on making each microstep concrete, achievable, and aligned with the user's context. By starting small and building momentum through these microsteps, we can help the user make meaningful progress towards their larger goal.
    """

    return prompt

def create_prompt_suggestions(user_data: Dict[str, Any]) -> str:
    """
    Creates a prompt for Claude to analyze schedule patterns and generate suggestions.

    Args:
        user_data: Dictionary containing user schedule data and preferences

    Returns:
        Formatted prompt string
    """
    prompt = f"""As an expert psychologist and productivity consultant, analyze this user's schedule patterns and generate optimized schedule suggestions based on the following information:

    User Context:
    <preferences>
    Energy Patterns: {', '.join(user_data['energy_patterns'])}
    Priorities: {json.dumps(user_data['priorities'], indent=2)}
    Work Hours: {user_data.get('work_start_time', 'Not specified')} - {user_data.get('work_end_time', 'Not specified')}
    </preferences>

    Historical Schedule Data (Last 14 Days):
    <historical_schedules>
    {json.dumps(user_data['historical_schedules'], indent=2)}
    </historical_schedules>

    Current Schedule:
    <current_schedule>
    {json.dumps(user_data['current_schedule'], indent=2)}
    </current_schedule>

    Your task is to:
    1. Analyze schedule patterns and user behavior, considering:
    - Task completion patterns and success rates
    - Energy level alignment with task timing
    - Priority alignment with schedule structure
    - Task dependencies and sequences
    - Procrastination patterns
    - Time management effectiveness

    2. Generate up to 5 high-confidence suggestions that could improve the user's schedule.
    Each suggestion should:
    - Be specific and actionable
    - Consider psychological principles of motivation and habit formation
    - Account for the user's energy patterns and priorities
    - Build on successful patterns from historical data
    - Address identified challenges or optimization opportunities

    Return the suggestions in this JSON format:
    {{
        "suggestions": [
            {{
                "text": str,            # The suggestion text
                "type": str,            # One of: "Energy Optimization", "Procrastination Prevention", "Priority Rebalancing", "Task Structure", "Time Management"
                "rationale": str,       # Psychology-based explanation for the suggestion
                "confidence": float,    # Confidence score between 0-1
                "categories": [str]     # Relevant task categories
            }}
        ]
    }}

    Focus on highest-impact suggestions that have strong supporting evidence from the user's data. Each suggestion should be grounded in behavioral science and pattern analysis."""

    return prompt

def categorize_task(task_text: str) -> List[str]:
    """
    Categorize a task using Claude.
    
    Args:
        task_text: The task text to categorize
        
    Returns:
        List of category names
    """
    try:
        # Create prompt for Claude
        prompt = create_prompt_categorize(task_text)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=100,
            temperature=0.2,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract categories from response
        categories = response.content[0].text.strip().split(', ')
        
        # Ensure the categories are valid
        valid_categories = ["Work", "Exercise", "Relationships", "Fun", "Ambition", "Uncategorized"]
        categories = [cat for cat in categories if cat in valid_categories]
        
        if not categories:
            categories = ["Work"]
            
        return categories
        
    except Exception as e:
        print(f"Error categorizing task: {str(e)}")
        # Default to Work category if there's an error
        return ["Work"]

def decompose_task(task_data: Dict[str, Any], user_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Decompose a task into microsteps.
    
    Args:
        task_data: Dictionary containing task information
        user_data: Dictionary containing user context and preferences
        
    Returns:
        List of microsteps
    """
    try:
        # Extract task text and categories
        task_text = str(task_data.get('text', ''))
        categories = task_data.get('categories', [])
        
        # Create cache key
        cache_key = f"{task_text}_{json.dumps(categories)}"
        
        # Check cache first
        if cache_key in decomposition_cache:
            print(f"Cache hit for task: {task_text}")
            return decomposition_cache[cache_key]
        
        # Create prompt for Claude
        prompt = create_prompt_decompose(task_text, user_data, categories)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Process response
        microsteps = process_decomposition_response(response.content[0].text)
        
        # Cache the result
        decomposition_cache[cache_key] = microsteps
        
        return microsteps
        
    except Exception as e:
        print(f"Error decomposing task: {str(e)}")
        return []

def process_decomposition_response(response_text: str) -> List[Dict[str, Any]]:
    """
    Processes the AI response and extracts valid microsteps.

    Args:
        response_text: Raw response from the AI

    Returns:
        List of processed microsteps
    """
    try:
        print(response_text)
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            print("No JSON found in response")
            return []

        json_str = json_match.group(0)
        response_data = json.loads(json_str)

        # Extract microsteps from the parsed JSON
        microsteps = response_data.get('microsteps', [])

        # Validate and clean microsteps
        processed_steps = []
        for step in microsteps:
            if not isinstance(step, dict) or 'text' not in step:
                continue

            # Clean and validate the step text
            step_text = step['text'].strip()
            if not step_text or len(step_text) > 200:  # Basic validation
                continue

            processed_step = {
                'text': step_text,
                'rationale': step.get('rationale', ''),
                'estimated_time': step.get('estimated_time', '5-10'),
                'energy_level_required': step.get('energy_level_required', 'medium')
            }
            processed_steps.append(processed_step)

        print(f"Processed {len(processed_steps)} microsteps")  # Debug print
        return processed_steps

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response: {e}")
        return []
    except Exception as e:
        print(f"Error processing decomposition response: {e}")
        return []

def update_decomposition_patterns(
    task: str,
    categories: List[str],
    successful_steps: List[str]
) -> None:
    """
    Updates the cache of successful decomposition patterns.

    Args:
        task: Original task text
        categories: Task categories
        successful_steps: List of accepted microsteps
    """
    try:
        key = (task.lower(), tuple(sorted(categories)))
        if key not in decomposition_patterns_cache:
            decomposition_patterns_cache[key] = {
                'count': 0,
                'successful_patterns': []
            }

        pattern_data = decomposition_patterns_cache[key]
        pattern_data['count'] += 1
        pattern_data['successful_patterns'].append(successful_steps)

        # Limit cache size
        if len(decomposition_patterns_cache) > 1000:
            # Remove least used patterns
            sorted_patterns = sorted(
                decomposition_patterns_cache.items(),
                key=lambda x: x[1]['count']
            )
            decomposition_patterns_cache = dict(sorted_patterns[-1000:])

    except Exception as e:
        print(f"Error updating decomposition patterns: {str(e)}")

def generate_schedule_suggestions(
    user_id: str,
    current_schedule: List[Dict],
    historical_schedules: List[List[Dict]],
    priorities: Dict[str, str],
    energy_patterns: List[str],
    work_start_time: str = None,
    work_end_time: str = None
) -> List[Dict]:
    """
    Generate schedule suggestions based on user data and history.
    
    Args:
        user_id: User identifier
        current_schedule: Current day's schedule
        historical_schedules: Previous schedules (up to 14 days)
        priorities: User's priority rankings
        energy_patterns: User's energy pattern preferences
        work_start_time: Optional work start time
        work_end_time: Optional work end time
        
    Returns:
        List of suggestions
    """
    try:
        # Prepare user data for prompt
        user_data = {
            "user_id": user_id,
            "current_schedule": current_schedule,
            "historical_schedules": historical_schedules,
            "priorities": priorities,
            "energy_patterns": energy_patterns,
            "work_start_time": work_start_time,
            "work_end_time": work_end_time
        }
        
        # Create prompt for Claude
        prompt = create_prompt_suggestions(user_data)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
               # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response.content[0].text)
        if not json_match:
            print("No JSON found in response")
            return []

        json_str = json_match.group(0)
        suggestions_data = json.loads(json_str)

        if not isinstance(suggestions_data, dict) or 'suggestions' not in suggestions_data:
            print("Invalid suggestion data structure")
            return []

        suggestions = suggestions_data['suggestions']

        # Basic validation of suggestions
        validated_suggestions = []
        for suggestion in suggestions:
            if not all(k in suggestion for k in [
                'text', 'type', 'rationale', 'confidence', 'categories'
            ]):
                continue

            # Ensure confidence is a float between 0 and 1
            try:
                suggestion['confidence'] = float(suggestion['confidence'])
                if not 0 <= suggestion['confidence'] <= 1:
                    suggestion['confidence'] = max(0.0, min(1.0, suggestion['confidence']))
            except (ValueError, TypeError):
                suggestion['confidence'] = 0.5  # Default if invalid

            validated_suggestions.append(suggestion)

        return validated_suggestions
        
    except json.JSONDecodeError as e:
        print(f"Error decoding suggestion response: {str(e)}")
        return []
    except Exception as e:
        print(f"Error generating schedule suggestions: {str(e)}")
        return []