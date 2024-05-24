import sys
import json
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM

sys.path.append("./apis")
sys.path.append("./services")

app = Flask(__name__)

def load_user_data(filepath):
    with open(filepath, 'r') as file:
        user_data = json.load(file)
    return user_data

def load_model():
    checkpoint = "meta-llama/Meta-Llama-3-8B-Instruct"
    tokenizer = AutoTokenizer.from_pretrained(checkpoint)
    model = AutoModelForCausalLM.from_pretrained(checkpoint).to('cuda')
    return tokenizer, model

def create_prompt(user_data):
    # Extracting user data
    name = user_data['name']
    age = user_data['age']
    work_schedule = user_data['work_schedule']
    energy_levels = user_data['energy_levels']
    tasks = user_data['tasks']
    exercise_routine = user_data['exercise_routine']
    relationships = user_data['relationships']
    fun_activities = user_data['fun_activities']
    ambitions = user_data['ambitions']
    priorities = user_data['priorities']
    break_preferences = user_data['break_preferences']
    sleep_schedule = user_data['sleep_schedule']
    meal_times = user_data['meal_times']
    layout_preference = user_data['layout_preference']

    work_schedule_str = f"who works {work_schedule['employment_type']} from {', '.join([f'{day} {hours}' for day, hours in work_schedule['days'].items()])}"
    energy_levels_str = ', '.join([f"{time}: {level}" for time, level in energy_levels.items()])
    tasks_str = ', '.join([f"{task['task']} ({task['importance']} points)" for task in tasks])
    fun_activities_str = ', '.join(fun_activities)
    meal_times_str = ', '.join([f"{meal}: {time}" for meal, time in meal_times.items()])
    break_preferences_str = f"every {break_preferences['frequency']} for {break_preferences['duration']}"

    personal_goals = []
    if 'short_term' in ambitions:
        personal_goals.append(f"short term - {', '.join(ambitions['short_term'])}")
    if 'long_term' in ambitions:
        personal_goals.append(f"long term - {', '.join(ambitions['long_term'])}")
    personal_goals_str = '; '.join(personal_goals)

    # Check if 'subcategory' exists in layout_preference
    if 'subcategory' in layout_preference:
        layout_format_str = f"{layout_preference['subcategory']} {layout_preference['type']} format"
    else:
        layout_format_str = f"{layout_preference['type']} format"

    prompt = (
        f"You are an expert psychologist and occupational therapist. Create a personalized schedule for {name}, a {age}-year-old, {work_schedule_str}. "
        f"His energy levels throughout the day are as follows: {energy_levels_str}. "
        f"Today's most difficult and important tasks are: {tasks_str}. "
        f"For fun, he likes {fun_activities_str}. He prefers his planner layout to be in {layout_format_str}. "
        f"He sleeps from {sleep_schedule}. His exercise routine includes {exercise_routine}. "
        f"He has meals at the following times: {meal_times_str}. "
        f"He prefers to take breaks {break_preferences_str}. "
        f"His personal goals are: {personal_goals_str}."
    )

    return prompt

def generate_response(model, tokenizer, prompt):
    # raw text -> input_ids
    inputs = tokenizer(prompt, truncation=True, max_length=512, return_tensors="pt")
    inputs = inputs.to('cuda')

    # Generate a response - input_ids -> logits
    outputs = model.generate(
        **inputs,
        max_length=1024,
        pad_token_id=tokenizer.eos_token_id,
        no_repeat_ngram_size=3,
        do_sample=True,
        top_p=0.92,
        top_k=0,
        temperature=0.85,
        num_return_sequences=1
    )

    # logits -> raw text
    response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response_text

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    user_data = data['user_data']
    
    # Load model and tokenizer (global variables to avoid reloading)
    global tokenizer, model
    if 'tokenizer' not in globals() or 'model' not in globals():
        tokenizer, model = load_model()

    prompt = create_prompt(user_data)
    response = generate_response(model, tokenizer, prompt)
    return jsonify({'output': response})

@app.route('/')  # Define a route for the root URL '/'
def hello():
    return "Hi bishes!"

if __name__ == '__main__':
    app.run(host="localhost", port=8000, debug=True)