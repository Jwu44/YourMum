import os
import requests
import threading
from flask import Flask, request, jsonify
import anthropic
import logging
import re
import uuid
import json
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from functools import lru_cache
from langchain_community.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_anthropic import ChatAnthropic
from langchain.chains import RetrievalQA

# Configuration
CONFIG = {
    # "ANTHROPIC_API_KEY": 
    "MODEL_NAME": "claude-3-sonnet-20240229",
    "CHUNK_SIZE": 1000,
    "CHUNK_OVERLAP": 200,
    "RETRIEVER_K": 2,
    "MAX_TOKENS": 1024,
    "TEMPERATURE": 0.2
}

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class Task:
    id: str
    text: str
    categories: set = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            text=data["text"],
            categories=set(data.get("categories", []))
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "text": self.text,
            "categories": list(self.categories) if self.categories else []
        }
    
class ScheduleManager:
    def __init__(self, port=5003):
        self.app = Flask(__name__)
        self.port = port
        self.setup_routes()
        self.load_example_schedules()
        self.setup_vector_store()
        self.setup_llm()

    def setup_routes(self):
        self.app.route('/process_user_data', methods=['POST'])(self.process_user_data)
        self.app.route('/categorize_task', methods=['POST'])(self.process_task)
        self.app.route('/identify_recurring_tasks', methods=['POST'])(self.identify_recurring_tasks)
        self.app.route("/")(self.home)

    def load_example_schedules(self):
        with open('example_schedules.json', 'r') as f:
            self.example_schedules = json.load(f)

    def setup_vector_store(self):
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=CONFIG["CHUNK_SIZE"], chunk_overlap=CONFIG["CHUNK_OVERLAP"])
        documents = []
        for schedule in self.example_schedules['examples']:
            content = "\n".join(schedule['content'])
            chunks = text_splitter.split_text(content)
            for chunk in chunks:
                attributes_str = ",".join(schedule['attributes'])
                metadata = {"id": schedule['id'], "attributes": attributes_str}
                documents.append(Document(page_content=chunk, metadata=metadata))

        embeddings = HuggingFaceEmbeddings()
        self.vectorstore = Chroma.from_documents(documents, embeddings)
        self.retriever = self.vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": CONFIG["RETRIEVER_K"]})

    def setup_llm(self):
        os.environ["ANTHROPIC_API_KEY"] = CONFIG["ANTHROPIC_API_KEY"]
        self.client = anthropic.Anthropic(api_key=CONFIG["ANTHROPIC_API_KEY"])
        self.llm = ChatAnthropic(model=CONFIG["MODEL_NAME"], temperature=CONFIG["TEMPERATURE"], max_tokens=CONFIG["MAX_TOKENS"])

    @staticmethod
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    def create_prompt_schedule(self, user_data: Dict[str, Any]) -> Tuple[PromptTemplate, Dict[str, Any]]:
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

            # Retrieve matching schedule from example_schedules.json
            matching_schedule = self.get_matching_schedule(layout_subcategory)

            template = """You are an expert psychologist and occupational therapist specializing in personalized daily planning and work-life balance optimization. Your role is to create a tailored schedule for your client today that maximizes your client's productivity, well-being, and personal growth.

            <client_info>
            Name: {name}
            Age: {age}
            Work schedule: {work_schedule}
            Tasks:
            - Work tasks: {work_tasks}
            - Exercise tasks: {exercise_tasks}
            - Relationship tasks: {relationship_tasks}
            - Fun tasks: {fun_tasks}
            - Ambition tasks: {ambition_tasks}
            Energy levels throughout the day: {energy_levels}, where 'x' represents the hour of day in 24 hour format and 'y' represents how active the user is with 0% meaning {name} is asleep while 100% meaning {name} is feeling their absolute best.
            Priorities outside {work_schedule} (ranked from 4 - highest to 1 - lowest): {priority_description}
            </client_info>

            <instructions>
            1. Analyze the client's information and create a personalized, balanced schedule.
            2. To identify and prioritize tasks, follow these guidelines:
            a. Schedule work tasks strictly within {work_schedule} ensuring the most challenging work tasks are done when {name}'s energy levels are above 70% during {work_schedule}.
            b. Outside work hours {work_schedule}, focus on personal tasks which are classified as either exercise, relationship, fun, or ambition based on how {name} has ranked their priorities and what {name}'s energy levels are outside {work_schedule}.
            3. To format the schedule, follow these guidelines:
            a. Display the planner in a {layout_subcategory} {layout_preference} format.
            b. Use the following example as a reference for the expected layout, ensuring each task in this generated schedule belongs to {name}:

            {context}

            c. Double check the format given the following definitions for each subcategory: Time-boxed means the user would like to see each task with a starting and end time. Un-time-boxed means there should be no start or end time with any tasks. Structured means the user would like to see 'Morning, 'Afternoon' and 'Evening sections in their schedule. Unstructured means there should be no 'Morning, 'Afternoon' and 'Evening sections in the schedule.
            4. Edit the language of the schedule by following these guidelines:
            a. Write in a clear, concise, and conversational tone. Avoid jargon and unnecessary complexity.
            b. Do not include explanations or notes sections.
            c. Do not show categories for each task.
            </instructions>

            Please structure your response as follows:
            <thinking>
            [Your step-by-step thought process for creating the schedule]
            </thinking>

            <schedule>
            [The final personalized schedule]
            </schedule>
            """

            custom_rag_prompt = PromptTemplate.from_template(template)

            processed_data = {
                "name": name,
                "age": age,
                "work_schedule": work_schedule,
                "work_tasks": ", ".join(work_tasks),
                "exercise_tasks": ", ".join(exercise_tasks),
                "relationship_tasks": ", ".join(relationship_tasks),
                "fun_tasks": ", ".join(fun_tasks),
                "ambition_tasks": ", ".join(ambition_tasks),
                "energy_levels": energy_levels,
                "priority_description": priority_description,
                "layout_subcategory": layout_subcategory,
                "layout_preference": layout_preference,
                "context": matching_schedule
            }

            return custom_rag_prompt, processed_data

        except KeyError as e:
            logger.error(f"Missing key in user data: {str(e)}")
            raise ValueError(f"Missing required field in user data: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating prompt: {str(e)}")
            raise

    def get_matching_schedule(self, layout_subcategory: str) -> str:
        # Split the layout_subcategory into attributes
        attributes = layout_subcategory.split('-')

        # Find the first matching schedule
        for schedule in self.example_schedules['examples']:
            if all(attr in schedule['attributes'] for attr in attributes):
                return "\n".join(schedule['content'])

        # If no match found, return a default message
        return "No matching schedule found for the given layout subcategory."

    def generate_schedule(self, custom_rag_prompt: PromptTemplate, processed_user_data: Dict[str, Any]) -> str:
        try:
            layout_query = f"{processed_user_data['layout_subcategory']}"
            relevant_docs = self.retriever.get_relevant_documents(layout_query)
            context = self.format_docs(relevant_docs)

            logging.info(f"Context used for schedule generation:\n{context}")
            print(f"Context used for schedule generation:\n{context}")

            llm_input = {
                "context": context,
                **processed_user_data
            }

            result = custom_rag_prompt.format(**llm_input)
            response = self.llm.predict(result)

            return response
        except Exception as e:
            logger.error(f"Error generating schedule: {str(e)}")
            raise

    def categorize_task(self, task: str) -> str:
        prompt = f"""Given the following 5 categories to an ordinary life:
        1. Exercise - such as walking, running, swimming, gym, bouldering etc...
        2. Relationship - how you spend time with friends and family
        3. Fun - personal hobbies such as painting, croteching, baking, gaming, etc.., or miscallenous activities like shopping or packing etc...
        4. Ambition - short term or long term goals someone wants to achieve
        5. Work - such as going through emails, attending meetings etc... and do not fall in the same category as exercise, relationships, fun or ambitions.

        Categorize the following task: {task}.

        Respond only with the category name.
        """

        try:
            response = self.client.messages.create(
                model=CONFIG["MODEL_NAME"],
                max_tokens=100,
                temperature=CONFIG["TEMPERATURE"],
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            category = response.content[0].text.strip()

            valid_categories = set(["Work", "Exercise", "Relationship", "Fun", "Ambition"])
            return category if category in valid_categories else "Work"
        except Exception as e:
            logger.error(f"Error categorizing task: {str(e)}")
            return "Work"

    def process_user_data(self):
        try:
            user_data = request.json

            if 'tasks' in user_data:
                user_data['tasks'] = [Task.from_dict(task) if isinstance(task, dict) else task for task in user_data['tasks']]

            custom_rag_prompt, processed_user_data = self.create_prompt_schedule(user_data)
            response = self.generate_schedule(custom_rag_prompt, processed_user_data)

            return jsonify({'schedule': response})
        except Exception as e:
            logger.error(f"Error processing user data: {str(e)}")
            return jsonify({'error': str(e)}), 400

    def process_task(self):
        try:
            task = request.json.get('task')
            if not task:
                raise ValueError("No task provided")
            response = self.categorize_task(task)
            return jsonify({"category": response})
        except Exception as e:
            logger.error(f"Error processing task: {str(e)}")
            return jsonify({'error': str(e)}), 400

    def identify_recurring_tasks(self):
        try:
            data = request.json
            current_schedule = data.get('current_schedule', [])
            previous_schedules = data.get('previous_schedules', [])

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

            response = self.client.messages.create(
                model=CONFIG["MODEL_NAME"],
                max_tokens=1000,
                temperature=CONFIG["TEMPERATURE"],
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
        except Exception as e:
            logger.error(f"Error identifying recurring tasks: {str(e)}")
            return jsonify({'error': str(e)}), 400

    def home(self):
        return "Running Flask on Google Colab!"

    # threading.Thread(target=app.run, kwargs={"use_reloader": False, "port": port}).start()
    def run(self):
        self.app.run(host='0.0.0.0', port=5003, use_reloader=False)

    # Initialize the ScheduleManager if it doesn't exist
if 'schedule_manager' not in globals():
    schedule_manager = ScheduleManager(port=5003)  # You can change the port if needed

# Start the server in a new thread
schedule_manager.run()