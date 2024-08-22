import os
import requests
import threading
from flask import Flask, request, jsonify
import anthropic
import logging
import re
import uuid

class Task:
    def __init__(self, id, text, categories=None):
        self.id = id
        self.text = text
        self.categories = set(categories) if categories else set()

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "categories": list(self.categories)
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            text=data["text"],
            categories=data.get("categories", [])
        )

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Setup app
app = Flask(__name__)

# Update any base URLs to use the public ngrok URL
app.config["BASE_URL"] = public_url

# Initialize the Anthropic client
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# rag examples
example_schedules = {
    "structured-timeboxed": """
        Morning 🌞
        □ 8:45am - 9:15am Wake Up + Morning Routine
        □ 9:15am - 9:30am After my Morning Routine, I will continue reading my book for 15 minutes at my desk
        □ 9:30am - 10:00am Come up with RT playlist
        □ 10:00am - 10:15am Learn RT routes back and forth
        □ 10:15am - 10:30am Learn RT drinking games
        □ 10:30am - 12:00pm Clean up home page

        Arvo 🌇
        □ 12:00 - 12:45pm Lunch
        □ 12:45pm - 1:30pm Plan for next day
        □ 1:30pm - 4:00pm Clean up Moodle Case Study
        □ 4:00pm - 5:30pm Gym push
        □ 5:30pm - 6:00pm Collate assets for Tribespot

        Evening 💤
        □ 6:00pm - 6:45pm Dinners
        □ 8:00pm - 9:00pm CMs Meeting
        □ 9:00pm sleep
        """,
    "structured-untimeboxed": """
        Morning 🌅
        □ Wake Up > Routine
        □ Hugging Face || Podcast || Morning Read
        □ Go through calendar, emails and Slack messages
            □ Review previous day
            □ Meeting prep
        □ This Sprint - increasing SM preview + shortlist % [L
            □ Let Appy + Callum know of the banner being shown for draft job
            □ Create microslices
        □ Previous Sprint - Hypothesis 1 [L]
            □ Testing
            □ Release - gpt this template
        □ Refine GPT prompt document [N]
        □ GetAhead comp analysis [N

        Arvo 🌇
        □ Lunch
        □ Gym
        □ Walk

        Evening 💤
        □ Dinner
        □ Night time reading
        """,
    "unstructured-timeboxed": """
        □ 8:45am - 9:15am Wake Up + Morning Routine
        □ 9:15am - 9:30am After my Morning Routine, I will continue reading my book for 15 minutes at my desk
        □ 9:30am - 10:00am Come up with RT playlist
        □ 10:00am - 10:15am Learn RT routes back and forth
        □ 10:15am - 10:30am Learn RT drinking games
        □ 10:30am - 12:00pm Clean up home page
        □ 12:00pm - 12:45pm Lunch
        □ 12:45pm - 1:30pm Plan for next day
        □ 1:30pm - 4:00pm Clean up Moodle Case Study
        □ 4:00pm - 5:30pm Gym push
        □ 5:30pm - 6:00pm Collate assets for Tribespot
        □ 6:00pm - 6:45pm Dinners
        □ 8:00pm - 9:00pm CMs Meeting
        □ 9:00pm sleep
        """,
    "unstructured-untimeboxed": """
      🚶 Walk x2 [Highiest] [In progress]
      💤 10:30 sleep, 7:30 wakeup [Highiest] [In progress]
      👥 Chat with the Fam [High] [In progress]
      ✏️ Submit as many APM apps as possible [High] [Not started]
      👨‍💻 Work on dev proj [High] [In progress]
      💬 Debate about learnings [High] [In progress]
      📓 Use journal to reflect on profound moments [High] [Not started]
      🏋️ Gym x3 [Medium] [In progress]
      🍔 Limit junk food [Medium] [In progress]
      📄 Update resume with latest dev proj [Medium] [Not started]
      🎤 Learnings [Medium] [In progress]
      🤔 Share vulnerability/ambitions [Low] [In progress]
      🧗 Boulder x2 [Low] [Not started]
      🚫 Limit socials < 1hr/day [Low] [Not started]
      💰 Scraping by [Lowest] [In progress]
      🏃 Run x1+ [Lowest] [Blocked]
      """
}

