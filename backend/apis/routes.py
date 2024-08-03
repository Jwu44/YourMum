from flask import Blueprint, jsonify, request
from backend.services.colab_integration import process_user_data, categorize_task, identify_recurring_tasks
import traceback

api_bp = Blueprint("api", __name__)

@api_bp.route("/submit_data", methods=["POST"])
def submit_data():
    try:
        user_data = request.json
        if not user_data:
            return jsonify({"error": "No data provided"}), 400
        
        # Log the received user data
        print("User data received:", user_data)

        # Send the request to the Colab server
        colab_response = process_user_data(user_data)

        # Log the response from the Colab server
        print("Response from Colab server:", colab_response)

        if colab_response and 'schedule' in colab_response:
            return jsonify({"schedule": colab_response['schedule']})
        else:
            return jsonify({"error": "Failed to generate schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()  # Log the stack trace
        return jsonify({"error": str(e)}), 500

@api_bp.route("/categorize_task", methods=["POST"])
def add_task():
    try:
        task_data = request.json
        if not task_data or 'task' not in task_data:
            return jsonify({"error": "No task provided"}), 400
        
        print("Task received for categorization:", task_data['task'])
        category = categorize_task(task_data['task'])
        print("Categorization result:", category)

        return jsonify({"category": category})

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/identify_recurring_tasks", methods=["POST"])
def get_recurring_tasks():
    try:
        data = request.json
        if not data or 'current_schedule' not in data:
            return jsonify({"error": "No current schedule provided"}), 400
        
        current_schedule = data['current_schedule']
        previous_schedules = data.get('previous_schedules', [])
        
        print("Identifying recurring tasks")
        recurring_tasks = identify_recurring_tasks(current_schedule, previous_schedules)
        print("Recurring tasks identified:", recurring_tasks)

        return jsonify({"recurring_tasks": recurring_tasks})

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500