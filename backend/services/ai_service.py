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
from typing import List, Dict, Any, Tuple
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

# RAG examples for schedule generation
example_schedules = {
    "structured-day-sections-timeboxed": """
    Morning 🌞
    □ 7:00am - 7:30am: Wake up and morning routine
    □ 7:30am - 8:00am: Breakfast and check emails
    □ 8:00am - 9:30am: Work on high-priority project
    □ 9:30am - 10:00am: Team standup meeting
    □ 10:00am - 11:30am: Continue high-priority project work
    □ 11:30am - 12:00pm: Review and respond to important messages

    Afternoon 🌇
    □ 12:00pm - 1:00pm: Lunch break and short walk
    □ 1:00pm - 3:00pm: Deep work session on main tasks
    □ 3:00pm - 3:30pm: Quick break and snack
    □ 3:30pm - 5:00pm: Finish up daily tasks and plan for tomorrow

    Evening 💤
    □ 5:00pm - 6:00pm: Exercise or gym session
    □ 6:00pm - 7:00pm: Dinner and relaxation
    □ 7:00pm - 8:30pm: Personal project or hobby time
    □ 8:30pm - 9:30pm: Wind down routine
    □ 9:30pm: Bedtime
    """,

    "structured-day-sections-untimeboxed": """
    Morning 🌞
    □ Wake up and complete morning routine
    □ Enjoy breakfast while checking and responding to urgent emails
    □ Begin work on the day's highest priority task
    □ Attend team standup meeting
    □ Continue focused work on priority tasks
    □ Review and respond to important messages

    Afternoon 🌇
    □ Take a lunch break and go for a short walk
    □ Engage in a deep work session for main project tasks
    □ Take a quick break and have a healthy snack
    □ Wrap up daily tasks and plan for the next day

    Evening 💤
    □ Exercise or attend a gym session
    □ Prepare and enjoy dinner
    □ Spend time on a personal project or hobby
    □ Complete evening wind-down routine
    □ Go to bed at a consistent time
    """,

    "structured-priority-timeboxed": """
    High Priority
    □ 8:00am - 10:00am: Finish presentation for tomorrow's meeting
    □ 10:00am - 10:30am: Schedule dentist appointment
    □ 10:30am - 11:00am: Pay utility bills
    □ 2:00pm - 4:00pm: Complete high-priority project deliverables

    Medium Priority
    □ 11:00am - 11:30am: Start learning Spanish (Duolingo, 15 minutes)
    □ 12:30pm - 1:00pm: Plan weekend hiking trip
    □ 4:00pm - 4:30pm: Research new recipes for meal prep
    □ 6:00pm - 7:00pm: Work on personal development goals

    Low Priority
    □ 1:00pm - 1:30pm: Organize digital photos
    □ 5:00pm - 5:30pm: Clean out email inbox
    □ 7:00pm - 7:30pm: Look into new productivity apps
    """,

    "structured-priority-untimeboxed": """
    High Priority
    □ Finish presentation for tomorrow's meeting
    □ Schedule dentist appointment
    □ Pay utility bills
    □ Complete high-priority project deliverables

    Medium Priority
    □ Start learning Spanish (Duolingo, 15 minutes)
    □ Plan weekend hiking trip
    □ Research new recipes for meal prep
    □ Work on personal development goals

    Low Priority
    □ Organize digital photos
    □ Clean out email inbox
    □ Look into new productivity apps
    """,

    "structured-category-timeboxed": """
    Work 💼
    □ 9:00am - 9:30am: Prepare for team meeting
    □ 9:30am - 10:30am: Attend team meeting
    □ 10:30am - 11:30am: Review and respond to important emails
    □ 2:00pm - 4:00pm: Work on quarterly report

    Health & Fitness 🏋️‍♀️
    □ 7:00am - 7:30am: 30-minute jog
    □ 12:00pm - 12:30pm: Prepare healthy lunch
    □ Throughout the day: Drink 8 glasses of water

    Relationships ❤️
    □ 5:00pm - 5:30pm: Plan date night with partner
    □ 7:00pm - 7:30pm: Call best friend
    □ 8:00pm - 9:00pm: Organize game night with friends

    Fun 🎉
    □ 12:30pm - 1:00pm: Play a quick game or solve a puzzle
    □ 6:00pm - 6:30pm: Watch an episode of favorite TV show
    □ 9:00pm - 9:30pm: Engage in a hobby (painting, gardening, etc.)

    Ambition 🚀
    □ 6:30am - 7:00am: Read 20 pages of a book on personal development
    □ 5:30pm - 6:00pm: Work on side project or business idea
    □ 9:30pm - 10:00pm: Reflect on goals and plan next steps
    """,

    "structured-category-untimeboxed": """
    Work 💼
    □ Prepare for team meeting
    □ Attend team meeting
    □ Review and respond to important emails
    □ Work on quarterly report

    Health 🏋️‍♀️
    □ 30-minute jog
    □ Prepare healthy lunch
    □ Drink 8 glasses of water throughout the day

    Relationships ❤️
    □ Plan date night with partner
    □ Call best friend
    □ Organize game night with friends

    Fun 🎉
    □ Play a quick game or solve a puzzle
    □ Watch an episode of favorite TV show
    □ Engage in a hobby (painting, gardening, etc.)

    Ambition 🚀
    □ Read pages from a book on personal development
    □ Work on side project or business idea
    □ Reflect on goals and plan next steps
    """,

    "unstructured-timeboxed": """
    □ 6:30am - 7:00am: Morning meditation and stretching
    □ 7:00am - 7:30am: Breakfast and coffee
    □ 7:30am - 9:00am: Deep work on main project
    □ 9:00am - 9:15am: Quick break
    □ 9:15am - 10:30am: Respond to emails and messages
    □ 10:30am - 12:00pm: Team meeting and collaboration
    □ 12:00pm - 1:00pm: Lunch and short walk
    □ 1:00pm - 3:00pm: Continue work on main project
    □ 3:00pm - 3:30pm: Afternoon snack and break
    □ 3:30pm - 5:00pm: Wrap up daily tasks and plan for tomorrow
    □ 5:00pm - 6:00pm: Exercise or gym session
    □ 6:00pm - 7:00pm: Dinner preparation and eating
    □ 7:00pm - 8:30pm: Personal hobby or project time
    □ 8:30pm - 9:30pm: Reading or learning time
    □ 9:30pm - 10:00pm: Evening routine and prepare for bed
    """,

    "unstructured-untimeboxed": """
    □ Morning meditation and stretching
    □ Enjoy breakfast and coffee
    □ Deep work session on main project
    □ Respond to important emails and messages
    □ Attend team meeting and collaborate on projects
    □ Lunch break and short walk
    □ Continue work on main project
    □ Take short breaks as needed
    □ Wrap up daily tasks and plan for tomorrow
    □ Exercise or gym session
    □ Prepare and eat dinner
    □ Spend time on personal hobby or project
    □ Read or engage in learning activity
    □ Complete evening routine and prepare for bed
    """
}

