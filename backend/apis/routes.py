from flask import Blueprint, jsonify, request
from backend.db_config import get_database, store_microstep_feedback, get_ai_suggestions_collection, create_or_update_user as db_create_or_update_user, get_user_schedules_collection
import traceback

from bson import ObjectId
from datetime import datetime, timezone 
from backend.models.task import Task
from typing import List, Dict, Any, Optional, Union, Tuple
import json
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
import os
# Import AI service functions directly
from backend.services.ai_service import (
    categorize_task,
    decompose_task,
    update_decomposition_patterns,
    generate_schedule_suggestions
)
from backend.services.schedule_gen import (
    generate_schedule
)

import uuid

# Add import for the new schedule service
from backend.services.schedule_service import schedule_service
from backend.services.archive_service import (
    archive_task,
    get_archived_tasks,
    move_archived_task_to_today,
    delete_archived_task
)

from backend.services.slack_service import SlackService
slack_service = SlackService()

api_bp = Blueprint("api", __name__)

# Add a global OPTIONS request handler for all routes
@api_bp.route('/<path:path>', methods=['OPTIONS'])
@api_bp.route('/', methods=['OPTIONS'])
def handle_options_requests(path=None):
    """
    Handle OPTIONS preflight requests for all API routes.
    
    Args:
        path: Optional path parameter for route matching
        
    Returns:
        JSON response with 200 OK status for preflight requests
    """
    response = jsonify({"status": "ok"})
    return response

if not firebase_admin._apps:
    # Use environment variable or path to service account credentials
    cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'path/to/serviceAccountKey.json')
    try:
        # Try to initialize with credentials file
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        # Fallback to default credentials (for production environment)
        print(f"Warning: Using default credentials. Error: {e}")
        firebase_admin.initialize_app()

def verify_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Firebase ID token and return the decoded token.
    
    Args:
        token: The Firebase ID token to verify
        
    Returns:
        The decoded token payload or None if verification fails
    """
    try:
        # Development bypass
        if os.getenv('NODE_ENV') == 'development' and token == 'mock-token-for-development':
            return {
                'uid': 'dev-user-123',
                'email': 'dev@example.com',
                'name': 'Dev User'
            }
        
        # Verify the token
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {e}")
        traceback.print_exc()
        return None

def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Get user data from database using a verified Firebase token.
    
    Args:
        token: The Firebase ID token
        
    Returns:
        User document from database or None if not found
    """
    try:
        # Verify the token first
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            return None
            
        # Extract user ID (Firebase UID)
        user_id = decoded_token.get('uid')
        if not user_id:
            return None
            
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Find user by Google ID (which is the Firebase UID)
        user = users.find_one({"googleId": user_id})
        
        # If user found in database, return it (applies to all users including dev users)
        if user:
            return user
            
        # Development bypass - return mock user only if user not found in database
        if os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123':
            return {
                'googleId': 'dev-user-123',
                'email': 'dev@example.com',
                'displayName': 'Dev User',
                'photoURL': '',
                'role': 'free',
                'timezone': 'UTC',  # Add timezone field for consistency
                'calendarSynced': False,
                # Add other required fields as needed
            }
            
        # User not found and not a dev user
        return None
    except Exception as e:
        print(f"Error getting user from token: {e}")
        traceback.print_exc()
        return None
    
@api_bp.route("/auth/user", methods=["OPTIONS"])
def handle_auth_user_options():
    """Handle CORS preflight requests for the auth user endpoint."""
    return jsonify({"status": "ok"})

