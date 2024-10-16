from flask import Blueprint, jsonify, request
from backend.services.colab_integration import process_user_data, categorize_task, identify_recurring_tasks
from backend.db_config import get_user_schedules_collection
import traceback
from datetime import datetime
from bson import ObjectId

api_bp = Blueprint("api", __name__)

@api_bp.route("/submit_data", methods=["POST"])
def submit_data():
    try:
        user_data = request.json
        if not user_data or 'name' not in user_data:
            return jsonify({"error": "No data provided or name is missing"}), 400
        
        user_id = user_data['name']
        
        print(f"User data received for user {user_id}:", user_data)

        colab_response = process_user_data(user_data)

        print("Response from Colab server:", colab_response)

        if colab_response and 'schedule' in colab_response:
            user_schedules = get_user_schedules_collection()

            # Prepare the schedule document with more detailed information
            schedule_document = {
                "userId": user_id,
                "date": datetime.now().isoformat(),
                "inputs": {
                    "name": user_data.get('name'),
                    "age": user_data.get('age'),
                    "work_start_time": user_data.get('work_start_time'),
                    "work_end_time": user_data.get('work_end_time'),
                    "energy_patterns": user_data.get('energy_patterns', []),
                    "layout_preference": user_data.get('layout_preference', {}),
                    "priorities": user_data.get('priorities', {}),
                    "tasks": user_data.get('tasks', [])
                },
                "schedule": colab_response['schedule'],
                "metadata": {
                    "generatedAt": datetime.now().isoformat(),
                }
            }

            result = user_schedules.insert_one(schedule_document)

            if result.inserted_id:
                return jsonify({
                    "message": "Schedule generated and saved successfully",
                    "userId": user_id,
                    "scheduleId": str(result.inserted_id),
                    "inputs": schedule_document["inputs"],
                    "schedule": schedule_document["schedule"]
                }), 201
            else:
                return jsonify({"error": "Failed to save schedule to database"}), 500
        else:
            return jsonify({"error": "Failed to generate schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/categorize_task", methods=["POST"])
def add_task():
    try:
        task_data = request.json
        if not task_data or 'task' not in task_data:
            return jsonify({"error": "No task provided"}), 400
        
        print("Task received for categorization:", task_data['task'])
        categorized_task = categorize_task(task_data['task'])
        print("Categorization result:", categorized_task)

        # Return the entire task dictionary
        return jsonify(categorized_task)

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/identify_recurring_tasks", methods=["POST"])
def recurring_tasks():
    try:
        data = request.json
        if not data or 'current_schedule' not in data or 'previous_schedules' not in data:
            return jsonify({"error": "Invalid data provided"}), 400
        
        current_schedule = data['current_schedule']
        previous_schedules = data['previous_schedules']
        
        print("Identifying recurring tasks")
        recurring_tasks = identify_recurring_tasks(current_schedule, previous_schedules)
        print("Recurring tasks identified:", recurring_tasks)

        return jsonify({"recurring_tasks": recurring_tasks})

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/update_parsed_schedule", methods=["POST"])
def update_parsed_schedule():
    try:
        data = request.json
        if not data or 'scheduleId' not in data or 'parsedTasks' not in data:
            return jsonify({"error": "Invalid data provided"}), 400

        schedule_id = data['scheduleId']
        parsed_tasks = data['parsedTasks']

        user_schedules = get_user_schedules_collection()

        # Update the document with the parsed tasks
        result = user_schedules.update_one(
            {"_id": ObjectId(schedule_id)},
            {"$set": {"schedule": parsed_tasks}}
        )

        if result.modified_count > 0:
            return jsonify({"message": "Parsed schedule updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update parsed schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500