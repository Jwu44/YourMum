import os
import threading
import torch
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from torch.utils.data import Dataset
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialise app
app = Flask(__name__)

# Update any base URLs to use the public ngrok URL
app.config["BASE_URL"] = public_url

# Load model and tokenizer once
checkpoint = "google/flan-t5-large"
tokenizer = AutoTokenizer.from_pretrained(checkpoint)
model = AutoModelForSeq2SeqLM.from_pretrained(checkpoint)
model.to('cuda')
model.eval()

# create prompt function
def create_prompt(user_data):
  try:
    # Extract user data
    name = user_data['name']
    age = user_data['age']
    work_schedule = f"{user_data['work_start_time']} - {user_data['work_end_time']}"
    tasks = ', '.join(user_data['tasks'].split(','))
    energy_levels = ', '.join([f"{entry['x']:02d}:00, energy level = {entry['y']}% " for entry in user_data['energy_levels']])
    exercise_routine = user_data['exercise_routine']
    relationships = user_data['relationships']
    fun_activities = user_data['fun_activities']
    short_term_ambitions = user_data['ambitions']['short_term']
    long_term_ambitions = user_data['ambitions']['long_term']
    priorities = user_data['priorities']
    layout_preference = user_data['layout_preference']
    layout_format = f"{layout_preference.get('subcategory', '')} {layout_preference['type']} format".strip()

    prompt = f"""You are an expert psychologist and occupational therapist. Your client is {age}-year-old {name} who has provided their following details for the day:
        1. Work schedule: {work_schedule}
        2. Tasks:
        - Work tasks: {', '.join(work_tasks)}
        - Exercise tasks: {', '.join(exercise_tasks)}
        - Relationship tasks: {', '.join(relationship_tasks)}
        - Fun tasks: {', '.join(fun_tasks)}
        - Ambition tasks: {', '.join(ambition_tasks)}
        3. Energy levels throughout the day: {energy_levels}
        4. Priorities: Health - {priorities['health']}%, Relationships - {priorities['relationships']}%, Fun Activities - {priorities['fun_activities']}%, Ambitions - {priorities['ambitions']}%

        Create a personalised and balanced schedule for {name} by following these guidelines:
        1. Work tasks must be completed during {work_schedule}.
        2. Outside {work_schedule}, focus on exercise, relationship, fun and ambition tasks based on their priorties.
        3. Priortize important work tasks and outside work tasks when energy levels are above 70%.
        4. Distribute remaining tasks according the priorities and the user's energy levels.
        5. Display the planner in a {layout_subcategory} {layout_preference} format following {example_schedules[layout_subcategory]} as an example of the expected layout ensuring each task generated belongs to {name}.
        7. Write in a clear, concise, and conversational tone. Avoid jargon and unnecessary complexity.
        8. Do not include an explanation in the end or include a notes section.
        9. Do not show the category for each task.
        """

    return prompt

  except KeyError as e:
      logger.error(f"Missing key in user data: {str(e)}")
      raise ValueError(f"Missing required field in user data: {str(e)}")
  except Exception as e:
      logger.error(f"Error creating prompt: {str(e)}")
      raise

def generate_response(model, tokenizer, prompt):
    try:
        inputs = tokenizer(prompt, truncation=True, max_length=512, return_tensors="pt")
        inputs = inputs.to('cuda')

        outputs = model.generate(
            **inputs,
            max_length=1024,
            pad_token_id=tokenizer.eos_token_id,
            no_repeat_ngram_size=3,
            do_sample=True,
            top_p=0.9,
            top_k=50,
            temperature=0.7,
            num_return_sequences=1
        )

        response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response_text
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        raise

@app.route('/process_user_data', methods=['POST'])
def process_user_data():
    user_data = request.json

    try:
        prompt = create_prompt(user_data)
        response = generate_response(model, tokenizer, prompt)

        return jsonify({'schedule': response})
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        logger.error(f"Error generating schedule: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred while generating the schedule'}), 500

@app.route("/")
def home():
    return "Running Flask on Google Colab!"

# start flask server in a new thread
threading.Thread(target=app.run, kwargs={"host": "0.0.0.0", "port": port, "use_reloader": False}).start()