def create_prompt_schedule(user_data):
    try:
        # Extract user data
        name = user_data['name']
        age = user_data['age']
        work_schedule = f"{user_data['work_start_time']} - {user_data['work_end_time']}"
        energy_levels = ', '.join([f"{entry['x']:02d}:00, energy level = {entry['y']}% " for entry in user_data['energy_levels']])
        priorities = user_data['priorities']
        layout_preference = user_data['layout_preference']['type']
        layout_subcategory = user_data['layout_preference']['subcategory']

        # Process tasks
        tasks = user_data['tasks']
        work_tasks = [task.text for task in tasks if 'Work' in task.categories]
        exercise_tasks = [task.text for task in tasks if 'Exercise' in task.categories]
        relationship_tasks = [task.text for task in tasks if 'Relationship' in task.categories]
        fun_tasks = [task.text for task in tasks if 'Fun' in task.categories]
        ambition_tasks = [task.text for task in tasks if 'Ambition' in task.categories]

        # Convert priorities to a sorted list of tuples (category, rank)
        priority_list = sorted(priorities.items(), key=lambda x: x[1], reverse=True)
        priority_description = ", ".join([f"{category} (rank {5-rank})" for category, rank in priority_list])

        system_prompt = """You are an expert psychologist and occupational therapist specializing in personalized daily planning and work-life balance optimization. Your role is to create tailored schedules that maximize productivity, well-being, and personal growth for your clients."""

        user_prompt = f"""
            <context>
            I need you to create a personalized daily schedule for my client. The schedule should balance work responsibilities with personal priorities, taking into account energy levels throughout the day. The final output will be used by the client to structure their day effectively.
            </context>

            <client_info>
            Name: {name}
            Age: {age}
            Work schedule: {work_schedule}
            Tasks:
            - Work tasks: {', '.join(work_tasks)}
            - Exercise tasks: {', '.join(exercise_tasks)}
            - Relationship tasks: {', '.join(relationship_tasks)}
            - Fun tasks: {', '.join(fun_tasks)}
            - Ambition tasks: {', '.join(ambition_tasks)}
            Energy levels throughout the day: {energy_levels}, where 'x' represents the hour of day in 24 hour format and 'y' represents how active the user is with 0% meaning {name} is asleep while 100% meaning {name} is feeling their absolute best.
            Priorities outside {work_schedule} (ranked from 4 - highest to 1 - lowest): {priority_description}
            </client_info>

            <instructions>
            1. Analyze the client's information and create a personalized, balanced schedule.
            2. To identify and priortise tasks, follow these guidelines:
            a. Schedule work tasks strictly within {work_schedule} ensuring the most challenging work tasks are done when {name}'s energy levels are above 70% during {work_schedule}.
            b. Outside work hours {work_schedule}, focus on personal tasks which are classified as either exercise, relationship, fun, or ambition based on how {name} has ranked their priorities and what {name}'s energy levels are outside {work_schedule}.
            3. To format the schedule, follow these guidelines:
            a. Display the planner in a {layout_subcategory} {layout_preference} format.
            b. Use {example_schedules[layout_subcategory]} as an example of the expected layout ensuring each task in this generated schedule belongs to {name}.
            c. Double check the format given the following definitions for each subcategory: Time-boxed means the user would like to see each task with a starting and end time. Un-time-boxed means there should be no start or end time with any tasks. Structured means the user would like to see 'Morning, 'Afternoon' and 'Evening sections in their schedule. Unstructured means there should be no 'Morning, 'Afternoon' and 'Evening sections in the schedule.
            4. Edit the language of the schedule by following these guidelines:
            a. Write in a clear, concise, and conversational tone. Avoid jargon and unnecessary complexity.
            b. Do not include explanations or notes sections.
            c. Do not show categories for each task.
            </instructions>

            <output_format>
            Please structure your response as follows:
            <thinking>
            [Your step-by-step thought process for creating the schedule]
            </thinking>

            <schedule>
            [The final personalized schedule]
            </schedule>
            </output_format>
        """

        return system_prompt, user_prompt

    except KeyError as e:
        logger.error(f"Missing key in user data: {str(e)}")
        raise ValueError(f"Missing required field in user data: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating prompt: {str(e)}")
        raise