@api_bp.route("/auth/user", methods=["GET"])
def get_auth_user_info():
    """
    Get authenticated user information or return API documentation.
    
    Returns:
        - User info if valid Authorization header provided
        - API documentation if no Authorization header
        - 401 error if invalid token
    """
    try:
        # Check if Authorization header is provided
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            # Extract token and get user
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if user:
                # Process user for JSON serialization
                serialized_user = process_user_for_response(user)
                return jsonify({
                    "user": serialized_user,
                    "authenticated": True
                }), 200
            else:
                return jsonify({
                    "error": "Authentication failed",
                    "message": "Invalid token or user not found"
                }), 401
        else:
            # No auth header, return API documentation
            return jsonify({
                "endpoint": "/api/auth/user",
                "methods": ["GET", "POST", "OPTIONS"],
                "description": "User authentication endpoint",
                "GET_parameters": {
                    "Authorization": "Bearer <firebase_id_token> (required in header)"
                },
                "POST_parameters": {
                    "googleId": "string (required)",
                    "email": "string (required)",
                    "displayName": "string",
                    "photoURL": "string",
                    "hasCalendarAccess": "boolean"
                }
            }), 200
            
    except Exception as e:
        print(f"Error in get_auth_user_info: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500

@api_bp.route("/auth/user", methods=["POST"])
def create_or_update_user():
    """
    Create or update user after Google authentication.
    
    Expected JSON body:
        - googleId: string (required)
        - email: string (required) 
        - displayName: string (optional)
        - photoURL: string (optional)
        - hasCalendarAccess: boolean (optional)
    
    Returns:
        - 200: User successfully created/updated
        - 400: Missing required fields or invalid data
        - 500: Internal server error
    """
    try:
        print("Received authentication request. Headers:", request.headers)
        print("Request body:", request.get_json(silent=True))
        
        # Validate request payload
        user_data = request.json
        if not user_data:
            return jsonify({"error": "Missing request body"}), 400

        # Validate required fields
        required_fields = ["googleId", "email"]
        missing_fields = [field for field in required_fields if field not in user_data]
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        # Process user data for creation/update
        processed_user_data = _prepare_user_data_for_storage(user_data)

        # Get database instance and users collection
        db = get_database()
        users = db['users']

        # Create or update user using the utility function
        user = db_create_or_update_user(users, processed_user_data)
        
        if not user:
            return jsonify({
                "error": "Failed to create or update user"
            }), 500

        # Convert ObjectId to string and dates to ISO format for JSON serialization
        serialized_user = process_user_for_response(user)

        return jsonify({
            "user": serialized_user,
            "message": "User successfully created/updated"
        }), 200

    except Exception as e:
        # Log the full error traceback for debugging
        print(f"Error in create_or_update_user: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Internal server error",
            "message": str(e)
        }), 500

@api_bp.route("/auth/user", methods=["PUT"])
def update_auth_user():
    """
    Update authenticated user profile data.
    
    Expected JSON body:
        - displayName: string (optional)
        - jobTitle: string (optional) 
        - age: integer (optional)
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        - 200: User successfully updated
        - 400: Invalid data or validation errors
        - 401: Authentication required
        - 500: Internal server error
    """
    try:
        # Verify authentication
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "error": "Authentication required"
            }), 401
            
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
        
        if not user:
            return jsonify({
                "error": "Authentication failed"
            }), 401

        # Validate request data
        updates = request.json
        if not updates:
            return jsonify({
                "error": "No update data provided"
            }), 400

        # Validate and sanitize fields
        sanitized_updates = {}
        
        # Handle displayName
        if 'displayName' in updates:
            display_name = updates['displayName']
            if display_name is not None and not isinstance(display_name, str):
                return jsonify({"error": "displayName must be a string"}), 400
            if display_name is not None:
                sanitized_updates['displayName'] = display_name.strip()
        
        # Handle jobTitle
        if 'jobTitle' in updates:
            job_title = updates['jobTitle']
            if job_title is not None and not isinstance(job_title, str):
                return jsonify({"error": "jobTitle must be a string"}), 400
            if job_title is not None:
                job_title = job_title.strip()
                if len(job_title) > 50:
                    return jsonify({"error": "jobTitle must be 50 characters or less"}), 400
                sanitized_updates['jobTitle'] = job_title
        
        # Handle age
        if 'age' in updates:
            age = updates['age']
            if age is not None:
                try:
                    age_value = int(age)
                    if age_value < 1 or age_value > 150:
                        return jsonify({"error": "Age must be between 1 and 150"}), 400
                    sanitized_updates['age'] = age_value
                except (ValueError, TypeError):
                    return jsonify({"error": "Age must be a valid number"}), 400

        # Add metadata
        sanitized_updates['metadata'] = {
            'lastModified': datetime.now(timezone.utc)
        }

        # Update user in database
        db = get_database()
        users = db['users']
        
        result = users.update_one(
            {"googleId": user['googleId']},
            {"$set": sanitized_updates}
        )
        
        if result.modified_count == 0:
            return jsonify({
                "error": "No changes made to user profile"
            }), 400

        # Get updated user
        updated_user = users.find_one({"googleId": user['googleId']})
        if not updated_user:
            return jsonify({
                "error": "Failed to retrieve updated user data"
            }), 500

        serialized_user = process_user_for_response(updated_user)

        return jsonify({
            "user": serialized_user,
            "message": "User profile updated successfully"
        }), 200

    except Exception as e:
        print(f"Error in update_auth_user: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Internal server error"
        }), 500