def create_prompt_schedule(user_data: Dict[str, Any]) -> Tuple[str, str]:
    """
    Creates a prompt for schedule generation based on user data.
    
    Args:
        user_data: Dictionary containing user preferences and tasks
        
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Extract user data
    name = user_data['name']
    age = user_data['age']
    work_schedule = f"{user_data['work_start_time']} - {user_data['work_end_time']}"
    energy_patterns = ', '.join(user_data['energy_patterns'])
    priorities = user_data['priorities']
    layout_preference = user_data['layout_preference']

    # Process tasks
    tasks = user_data['tasks']
    categorized_tasks = {
        'Work': [], 'Exercise': [], 'Relationship': [],
        'Fun': [], 'Ambition': []
    }
    for task in tasks:
        for category in task.categories:
            if category in categorized_tasks:
                categorized_tasks[category].append(task.text)

    # Convert priorities to a sorted list of tuples (category, rank)
    priority_list = sorted(priorities.items(), key=lambda x: x[1], reverse=True)
    priority_description = ", ".join([f"{category} (rank {rank})" for category, rank in priority_list])

    # Determine the example schedule to use
    structure = layout_preference['structure']
    timeboxed = layout_preference['timeboxed']
    # Construct the example_key based on user preferences
    if structure == "structured":
        subcategory = layout_preference['subcategory']
        print(structure, subcategory, timeboxed)
        example_key = f"structured-{subcategory}-{timeboxed}"
    else:  # unstructured
        example_key = f"unstructured-{timeboxed}"

    example_schedule = example_schedules.get(example_key, "No matching example found.")
    print(example_schedule)
    system_prompt = """You are an expert psychologist and occupational therapist specializing in personalized daily planning and work-life balance optimization. Your role is to create a tailored schedule for your client's day that maximizes productivity, well-being, and personal growth."""

    user_prompt = f"""
    Here is the client's information:

    <client_info>
    <client_name>{name}</client_name>
    <client_age>{age}</client_age>
    <work_schedule>{work_schedule}</work_schedule>
    <energy_patterns>{energy_patterns}</energy_patterns>
    <priority_description>{priority_description}</priority_description>
    <schedule_structure>{structure}</schedule_structure>
    <schedule_timeboxed>{timeboxed}</schedule_timeboxed>
    <layout_subcategory>{layout_preference['subcategory']}</layout_subcategory>
    </client_info>

    Here are the client's tasks categorized:

    <tasks>
    <work_tasks>{', '.join(categorized_tasks['Work'])}</work_tasks>
    <exercise_tasks>{',_'.join(categorized_tasks['Exercise'])}</exercise_tasks>
    <relationship_tasks>{',_'.join(categorized_tasks['Relationship'])}</relationship_tasks>
    <fun_tasks>{',_'.join(categorized_tasks['Fun'])}</fun_tasks>
    <ambition_tasks>{',_'.join(categorized_tasks['Ambition'])}</ambition_tasks>
    </tasks>

    Instructions for creating the personalized schedule:

    1. Analyze the client's information carefully.
    2. Create a balanced schedule that adheres to the following guidelines:
    a. Schedule work tasks strictly within the specified work schedule, considering the client's energy patterns.
    b. Outside work hours, focus on personal tasks (exercise, relationship, fun, or ambition) based on the client's priority rankings and energy patterns.
    c. For tasks with multiple categories, prioritize according to the client's priority description.
    3. Format the schedule as follows:
    a. If the schedule preference is timeboxed, include specific times for each task.
    b. If the schedule preference is untimeboxed, list tasks in the order they should be performed without specific times.
    c. Apply the correct schedule layout by referring to this example of the desired output format: {example_schedule}
    4. Ensure the language of the schedule is:
    a. Clear, concise, and conversational.
    b. Free of jargon and unnecessary complexity.
    c. Without explanations or notes sections.
    d. Without category labels for each task.

    5. Important: Ensure each task is listed separately. Do not combine multiple tasks into a single entry.
    6. Only include tasks that the client has provided. Do not add any new tasks.

    Please structure your response as follows:

    <schedule_planning>
    1. List all tasks from each category
    2. Analyze energy patterns and work schedule to determine optimal task placement
    3. Consider priority rankings when scheduling personal tasks
    4. Check if the schedule adheres to the timeboxed/untimeboxed and user's layout subcatgory preference
    5. Create the final schedule based on the above analysis
    </schedule_planning>

    <schedule>
    [The final personalized schedule]
    </schedule>

    Remember to adhere to all guidelines and requirements outlined above when creating the schedule.
    """

    return system_prompt, user_prompt

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