def create_prompt_categorize(task):
    prompt = f"""Given the following 5 categories to an ordinary life:
    1. Exercise - such as walking, running, swimming, gym, bouldering etc...
    2. Relationship - how you spend time with friends and family
    3. Fun - personal hobbies such as painting, croteching, baking, gaming, etc.., or miscallenous activities like shopping or packing etc...
    4. Ambition - short term or long term goals someone wants to achieve
    5. Work - such as going through emails, attending meetings etc... and do not fall in the same category as exercise, relationships, fun or ambitions.

    Categorize the following task: {task}.

    Respond only with the category name.
    """

    return prompt

def generate_schedule(system_prompt, user_prompt):
    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            temperature=0.7,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        return response.content[0].text
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        raise

def categorize_task(prompt):
    response = client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=100,
        temperature=0.2,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    category = response.content[0].text.strip()

    # Ensure the category is one of the predefined options
    valid_categories = ["Work", "Exercise", "Relationship", "Fun", "Ambition"]
    if category not in valid_categories:
        category = "Work"  # Default to Work if the API returns an unexpected category

    return category

@app.route('/process_user_data', methods=['POST'])
def process_user_data():
    user_data = request.json

    # Convert task dictionaries to Task objects
    if 'tasks' in user_data:
        user_data['tasks'] = [Task.from_dict(task) if isinstance(task, dict) else task for task in user_data['tasks']]

    system_prompt, user_prompt = create_prompt_schedule(user_data)
    response = generate_schedule(system_prompt, user_prompt)

    return jsonify({'schedule': response})

@app.route('/categorize_task', methods=['POST'])
def process_task():
    task = request.json.get('task')
    prompt = create_prompt_categorize(task)
    response = categorize_task(prompt)
    return jsonify({"category": response})

@app.route('/identify_recurring_tasks', methods=['POST'])
def identify_recurring_tasks():
    data = request.json
    current_schedule = data.get('current_schedule', [])
    previous_schedules = data.get('previous_schedules', [])

    # Convert Task objects to text
    current_schedule_text = [task.text if isinstance(task, Task) else task for task in current_schedule]
    previous_schedules_text = [[task.text if isinstance(task, Task) else task for task in schedule] for schedule in previous_schedules]

    schedule_history = [current_schedule_text, *previous_schedules_text]
    schedule_text = '\n\n'.join(['\n'.join(schedule) for schedule in schedule_history])


    prompt = f"""
    Given the following schedule history, identify recurring tasks that appear to be repetitive, such as waking up, meal times, and break times. Only include tasks that are highly likely to recur daily based on the provided information.

    Schedule History:
    {schedule_text}

    Please list the recurring tasks, one per line, in the following format:
    <recurring_tasks>
    [Task 1]
    [Task 2]
    ...
    </recurring_tasks>
    """

    response = client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=1000,
        temperature=0.2,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    recurring_tasks_match = re.search(r'<recurring_tasks>([\s\S]*?)<\/recurring_tasks>', response.content[0].text)
    if recurring_tasks_match:
        recurring_tasks = recurring_tasks_match.group(1).strip().split('\n')
        return jsonify({"recurring_tasks": recurring_tasks})
    else:
        return jsonify({"recurring_tasks": []})

@app.route("/")
def home():
    return "Running Flask on Google Colab!"

# Start the Flask server in a new thread
threading.Thread(target=app.run, kwargs={"use_reloader": False, "port": port}).start()
# app.run(host='0.0.0.0', port=5002, use_reloader=False)