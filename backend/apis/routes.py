from flask import Blueprint, jsonify, request
from backend.services.colab_integration import process_user_data, categorize_task, identify_recurring_tasks
from backend.db_config import get_user_schedules_collection
import traceback
from datetime import datetime
from bson import ObjectId
from datetime import datetime, timedelta

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
            return jsonify({"message": "Schedule synced to backend"}), 200
        else:
            return jsonify({"error": "Failed to update parsed schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@api_bp.route("/update_task", methods=["POST"])
def update_task():
    try:
        data = request.json
        # Enhanced input validation
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid request format"}), 400
        
        if 'taskId' not in data or 'updates' not in data:
            return jsonify({"error": "Missing required fields: taskId or updates"}), 400

        task_id = data['taskId']
        updates = data['updates']
        
        # Validate updates object
        required_fields = ['type', 'is_section', 'id']
        if not all(field in updates for field in required_fields):
            return jsonify({"error": "Missing required task fields"}), 400
            
        # Ensure taskId matches the updates.id
        if task_id != updates['id']:
            return jsonify({"error": "Task ID mismatch"}), 400

        user_schedules = get_user_schedules_collection()
        
        # Update the task in all relevant future schedules if it's recurring
        if updates.get('is_recurring'):
            result = user_schedules.update_many(
                {
                    "tasks.id": task_id,
                    "date": {"$gte": datetime.now().isoformat()}
                },
                {"$set": {"tasks.$": updates}}
            )
        else:
            # Update only the specific task instance
            result = user_schedules.update_one(
                {"tasks.id": task_id},
                {"$set": {"tasks.$": updates}}
            )

        if result.modified_count > 0:
            return jsonify({
                "message": "Task updated successfully",
                "taskId": task_id,
                "updates": updates
            }), 200
        else:
            return jsonify({"error": "Task not found or no changes made"}), 404

    except Exception as e:
        print("Exception occurred:", str(e))
        return jsonify({"error": str(e)}), 500

@api_bp.route("/get_recurring_tasks", methods=["GET"])
def get_recurring_tasks():
    try:
        user_schedules = get_user_schedules_collection()
        recurring_tasks = user_schedules.distinct(
            "tasks",
            {
                "tasks.is_recurring": {"$ne": None},
                "date": {"$gte": datetime.now().isoformat()}
            }
        )
        
        return jsonify({
            "recurring_tasks": recurring_tasks
        }), 200

    except Exception as e:
        print("Exception occurred:", str(e))
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules/<date>", methods=["GET"])
def get_schedule_by_date(date):
    """Retrieve schedule for a specific date."""
    try:
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        user_schedules = get_user_schedules_collection()
        
        # Find schedule for the specific date
        schedule = user_schedules.find_one({
            "date": {
                "$gte": f"{date}T00:00:00",
                "$lt": f"{date}T23:59:59"
            }
        })

        if schedule:
            # Convert ObjectId to string for JSON serialization
            schedule['_id'] = str(schedule['_id'])
            return jsonify(schedule), 200
        else:
            return jsonify({"error": "Schedule not found"}), 404

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules", methods=["POST"])
def save_schedule():
    """Save a new schedule."""
    try:
        data = request.json
        if not data or 'date' not in data or 'tasks' not in data:
            return jsonify({"error": "Missing required fields: date or tasks"}), 400

        user_schedules = get_user_schedules_collection()

        # Check if schedule already exists for this date
        existing_schedule = user_schedules.find_one({
            "date": {
                "$gte": f"{data['date']}T00:00:00",
                "$lt": f"{data['date']}T23:59:59"
            }
        })

        if existing_schedule:
            return jsonify({"error": "Schedule already exists for this date"}), 409

        # Prepare schedule document
        schedule_document = {
            "date": f"{data['date']}T00:00:00",
            "tasks": data['tasks'],
            "metadata": {
                "createdAt": datetime.now().isoformat(),
                "lastModified": datetime.now().isoformat()
            }
        }

        # Add userId if provided
        if 'userId' in data:
            schedule_document['userId'] = data['userId']

        result = user_schedules.insert_one(schedule_document)

        if result.inserted_id:
            schedule_document['_id'] = str(result.inserted_id)
            return jsonify(schedule_document), 201
        else:
            return jsonify({"error": "Failed to save schedule"}), 500

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules/<date>", methods=["PUT"])
def update_schedule(date):
    """Update an existing schedule."""
    try:
        data = request.json
        if not data or 'tasks' not in data:
            return jsonify({"error": "No tasks provided"}), 400

        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        user_schedules = get_user_schedules_collection()

        # Update the schedule
        result = user_schedules.update_one(
            {
                "date": {
                    "$gte": f"{date}T00:00:00",
                    "$lt": f"{date}T23:59:59"
                }
            },
            {
                "$set": {
                    "tasks": data['tasks'],
                    "metadata.lastModified": datetime.now().isoformat()
                }
            }
        )

        if result.modified_count > 0:
            return jsonify({"message": "Schedule updated successfully"}), 200
        else:
            return jsonify({"error": "Schedule not found"}), 404

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/schedules/range", methods=["GET"])
def get_schedules_range():
    """Retrieve schedules within a date range."""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not start_date or not end_date:
            return jsonify({"error": "Missing start_date or end_date"}), 400

        # Validate date formats
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        user_schedules = get_user_schedules_collection()

        # Find schedules within the date range
        schedules = list(user_schedules.find({
            "date": {
                "$gte": f"{start_date}T00:00:00",
                "$lt": f"{end_date}T23:59:59"
            }
        }).sort("date", 1))  # Sort by date ascending

        # Convert ObjectIds to strings
        for schedule in schedules:
            schedule['_id'] = str(schedule['_id'])

        return jsonify({"schedules": schedules}), 200

    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500