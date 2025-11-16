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
# Add cache for storing successful decomposition patterns
decomposition_patterns_cache = {}

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
    Creates a concise prompt for decomposing a task into microsteps.

    Args:
        task: The task to decompose
        user_data: User preferences and context
        categories: Task categories

    Returns:
        Formatted prompt string
    """
    # Extract relevant user context
    energy_patterns = ', '.join(user_data.get('energy_patterns', [])) or 'none specified'
    priorities = ', '.join(f"{k}: {v}" for k, v in user_data.get('priorities', {}).items()) or 'none specified'

    prompt = f"""Break down this task into 2-5 concrete, actionable microsteps.

Task: {task}
Categories: {', '.join(str(c) for c in categories)}
User's energy patterns: {energy_patterns}
User's priorities: {priorities}

Create microsteps that are:
- Too small to fail (minimal willpower needed)
- Immediately actionable
- Specific and unambiguous
- Aligned with the user's energy patterns and priorities

Respond ONLY with valid JSON in this exact format:
{{
    "microsteps": [
        {{
            "text": "First specific action to take",
            "estimated_time": "5-10",
            "energy_level_required": "low"
        }}
    ]
}}"""

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
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            temperature=0.3,
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
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,  # Increased from 1024 to prevent truncated JSON responses
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
        print("=== Raw AI Response ===")
        print(response_text)
        print("======================")

        # Try to extract JSON from response - look for complete JSON objects
        # First, try to find JSON between ``` markers (common in Claude responses)
        json_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', response_text)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Fallback to finding any JSON object
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if not json_match:
                print("No JSON found in response")
                return []
            json_str = json_match.group(0)

        # Validate JSON is complete by checking balanced braces
        if json_str.count('{') != json_str.count('}'):
            print(f"Incomplete JSON detected: {json_str.count('{')} opening braces, {json_str.count('}')} closing braces")
            # Try to find the last complete microstep array
            microsteps_match = re.search(r'"microsteps"\s*:\s*\[([\s\S]*)\]', json_str)
            if microsteps_match:
                # Try to reconstruct valid JSON
                json_str = '{"microsteps": [' + microsteps_match.group(1) + ']}'
            else:
                print("Cannot reconstruct valid JSON")
                return []

        print("=== Extracted JSON ===")
        print(json_str)
        print("=====================")

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
                'estimated_time': step.get('estimated_time', '5-10'),
                'energy_level_required': step.get('energy_level_required', 'medium')
            }
            processed_steps.append(processed_step)

        print(f"Processed {len(processed_steps)} microsteps")  # Debug print
        return processed_steps

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response: {e}")
        print(f"Problematic JSON string: {json_str if 'json_str' in locals() else 'N/A'}")
        return []
    except Exception as e:
        print(f"Error processing decomposition response: {e}")
        import traceback
        traceback.print_exc()
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