def _prepare_user_data_for_storage(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Helper function to prepare user data for database storage.
    Handles default values, calendar settings, and data validation.
    
    Args:
        user_data: Raw user data from request
        
    Returns:
        Processed user data ready for database storage
    """
    # Prepare calendar settings based on hasCalendarAccess
    has_calendar_access = user_data.get('hasCalendarAccess', False)
    calendar_settings = {
        "connected": has_calendar_access,
        "lastSyncTime": None,
        "syncStatus": "never",
        "selectedCalendars": [],
        "error": None,
        "settings": {
            "autoSync": True,
            "syncFrequency": 15,  # minutes
            "defaultReminders": True
        }
    }

    # Ensure displayName is never None/null
    display_name = user_data.get("displayName")
    if not display_name:
        # Fall back to email username if displayName is not provided
        display_name = user_data["email"].split('@')[0]

    # Handle timezone field with default value
    timezone_value = user_data.get("timezone", "UTC")  # Default to UTC if not provided
    # Validate timezone format (basic validation)
    if not isinstance(timezone_value, str) or not timezone_value.strip():
        timezone_value = "UTC"

    # Handle jobTitle field (optional, max 50 characters)
    job_title = user_data.get("jobTitle")
    if job_title and isinstance(job_title, str):
        job_title = job_title.strip()[:50]  # Truncate to 50 characters if needed
    else:
        job_title = None

    # Handle age field (optional, numeric only)
    age = user_data.get("age")
    if age is not None:
        try:
            age = int(age)
            # Validate age range
            if age < 1 or age > 150:
                age = None
        except (ValueError, TypeError):
            age = None

    # Prepare user data with all required fields and ensure no null values
    return {
        "googleId": user_data["googleId"],
        "email": user_data["email"],
        "displayName": display_name,  # Use processed display_name
        "photoURL": user_data.get("photoURL") or "",  # Ensure photoURL is never null
        "role": "free",  # Default role for new users
        "timezone": timezone_value,  # Add timezone field with default
        "jobTitle": job_title,  # Add jobTitle field (optional)
        "age": age,  # Add age field (optional)
        "calendarSynced": has_calendar_access,
        "lastLogin": datetime.now(timezone.utc), 
        "calendar": calendar_settings,
        "metadata": {
            "lastModified": datetime.now(timezone.utc)
        }
    }

def process_user_for_response(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process user document for JSON response.
    Converts ObjectId to string and datetime objects to ISO format.
    """
    processed_user = dict(user)  # Create a copy to avoid modifying the original
    
    # Convert ObjectId to string
    if '_id' in processed_user:
        processed_user['_id'] = str(processed_user['_id'])
    
    # Convert datetime objects to ISO format strings
    date_fields = ['lastLogin', 'createdAt', 'lastModified']
    for field in date_fields:
        if field in processed_user:
            if isinstance(processed_user[field], datetime):
                processed_user[field] = processed_user[field].isoformat()
    
    # Process nested datetime objects in metadata
    if 'metadata' in processed_user and 'lastModified' in processed_user['metadata']:
        if isinstance(processed_user['metadata']['lastModified'], datetime):
            processed_user['metadata']['lastModified'] = processed_user['metadata']['lastModified'].isoformat()
    
    # Process calendar lastSyncTime if it exists
    if 'calendar' in processed_user and 'lastSyncTime' in processed_user['calendar']:
        if isinstance(processed_user['calendar']['lastSyncTime'], datetime):
            processed_user['calendar']['lastSyncTime'] = processed_user['calendar']['lastSyncTime'].isoformat()
    
    return processed_user

@api_bp.route("/user/<user_id>", methods=["GET"])
def get_user(user_id):
    try:
        # Get database instance
        db = get_database()
        
        # Get user collection
        users = db['users']
        
        # Find user by Google ID
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Convert ObjectId to string for JSON serialization
        user['_id'] = str(user['_id'])
        
        return jsonify({"user": user}), 200
        
    except Exception as e:
        print(f"Error getting user: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route("/user/<user_id>", methods=["PUT"])
def update_user(user_id):
    try:
        updates = request.json
        if not updates:
            return jsonify({"error": "No updates provided"}), 400
            
        # Get database instance
        db = get_database()
        
        # Get user collection
        users = db['users']
        
        # Update user document
        result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                **updates,
                "lastModified": datetime.now().isoformat()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "User not found"}), 404
            
        # Get updated user document
        updated_user = users.find_one({"googleId": user_id})
        updated_user['_id'] = str(updated_user['_id'])
        
        return jsonify({
            "message": "User updated successfully",
            "user": updated_user
        }), 200
        
    except Exception as e:
        print(f"Error updating user: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route("/categorize_task", methods=["POST"])
def api_categorize_task():
    try:
        data = request.json
        if not data or 'task' not in data:
            return jsonify({"error": "No task provided"}), 400
            
        task_text = data['task']
        
        # Call AI service directly
        categories = categorize_task(task_text)
        
        # Create a Task object
        task = Task(id=str(uuid.uuid4()), text=task_text, categories=categories)
        
        # Return a dictionary representation of the Task
        return jsonify(task.to_dict())
        
    except Exception as e:
        print(f"Error in api_categorize_task: {str(e)}")
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
    
@api_bp.route("/user/<user_id>/has-schedules", methods=["GET"])
def check_user_schedules(user_id):
    """Check if a user has any schedules."""
    try:
        user_schedules = get_user_schedules_collection()
        
        # Check for at least one schedule
        schedule_exists = user_schedules.find_one(
            {"userId": user_id},
            {"_id": 1}  # Only retrieve ID for performance
        ) is not None
        
        return jsonify({
            "hasSchedules": schedule_exists
        }), 200
        
    except Exception as e:
        print("Exception occurred:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/tasks/decompose", methods=["POST"])
def api_decompose_task():
    try:
        data = request.json
        if not data or 'task' not in data:
            return jsonify({"error": "No task provided"}), 400
            
        task_data = data['task']
        
        # Prepare user data for context
        user_data = {
            'user_id': data.get('user_id', 'unknown'),
            'energy_patterns': data.get('energy_patterns', []),
            'priorities': data.get('priorities', {}),
            'work_start_time': data.get('work_start_time', '9:00 AM'),
            'work_end_time': data.get('work_end_time', '10:00 PM')
        }
        
        # Call AI service directly
        result = decompose_task(task_data, user_data)
        
        # Handle different response formats safely
        if result:
            if isinstance(result, list):
                if result and isinstance(result[0], dict):
                    # If result is array of objects with 'text' property
                    microstep_texts = [step['text'] for step in result]
                else:
                    # If result is already array of strings
                    microstep_texts = result
            else:
                # If result is a single string, wrap it in a list
                microstep_texts = [str(result)]
        else:
            # Handle empty or None result
            return jsonify({"error": "No decomposition results generated"}), 400
            
        print("Microsteps:", microstep_texts)
        return jsonify(microstep_texts)
        
    except Exception as e:
        print(f"Error in api_decompose_task: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/tasks/microstep-feedback", methods=["POST"])
def api_store_microstep_feedback():
    """
    Handle POST requests for storing microstep feedback.
    Expects JSON data with task_id, microstep_id, accepted, and optional completion_order.
    """
    try:
        # Validate request data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Required fields validation
        required_fields = ['task_id', 'microstep_id', 'accepted']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # Prepare feedback data dictionary
        feedback_data = {
            'task_id': data['task_id'],
            'microstep_id': data['microstep_id'],
            'accepted': data['accepted'],
            'completion_order': data.get('completion_order'),  # Optional field
            'timestamp': datetime.now(timezone.utc).isoformat()  # Add timestamp
        }

        # Store feedback in database
        db_result = store_microstep_feedback(feedback_data)

        # If the microstep was accepted, update patterns
        if feedback_data['accepted']:
            # In a real implementation, you would fetch the task and microstep details
            # from your database here
            task_text = "Example task"  # Replace with actual task text from database
            categories = ["Work"]  # Replace with actual categories from database
            
            # Update decomposition patterns
            update_decomposition_patterns(
                task=task_text,
                categories=categories,
                successful_steps=[feedback_data['microstep_id']]
            )

        if not db_result:
            return jsonify({
                "error": "Failed to store feedback",
                "database_status": "error",
                "colab_status": "success"  # Maintain backward compatibility
            }), 500

        # Return success response with backward compatibility
        return jsonify({
            "database_status": "success",
            "colab_status": "success"
        })

    except Exception as e:
        print(f"Error in api_store_microstep_feedback: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "database_status": "error",
            "colab_status": "error"
        }), 500