def generate_schedule(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a personalized schedule based on user data.
    
    Args:
        user_data: Dictionary containing user preferences and tasks
        
    Returns:
        Dictionary containing the generated schedule
    """
    try:
        # Convert Task objects to dictionaries if needed
        if 'tasks' in user_data:
            tasks = user_data['tasks']
            if tasks and isinstance(tasks[0], Task):
                # Already Task objects, no conversion needed
                pass
            elif tasks and isinstance(tasks[0], dict):
                # Convert dictionaries to Task objects
                user_data['tasks'] = [Task.from_dict(task) for task in tasks]
        
        # Create prompts for Claude
        system_prompt, user_prompt = create_prompt_schedule(user_data)
        
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0.7,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        
        # Extract schedule from response
        schedule_text = response.content[0].text

        # Extract only the content between <schedule> tags
        schedule_match = re.search(r'<schedule>([\s\S]*?)<\/schedule>', schedule_text)
        if schedule_match:
            schedule_content = schedule_match.group(1).strip()
            # Return the schedule with tags to ensure frontend can parse it correctly
            return {"schedule": f"<schedule>{schedule_content}</schedule>"}
        else:
            print("No <schedule> tags found in AI response")
            # Fallback to returning the full text if no schedule tags are found
            return {"schedule": schedule_text}
        
        # Return the schedule
        return {"schedule": schedule_text}
        
    except Exception as e:
        print(f"Error generating schedule: {str(e)}")
        raise

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