@api_bp.route("/schedule/suggestions", methods=["POST"])
def api_generate_suggestions():
    """
    Handle schedule suggestions generation requests.
    
    Expected request body:
    {
        "userId": str,
        "currentSchedule": List[Dict],
        "historicalSchedules": List[List[Dict]],
        "priorities": Dict[str, str],
        "energyPatterns": List[str],
        "workStartTime": str,
        "workEndTime": str
    }
    """
    try:
        # Validate request data
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        required_fields = [
            'userId', 'currentSchedule', 'historicalSchedules',
            'priorities', 'energyPatterns'
        ]
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
        
        print(data)
        try:
            # Call AI service directly
            suggestions = generate_schedule_suggestions(
                user_id=data['userId'],
                current_schedule=data['currentSchedule'],
                historical_schedules=data['historicalSchedules'],
                priorities=data['priorities'],
                energy_patterns=data['energyPatterns'],
                work_start_time=data.get('workStartTime', '9:00 AM'),
                work_end_time=data.get('workEndTime', '10:00 PM')
            )
            
            # Store suggestions in database
            stored_suggestions = store_suggestions_in_db(
                user_id=data['userId'],
                date=datetime.now().strftime('%Y-%m-%d'),
                suggestions=suggestions
            )
            
            return jsonify({
                "suggestions": stored_suggestions,
                "metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "count": len(stored_suggestions)
                }
            })
            
        except Exception as e:
            print(f"Error generating suggestions: {e}")
            return jsonify({
                "error": f"Failed to generate suggestions: {str(e)}"
            }), 500
            
    except Exception as e:
        print(f"Error in api_generate_suggestions: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def store_suggestions_in_db(user_id: str, date: str, suggestions: List[Dict]) -> List[Dict]:
    """Store generated suggestions in MongoDB."""
    try:
        suggestions_collection = get_ai_suggestions_collection()
        
        # Prepare suggestions for storage
        suggestions_to_store = []
        for suggestion in suggestions:
            suggestion_doc = {
                "user_id": user_id,
                "date": date,
                **suggestion,
               "created_at": datetime.now(timezone.utc).isoformat() 
            }
            suggestions_to_store.append(suggestion_doc)
        
        # Store suggestions
        if suggestions_to_store:
            result = suggestions_collection.insert_many(suggestions_to_store)
            
            # Update suggestions with generated IDs - convert ObjectId to string
            for suggestion, inserted_id in zip(suggestions_to_store, result.inserted_ids):
                suggestion['id'] = str(inserted_id)  # Convert ObjectId to string
        
        # Use custom encoder when returning
        return json.loads(json.dumps(suggestions_to_store, cls=MongoJSONEncoder))
        
    except Exception as e:
        print(f"Error storing suggestions: {e}")
        # Return original suggestions if storage fails
        return suggestions

# Helper function for extracting user ID from request (reusable across routes)
def extract_user_id_from_request() -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Extract user ID from request, prioritizing token-based auth with fallback.
    
    Returns:
        Tuple of (user_id: Optional[str], error_response: Optional[Dict])
        If user_id is None, error_response contains the error details
    """
    # Try to get user ID from authentication token
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        user = get_user_from_token(token)
        if user and user.get('googleId'):
            return user.get('googleId'), None
    
    # Fallback to request data for submit_data endpoint
    data = request.json or {}
    user_id = data.get('googleId') or data.get('name')
    
    if not user_id:
        return None, {
            "success": False,
            "error": "User identification required"
        }
    
    return user_id, None

@api_bp.route("/submit_data", methods=["POST"])
def submit_data():
    """
    Generate and store a new schedule based on user input data and existing tasks.
    
    Expected request body (from InputsConfig.tsx state):
    {
        "date": str (YYYY-MM-DD format, required),
        "name": str (optional),
        "googleId": str (optional),
        "tasks": List[Dict] (optional, may include calendar events as task objects),
        "work_start_time": str,
        "work_end_time": str,
        "working_days": List[str] (optional),
        "priorities": Dict[str, str],
        "energy_patterns": List[str],
        "layout_preference": {
            "layout": str,
            "subcategory": str (optional),
            "orderingPattern": str
        }
    }
    
    Returns:
        200: Schedule generated successfully with schedule data
        400: Invalid request data or validation errors  
        401: Authentication required
        500: Internal server error (with existing schedule if available)
    """
    try:
        # Validate request data
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Extract user ID with proper error handling
        user_id, error_response = extract_user_id_from_request()
        if not user_id:
            return jsonify(error_response), 401

        # Validate required fields from InputsConfig.tsx
        required_fields = ['date', 'work_start_time', 'work_end_time']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        # Validate date format
        date = data['date']
        try:
            from datetime import datetime as dt
            dt.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400

        # Get existing schedule for fallback error handling
        existing_schedule = None
        try:
            success, result = schedule_service.get_schedule_by_date(user_id, date)
            if success:
                existing_schedule = result.get('schedule', [])
        except Exception:
            # Continue if we can't get existing schedule
            pass

        # Call schedule_gen.py directly - bypass schedule service
        try:
            schedule_result = generate_schedule(data)
            
            if not schedule_result or not schedule_result.get('success', True):
                raise Exception(schedule_result.get('error', 'Schedule generation failed'))
            
            generated_tasks = schedule_result.get('tasks', [])
            if not generated_tasks:
                raise Exception('No tasks generated')

        except Exception as gen_error:
            print(f"Schedule generation failed: {str(gen_error)}")
            # Return existing schedule with error message
            return jsonify({
                "success": False,
                "error": f"Failed to generate schedule: {str(gen_error)}",
                "schedule": existing_schedule or [],
                "fallback": True
            }), 500

        # Store the generated schedule using centralized service
        try:
            success, result = schedule_service.create_schedule_from_ai_generation(
                user_id=user_id,
                date=date,
                generated_tasks=generated_tasks,
                inputs=data
            )
            
            if not success:
                print(f"Error storing AI-generated schedule: {result.get('error', 'Unknown error')}")
                # Return generated schedule even if storage fails
                return jsonify({
                    "success": True,
                    **result
                })

            return jsonify({
                "success": True,
                **result
            })

        except Exception as store_error:
            print(f"Error storing schedule: {str(store_error)}")
            # Return generated schedule even if storage fails
            return jsonify({
                "success": True,
                "schedule": generated_tasks,
                "date": date,
                "warning": f"Schedule generated but storage failed: {str(store_error)}"
            })

    except Exception as e:
        print(f"Error in submit_data: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/schedules/<date>", methods=["GET"])
def get_schedule_by_date(date):
    """
    Get an existing schedule for a specific date.
    
    URL Parameters:
        date: Date in YYYY-MM-DD format
        
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Schedule found and returned successfully
        404: No schedule found for the specified date
        400: Invalid date format or request
        401: Authentication required
        500: Internal server error
    """
    try:
        # Validate date format
        try:
            from datetime import datetime as dt
            dt.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400

        # Extract user ID (requires authentication for GET)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Use schedule service to get schedule
        success, result = schedule_service.get_schedule_by_date(user_id, date)
        
        if not success:
            # More explicit error handling
            error_msg = result.get("error", "")
            if "no schedule found" in error_msg.lower() or "not found" in error_msg.lower():
                status_code = 404
            else:
                status_code = 500
            
            return jsonify({
                "success": False,
                "error": result.get("error", "Failed to get schedule")
            }), status_code

        return jsonify({
            "success": True,
            **result
        })

    except Exception as e:
        print(f"Error in get_schedule_by_date: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/schedules/<date>", methods=["OPTIONS"])
def handle_schedule_options(date):
    """Handle CORS preflight requests for schedule endpoints."""
    return jsonify({"status": "ok"})

@api_bp.route("/schedules/<date>", methods=["PUT"])
def update_schedule_by_date(date):
    """
    Update an existing schedule for a specific date with new tasks.
    Returns 404 if schedule doesn't exist (proper REST semantics).
    """
    try:
        # Validate date format
        try:
            from datetime import datetime as dt
            dt.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400

        # Validate request data
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Validate tasks array
        tasks = data.get('tasks')
        if not isinstance(tasks, list):
            return jsonify({
                "success": False,
                "error": "Tasks must be an array"
            }), 400

        # Extract user ID (requires authentication for PUT)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Use strict update - fail if schedule doesn't exist
        success, result = schedule_service.update_schedule_tasks(user_id, date, tasks)
        
        if not success:
            status_code = 404 if "not found" in result.get("error", "").lower() else 500
            return jsonify({
                "success": False,
                "error": result.get("error", "Failed to update schedule")
            }), status_code

        return jsonify({
            "success": True,
            **result
        })

    except Exception as e:
        print(f"Error in update_schedule_by_date: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/schedules", methods=["POST"])
def create_schedule():
    """
    Create a new schedule for a user on a specific date with provided tasks.
    
    Expected request body:
    {
        "date": str (YYYY-MM-DD format, required),
        "tasks": List[Dict] (optional, defaults to empty array),
        "inputs": Dict (optional, user input data for schedule context)
    }
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Schedule created successfully
        400: Invalid date format, invalid tasks, or validation errors
        401: Authentication required
        500: Internal server error
    """
    try:
        # Extract user ID (requires authentication)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Validate request data
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Validate required date field
        date = data.get('date')
        if not date:
            return jsonify({
                "success": False,
                "error": "Missing required field: date"
            }), 400
        
        # Validate date format
        try:
            from datetime import datetime as dt
            dt.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400

        # Validate tasks array (optional, defaults to empty)
        tasks = data.get('tasks', [])
        if not isinstance(tasks, list):
            return jsonify({
                "success": False,
                "error": "Tasks must be an array"
            }), 400

        # Validate inputs object (optional, defaults to None)
        inputs = data.get('inputs')
        if inputs is not None and not isinstance(inputs, dict):
            return jsonify({
                "success": False,
                "error": "Inputs must be an object"
            }), 400

        # Create schedule using centralized service
        success, result = schedule_service.create_empty_schedule(
            user_id=user_id,
            date=date,
            tasks=tasks,
            inputs=inputs
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": result.get("error", "Failed to create schedule")
            }), 500

        return jsonify({
            "success": True,
            **result
        })

    except Exception as e:
        print(f"Error in create_schedule: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/schedules", methods=["OPTIONS"])
def handle_create_schedule_options():
    """Handle CORS preflight requests for schedule creation endpoint."""
    return jsonify({"status": "ok"})

@api_bp.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    """
    Delete a specific task from a user's schedule.
    
    URL Parameters:
        task_id: The ID of the task to delete
        
    Expected request body:
    {
        "date": str (YYYY-MM-DD format, required)
    }
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Task deleted successfully with updated schedule
        400: Invalid request data, missing date, or trying to delete a section
        401: Authentication required
        404: Task not found or schedule doesn't exist
        500: Internal server error
    """
    try:
        # Extract user ID (requires authentication)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Validate request data
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Validate required date field
        date = data.get('date')
        if not date:
            return jsonify({
                "success": False,
                "error": "Missing required field: date"
            }), 400
        
        # Validate date format
        try:
            from datetime import datetime as dt
            dt.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400

        # Get existing schedule
        success, result = schedule_service.get_schedule_by_date(user_id, date)
        
        if not success:
            return jsonify({
                "success": False,
                "error": result.get("error", "Schedule not found")
            }), 404

        current_schedule = result.get('schedule', [])
        
        # Find the task to delete
        task_to_delete = None
        for task in current_schedule:
            if task.get('id') == task_id:
                task_to_delete = task
                break
        
        if not task_to_delete:
            return jsonify({
                "success": False,
                "error": "Task not found in schedule"
            }), 404
        
        # Prevent deletion of section tasks
        if task_to_delete.get('is_section', False) or task_to_delete.get('type') == 'section':
            return jsonify({
                "success": False,
                "error": "Cannot delete section tasks. Only regular tasks can be deleted."
            }), 400
        
        # Remove the task from the schedule
        updated_schedule = [task for task in current_schedule if task.get('id') != task_id]
        
        # Update the schedule using schedule service
        update_success, update_result = schedule_service.update_schedule_tasks(
            user_id, date, updated_schedule
        )
        
        if not update_success:
            return jsonify({
                "success": False,
                "error": update_result.get("error", "Failed to update schedule")
            }), 500

        return jsonify({
            "success": True,
            "message": "Task deleted successfully",
            "taskId": task_id,
            **update_result
        })

    except Exception as e:
        print(f"Error in delete_task: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/tasks/<task_id>", methods=["OPTIONS"])
def handle_delete_task_options(task_id):
    """Handle CORS preflight requests for task deletion endpoint."""
    return jsonify({"status": "ok"})

@api_bp.route("/auth/logout", methods=["DELETE"])
def logout_user():
    """
    Log out the authenticated user by invalidating their session.
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Successfully logged out with cache control headers
        401: Authentication required or invalid token
        500: Internal server error
    """
    try:
        # Extract and validate authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401

        # Create response with success message
        response = jsonify({
            "message": "Logged out successfully"
        })
        
        # Add cache control headers to prevent caching of sensitive logout responses
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response, 200
        
    except Exception as e:
        print(f"Error during logout: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Failed to logout"
        }), 500


@api_bp.route("/auth/user", methods=["DELETE"])
def delete_user_account():
    """
    Delete user account and all associated data.
    
    This endpoint performs a complete account deletion including:
    - Disconnecting external integrations (Slack, Google Calendar)
    - Deleting all user data from MongoDB collections
    - Firebase account remains inactive (not deleted)
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Account successfully deleted
        401: Authentication required or invalid token
        500: Internal server error
    """
    try:
        # Extract and validate authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401

        user_google_id = user.get('googleId')
        user_email = user.get('email', 'Unknown')
        
        print(f"Starting account deletion for user: {user_email} (ID: {user_google_id})")
        
        # Track failures for error reporting
        failures = []
        
        # Step 1: Disconnect Slack integration if exists
        print(f"Disconnecting Slack integration for user {user_google_id}")
        success, result = slack_service.disconnect_integration(user_google_id)
        if not success:
            failures.append(f"Slack disconnection: {result.get('error', 'Unknown error')}")
            print(f"Slack disconnection failed: {result}")
        else:
            print("Slack integration disconnected successfully")
    
        # Step 2: Get database and clean up all user-related data
        db = get_database()
        
        # Collections to clean up - delete all user-related data
        collections_to_clean = [
            'UserSchedules',           # User's daily schedules
            'AIsuggestions',           # AI-generated suggestions
            'MicrostepFeedback',       # User's task feedback
            'DecompositionPatterns',   # User's task decomposition patterns
            'calendar_events',         # User's synced calendar events
            'Processed Slack Messages' # User's Slack message tracking
        ]
        
        # Delete from each collection
        total_deleted = 0
        for collection_name in collections_to_clean:
            try:
                collection = db[collection_name]
                result = collection.delete_many({"googleId": user_google_id})
                deleted_count = result.deleted_count
                total_deleted += deleted_count
                print(f"Deleted {deleted_count} documents from {collection_name}")
            except Exception as e:
                failures.append(f"{collection_name} cleanup: {str(e)}")
                print(f"Error cleaning {collection_name}: {e}")
        
        # Step 3: Delete main user document (do this last)
        try:
            users_collection = db['users']
            user_result = users_collection.delete_one({"googleId": user_google_id})
            if user_result.deleted_count > 0:
                print(f"Deleted main user document for {user_email}")
                total_deleted += user_result.deleted_count
            else:
                failures.append("Main user document not found")
                print(f"Main user document not found for {user_google_id}")
        except Exception as e:
            failures.append(f"User document deletion: {str(e)}")
            print(f"Error deleting main user document: {e}")
        
        # Step 4: Clear Google Calendar integration data (handled by user document deletion)
        # The calendar credentials are stored in the user document, so they're already cleaned up
        
        print(f"Account deletion completed. Total documents deleted: {total_deleted}")
        
        # Create response
        response_data = {
            "success": True,
            "message": "Account deleted successfully",
            "deleted_documents": total_deleted
        }
        
        # Include warnings if there were any failures
        if failures:
            response_data["warnings"] = failures
            print(f"Account deletion completed with warnings: {failures}")
        
        # Add cache control headers to prevent caching
        response = jsonify(response_data)
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response, 200
        
    except Exception as e:
        print(f"Error during account deletion: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Failed to delete account"
        }), 500

@api_bp.route("/auth/logout", methods=["OPTIONS"])
def handle_logout_options():
    """Handle CORS preflight requests for logout endpoint."""
    return jsonify({"status": "ok"})

# Archive functionality endpoints
@api_bp.route("/archive/task", methods=["POST"])
def api_archive_task():
    """
    Archive a task for the authenticated user.
    
    Expected request body:
    {
        "taskId": str (required),
        "taskData": Dict (required - complete task object),
        "originalDate": str (required - YYYY-MM-DD format)
    }
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Task archived successfully
        400: Invalid request data or validation errors
        401: Authentication required
        500: Internal server error
    """
    try:
        # Extract user ID (requires authentication)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Validate request data
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Validate required fields
        required_fields = ['taskId', 'taskData', 'originalDate']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        task_data = data['taskData']
        original_date = data['originalDate']

        # Validate task data has required fields
        if not task_data.get('id') or not task_data.get('text'):
            return jsonify({
                "success": False,
                "error": "Invalid task data - missing id or text"
            }), 400

        # Validate date format
        try:
            from datetime import datetime as dt
            dt.strptime(original_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400

        # Archive the task
        result = archive_task(user_id, task_data, original_date)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        print(f"Error in api_archive_task: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/archive/task", methods=["OPTIONS"])
def handle_archive_task_options():
    """Handle CORS preflight requests for archive task endpoint."""
    return jsonify({"status": "ok"})

@api_bp.route("/archive/tasks", methods=["GET"])
def api_get_archived_tasks():
    """
    Get all archived tasks for the authenticated user.
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Archived tasks retrieved successfully
        401: Authentication required
        500: Internal server error
    """
    try:
        # Extract user ID (requires authentication)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Get archived tasks
        result = get_archived_tasks(user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        print(f"Error in api_get_archived_tasks: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/archive/tasks", methods=["OPTIONS"])
def handle_get_archived_tasks_options():
    """Handle CORS preflight requests for get archived tasks endpoint."""
    return jsonify({"status": "ok"})

@api_bp.route("/archive/task/<task_id>/move-to-today", methods=["POST"])
def api_move_archived_task_to_today(task_id):
    """
    Move an archived task to today's schedule.
    
    URL Parameters:
        task_id: The ID of the task to move
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Task moved successfully with task data for adding to schedule
        401: Authentication required
        404: Task not found in archive
        500: Internal server error
    """
    try:
        # Extract user ID (requires authentication)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Move the archived task to today
        result = move_archived_task_to_today(user_id, task_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            status_code = 404 if "not found" in result.get("error", "").lower() else 500
            return jsonify(result), status_code

    except Exception as e:
        print(f"Error in api_move_archived_task_to_today: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/archive/task/<task_id>/move-to-today", methods=["OPTIONS"])
def handle_move_archived_task_options(task_id):
    """Handle CORS preflight requests for move archived task endpoint."""
    return jsonify({"status": "ok"})

@api_bp.route("/archive/task/<task_id>", methods=["DELETE"])
def api_delete_archived_task(task_id):
    """
    Permanently delete an archived task.
    
    URL Parameters:
        task_id: The ID of the task to delete
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Task deleted successfully
        401: Authentication required
        404: Task not found in archive
        500: Internal server error
    """
    try:
        # Extract user ID (requires authentication)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401
            
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Delete the archived task
        result = delete_archived_task(user_id, task_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            status_code = 404 if "not found" in result.get("error", "").lower() else 500
            return jsonify(result), status_code

    except Exception as e:
        print(f"Error in api_delete_archived_task: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/archive/task/<task_id>", methods=["OPTIONS"])
def handle_delete_archived_task_options(task_id):
    """Handle CORS preflight requests for delete archived task endpoint."""
    return jsonify({"status": "ok"})