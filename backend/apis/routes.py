from flask import Blueprint, jsonify, request, Response, stream_with_context
from backend.db_config import get_database, store_microstep_feedback, create_or_update_user as db_create_or_update_user, get_user_schedules_collection
import traceback

from bson import ObjectId
from datetime import datetime, timezone, timedelta
from backend.models.task import Task
from typing import List, Dict, Any, Optional, Union, Tuple
import json
from queue import Empty
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from backend.utils.auth import verify_firebase_token as utils_verify_firebase_token
from backend.utils.timezone import validate_timezone_update, get_reliable_user_timezone
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
from backend.apis.calendar_routes import ensure_calendar_watch_for_user
import requests
import os
import base64
import json as json_lib

api_bp = Blueprint("api", __name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

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


# -----------------------------
# Server-Sent Events (SSE)
# -----------------------------
@api_bp.route("/events/stream", methods=["GET"])
def events_stream():
    """
    Establish a Server-Sent Events stream for realtime user notifications.

    Authentication:
        - Accepts Firebase ID token via Authorization header (Bearer) or
          as a query parameter `token` (EventSource cannot set headers)

    Streamed message format:
        data: {"type": str, "date": "YYYY-MM-DD", ...}\n\n
    Heartbeats are sent periodically to keep the connection alive through proxies.
    """
    try:
        # Extract token from header or query param as fallback for EventSource
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.split(' ')[1] if auth_header.startswith('Bearer ') else request.args.get('token')

        if not token:
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401

        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Lazy import to avoid any circular dependencies at module load
        from backend.services.event_bus import event_bus

        # Best-effort ensure Google Calendar watch is active for realtime calendar sync
        try:
            ensure_calendar_watch_for_user(user_id)
        except Exception:
            pass

        def _get_user_timezone(user_doc: Dict[str, Any]) -> str:
            user_tz = user_doc.get('timezone')
            return get_reliable_user_timezone(user_tz)

        def _today_in_tz(tz_str: str) -> str:
            try:
                import pytz
                tz = pytz.timezone(tz_str)
                now_local = datetime.now(tz)
            except Exception:
                now_local = datetime.now(timezone.utc)
            return now_local.strftime('%Y-%m-%d')

        def _safe_json_payload(event: Dict[str, Any]) -> str:
            return json.dumps(event)

        def generate_stream():
            subscriber_queue = event_bus.subscribe(user_id)
            try:
                # Initial ping so the client knows the connection is up
                yield "event: ping\ndata: {}\n\n"
                # Prepare DB poll fallback state
                last_seen_modified: Optional[str] = None
                user_tz = _get_user_timezone(user)
                current_date_str = _today_in_tz(user_tz)
                while True:
                    try:
                        # Wake up frequently for low-latency DB poll fallback
                        message = subscriber_queue.get(timeout=2)
                        yield f"data: {_safe_json_payload(message)}\n\n"
                    except Empty:
                        # Heartbeat plus DB poll fallback across processes
                        # 1) Heartbeat to prevent idle timeouts
                        yield ": keep-alive\n\n"
                        # 2) DB poll to detect schedule changes in other workers
                        try:
                            payload, last_seen_modified = _poll_schedule_update(
                                user_id,
                                user_tz,
                                last_seen_modified,
                                date_override=current_date_str
                            )
                            if payload is not None:
                                yield f"data: {_safe_json_payload(payload)}\n\n"
                        except Exception:
                            # Never break the stream on poll errors
                            pass
                        # 3) Short sleep to avoid tight loop
                        try:
                            import time as _t
                            _t.sleep(2)
                        except Exception:
                            pass
            finally:
                event_bus.unsubscribe(user_id, subscriber_queue)

        headers = {
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # for nginx to disable buffering
            "Connection": "keep-alive",
        }
        return Response(stream_with_context(generate_stream()),
                        headers=headers,
                        mimetype="text/event-stream")

    except Exception as e:
        print(f"Error in events_stream: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to establish event stream: {str(e)}"
        }), 500


# Lightweight helper for SSE DB-poll fallback
def _poll_schedule_update(
    user_id: str,
    user_timezone: str,
    last_seen_modified: Optional[str],
    date_override: Optional[str] = None
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Check the user's schedule document for "today" (in user_timezone) and
    return a schedule_updated payload if metadata.last_modified changed.

    Returns: (payload_or_none, new_last_seen_modified)
    """
    try:
        # Resolve target date once per call
        if date_override:
            date_str = date_override
        else:
            try:
                import pytz
                tz = pytz.timezone(user_timezone or 'UTC')
                now_local = datetime.now(tz)
            except Exception:
                now_local = datetime.now(timezone.utc)
            date_str = now_local.strftime('%Y-%m-%d')

        schedules = get_user_schedules_collection()
        # Date is stored in canonical format
        formatted_date = date_str
        doc = schedules.find_one({
            "userId": user_id,
            "date": formatted_date
        })
        if not doc:
            return None, last_seen_modified

        metadata = (doc.get('metadata') or {})
        current_last_modified = metadata.get('last_modified')
        if not current_last_modified:
            return None, last_seen_modified

        if last_seen_modified is None:
            # First observation; memorize and do not emit
            return None, current_last_modified

        if current_last_modified != last_seen_modified:
            return {"type": "schedule_updated", "date": date_str}, current_last_modified

        return None, last_seen_modified
    except Exception:
        return None, last_seen_modified


@api_bp.route("/events/stream", methods=["OPTIONS"])
def handle_events_stream_options():
    """Handle CORS preflight requests for the events stream endpoint."""
    return jsonify({"status": "ok"})

# -----------------------------
# User Settings: Timezone
# -----------------------------

@api_bp.route("/user/timezone", methods=["PUT"])
def update_user_timezone():
    """
    Update the current user's timezone.

    Body: { "timezone": "Australia/Sydney" }
    Auth: Firebase ID token required (Authorization: Bearer <token>)
    """
    try:
        # Auth
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "error": "Authentication required"}), 401
        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({"success": False, "error": "Invalid authentication token"}), 401

        data = request.get_json(silent=True) or {}
        tz_value = (data.get('timezone') or '').strip()
        if not tz_value:
            return jsonify({"success": False, "error": "Missing timezone"}), 400

        # Validate timezone using robust validation
        is_valid, error_msg = validate_timezone_update(tz_value)
        if not is_valid:
            return jsonify({"success": False, "error": error_msg}), 400

        db = get_database()
        users = db['users']
        users.update_one({"googleId": user['googleId']}, {"$set": {"timezone": tz_value}})

        return jsonify({"success": True, "timezone": tz_value})
    except Exception as e:
        print(f"Error updating user timezone: {str(e)}")
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500

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
    """Centralized verification via backend.utils.auth."""
    return utils_verify_firebase_token(token)

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
        # Exclude _id field to prevent BSON serialization issues
        user = users.find_one({"googleId": user_id}, {"_id": 0})
        
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
                # Process user for JSON serialization (handles BSON types)
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
                    "hasCalendarAccess": "boolean",
                    "calendarAccessToken": "string (optional, when hasCalendarAccess is true)"
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
        - calendarAccessToken: string (optional, used when hasCalendarAccess is true)
    
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

        # Check if user exists before creating/updating to determine isNewUser flag
        existing_user = users.find_one({"googleId": user_data["googleId"]})
        is_new_user = existing_user is None

        # Create or update user using the utility function
        user = db_create_or_update_user(users, processed_user_data)

        if not user:
            return jsonify({
                "error": "Failed to create or update user"
            }), 500

        # Convert ObjectId to string and dates to ISO format for JSON serialization
        serialized_user = process_user_for_response(user)

        # Enhanced response structure for single OAuth flow
        message = "User created successfully" if is_new_user else "User updated successfully"

        return jsonify({
            "user": serialized_user,
            "message": message,
            "isNewUser": is_new_user
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
    calendar_access_token = user_data.get('calendarAccessToken')

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

    # Enhanced: Handle proper calendar tokens from single OAuth flow
    calendar_tokens = user_data.get('calendarTokens')
    if has_calendar_access and calendar_tokens:
        # Validate required token fields
        required_token_fields = ['accessToken']
        missing_fields = [field for field in required_token_fields if not calendar_tokens.get(field)]
        if missing_fields:
            print(f"⚠️ Missing required calendar token fields: {missing_fields}")
            calendar_settings["connected"] = False
            calendar_settings["syncStatus"] = "failed"
            calendar_settings["error"] = f"Missing token fields: {', '.join(missing_fields)}"
        else:
            # Process expiration time with enhanced validation
            expires_at = calendar_tokens.get('expiresAt')
            if isinstance(expires_at, str):
                try:
                    expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                except ValueError as e:
                    print(f"⚠️ Invalid expiresAt format: {expires_at}, error: {e}")
                    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            elif not expires_at:
                expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

            # Validate refresh token presence (critical for single OAuth flow)
            refresh_token = calendar_tokens.get('refreshToken', '')
            if not refresh_token:
                print("⚠️ WARNING: No refresh token provided - calendar sync may fail when access token expires")

            calendar_settings["credentials"] = {
                "accessToken": calendar_tokens.get('accessToken'),
                "refreshToken": refresh_token,
                "expiresAt": expires_at,
                "tokenType": calendar_tokens.get('tokenType', 'Bearer'),
                "scope": calendar_tokens.get('scope', 'https://www.googleapis.com/auth/calendar.readonly')
            }
            calendar_settings["syncStatus"] = "completed"
            calendar_settings["lastSyncTime"] = datetime.now(timezone.utc)
            calendar_settings["connected"] = True

            print(f"✅ Stored calendar credentials from single OAuth flow:")
            print(f"   - Access token: {bool(calendar_tokens.get('accessToken'))}")
            print(f"   - Refresh token: {bool(refresh_token)}")
            print(f"   - Scope: {calendar_tokens.get('scope', 'N/A')}")
            print(f"   - Expires at: {expires_at}")
    elif has_calendar_access and calendar_access_token:
        # Fallback for legacy calendar access token (without refresh token)
        # This should be rare with single OAuth flow
        calendar_settings["credentials"] = {
            "accessToken": calendar_access_token,
            "refreshToken": "",
            "expiresAt": datetime.now(timezone.utc) + timedelta(hours=1),
            "tokenType": "Bearer",
            "scope": "https://www.googleapis.com/auth/calendar.readonly"
        }
        calendar_settings["syncStatus"] = "completed"
        calendar_settings["lastSyncTime"] = datetime.now(timezone.utc)
        calendar_settings["connected"] = True

        print("⚠️ LEGACY: Stored calendar credentials without refresh token - consider upgrading to single OAuth flow")

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
        "hasCalendarAccess": has_calendar_access,  # Preserve this for create_or_update_user
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

    # Process calendar credentials expiresAt if it exists (fixes 500 error in OAuth callback)
    if ('calendar' in processed_user and
        'credentials' in processed_user['calendar'] and
        'expiresAt' in processed_user['calendar']['credentials']):
        expires_at = processed_user['calendar']['credentials']['expiresAt']
        if isinstance(expires_at, datetime):
            processed_user['calendar']['credentials']['expiresAt'] = expires_at.isoformat()

    return processed_user

@api_bp.route("/schedules/autogenerate", methods=["POST"])
def autogenerate_schedule_api():
    """
    Autogenerate a schedule for a given date for the authenticated user.

    Body: { "date": "YYYY-MM-DD" }
    """
    try:
        # Auth required
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

        data = request.json or {}
        date = data.get('date')
        timezone_override = data.get('timezone')
        if not date:
            return jsonify({
                "success": False,
                "error": "Missing required field: date"
            }), 400
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400

        # Call with optional user_timezone only when provided to satisfy strict tests
        if timezone_override:
            success, result = schedule_service.autogenerate_schedule(
                user_id,
                date,
                user_timezone=timezone_override
            )
        else:
            success, result = schedule_service.autogenerate_schedule(
                user_id,
                date
            )
        if not success:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to autogenerate')
            }), 500

        return jsonify({
            "success": True,
            **result
        })
    except Exception as e:
        print(f"Error in autogenerate_schedule_api: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/schedules/recent-with-tasks", methods=["GET"])
def get_recent_with_tasks_api():
    """
    Return the most recent schedule (within N days before a given date) that has ≥1 non-section task.
    Query: before=YYYY-MM-DD&days=30
    """
    try:
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

        before = request.args.get('before')
        days_param = request.args.get('days', '30')
        if not before:
            return jsonify({
                "success": False,
                "error": "Missing required query param: before"
            }), 400
        try:
            datetime.strptime(before, '%Y-%m-%d')
            days = int(days_param)
        except Exception:
            return jsonify({
                "success": False,
                "error": "Invalid query params. Use before=YYYY-MM-DD and days as integer"
            }), 400

        schedule_doc = schedule_service.get_most_recent_schedule_with_tasks(user_id, before, days)
        if not schedule_doc:
            return jsonify({
                "success": True,
                "found": False
            })

        # Remove Mongo _id if present
        doc_copy = {k: v for k, v in schedule_doc.items() if k != '_id'}
        return jsonify({
            "success": True,
            "found": True,
            **doc_copy
        })
    except Exception as e:
        print(f"Error in get_recent_with_tasks_api: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@api_bp.route("/user/<user_id>", methods=["GET"])
def get_user(user_id):
    try:
        # Get database instance
        db = get_database()
        
        # Get user collection
        users = db['users']
        
        # Find user by Google ID (exclude _id to prevent BSON serialization issues)
        user = users.find_one({"googleId": user_id}, {"_id": 0})

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Process user for safe JSON serialization
        serialized_user = process_user_for_response(user)
        return jsonify({"user": serialized_user}), 200
        
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
            
        # Get updated user document (exclude _id to prevent BSON serialization issues)
        updated_user = users.find_one({"googleId": user_id}, {"_id": 0})

        # Process user for safe JSON serialization
        serialized_user = process_user_for_response(updated_user)
        return jsonify({
            "message": "User updated successfully",
            "user": serialized_user
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
    # Start timing
    import time
    request_start_time = time.time()
    print(f"[TIMING] submit_data request started")
    
    try:
        # Validate request data
        validation_start_time = time.time()
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
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400
        
        validation_duration = time.time() - validation_start_time
        print(f"[TIMING] Validation and authentication: {validation_duration:.3f}s")

        # Get existing schedule for fallback error handling
        fallback_start_time = time.time()
        existing_schedule = None
        try:
            success, result = schedule_service.get_schedule_by_date(user_id, date)
            if success:
                existing_schedule = result.get('schedule', [])
        except Exception:
            # Continue if we can't get existing schedule
            pass
        fallback_duration = time.time() - fallback_start_time
        print(f"[TIMING] Existing schedule lookup: {fallback_duration:.3f}s")

        # Call schedule_gen.py directly - bypass schedule service
        generation_start_time = time.time()
        try:
            schedule_result = generate_schedule(data)
            
            if not schedule_result or not schedule_result.get('success', True):
                raise Exception(schedule_result.get('error', 'Schedule generation failed'))
            
            generated_tasks = schedule_result.get('tasks', [])
            if not generated_tasks:
                raise Exception('No tasks generated')

        except Exception as gen_error:
            generation_duration = time.time() - generation_start_time
            print(f"[TIMING] Schedule generation failed after: {generation_duration:.3f}s")
            print(f"Schedule generation failed: {str(gen_error)}")
            # Return existing schedule with error message
            return jsonify({
                "success": False,
                "error": f"Failed to generate schedule: {str(gen_error)}",
                "schedule": existing_schedule or [],
                "fallback": True
            }), 500

        generation_duration = time.time() - generation_start_time
        print(f"[TIMING] Schedule generation: {generation_duration:.3f}s")

        # Store the generated schedule using centralized service
        storage_start_time = time.time()
        try:
            success, result = schedule_service.create_schedule_from_ai_generation(
                user_id=user_id,
                date=date,
                generated_tasks=generated_tasks,
                inputs=data
            )
            
            storage_duration = time.time() - storage_start_time
            print(f"[TIMING] Schedule storage: {storage_duration:.3f}s")
            
            if not success:
                print(f"Error storing AI-generated schedule: {result.get('error', 'Unknown error')}")
                # Return generated schedule even if storage fails
                return jsonify({
                    "success": True,
                    **result
                })

            request_duration = time.time() - request_start_time
            print(f"[TIMING] Total submit_data request: {request_duration:.3f}s")
            
            return jsonify({
                "success": True,
                **result
            })

        except Exception as store_error:
            storage_duration = time.time() - storage_start_time
            print(f"[TIMING] Schedule storage failed after: {storage_duration:.3f}s")
            print(f"Error storing schedule: {str(store_error)}")
            # Return generated schedule even if storage fails
            return jsonify({
                "success": True,
                "schedule": generated_tasks,
                "date": date,
                "warning": f"Schedule generated but storage failed: {str(store_error)}"
            })

    except Exception as e:
        request_duration = time.time() - request_start_time
        print(f"[TIMING] submit_data request failed after: {request_duration:.3f}s")
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
            datetime.strptime(date, '%Y-%m-%d')
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
            datetime.strptime(date, '%Y-%m-%d')
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
            datetime.strptime(date, '%Y-%m-%d')
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
            datetime.strptime(date, '%Y-%m-%d')
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

# New OAuth callback endpoint for single OAuth flow
@auth_bp.route("/oauth-callback", methods=["POST"])
def oauth_callback():
    """
    Handle OAuth callback for single authentication + calendar flow.

    This endpoint handles the authorization code exchange without requiring
    a Firebase token (solves chicken-and-egg problem). It exchanges the code
    for Google tokens, validates the ID token, and returns both user data
    and OAuth tokens for frontend Firebase authentication.

    Expected request body:
    {
        "authorization_code": str (required),
        "state": str (required)
    }

    Returns:
        200: OAuth successful with user data and tokens
        400: Missing parameters or validation errors
        500: Google OAuth or server errors
    """
    try:
        # Validate request data
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Check required parameters
        authorization_code = data.get('authorization_code')
        state = data.get('state')

        if not authorization_code:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: authorization_code"
            }), 400

        if not state:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: state"
            }), 400

        # Get Google OAuth credentials from environment
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.getenv('GOOGLE_OAUTH_REDIRECT_URI', 'https://yourmum.app/auth/callback')

        if not client_id or not client_secret:
            return jsonify({
                "success": False,
                "error": "Google OAuth credentials not configured"
            }), 500

        print(f"DEBUG: Processing OAuth callback with code: {authorization_code[:20]}...")

        # Exchange authorization code for tokens with Google
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': authorization_code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri
        }

        token_response = requests.post(token_url, data=token_data)

        if token_response.status_code != 200:
            print(f"DEBUG: Google token exchange failed: {token_response.status_code} - {token_response.text}")
            return jsonify({
                "success": False,
                "error": f"Google OAuth token exchange failed: {token_response.text}"
            }), 400

        token_json = token_response.json()

        # Extract and validate tokens
        access_token = token_json.get('access_token')
        refresh_token = token_json.get('refresh_token')
        id_token = token_json.get('id_token')
        expires_in = token_json.get('expires_in', 3600)
        scope = token_json.get('scope', '')

        if not access_token or not id_token:
            return jsonify({
                "success": False,
                "error": "Incomplete token response from Google"
            }), 400

        # Decode and validate ID token (basic validation)
        try:
            # Split JWT and decode payload
            id_token_parts = id_token.split('.')
            if len(id_token_parts) != 3:
                raise ValueError("Invalid JWT format")

            # Decode payload (add padding if needed)
            payload_b64 = id_token_parts[1]
            payload_b64 += '=' * (4 - len(payload_b64) % 4)  # Add padding
            payload_json = base64.b64decode(payload_b64)
            user_info = json_lib.loads(payload_json)

            # Basic validation
            if not user_info.get('iss', '').endswith('google.com'):
                raise ValueError("Invalid token issuer")

            if user_info.get('exp', 0) * 1000 < datetime.now().timestamp() * 1000:
                raise ValueError("Token expired")

        except Exception as e:
            print(f"DEBUG: ID token validation failed: {e}")
            return jsonify({
                "success": False,
                "error": "Invalid ID token format"
            }), 400

        print(f"✅ OAuth tokens received successfully for user: {user_info.get('email')}")
        print(f"   - Access token: {bool(access_token)}")
        print(f"   - Refresh token: {bool(refresh_token)}")
        print(f"   - Scope: {scope}")

        # Prepare user data from ID token
        user_data = {
            'googleId': user_info.get('sub'),
            'email': user_info.get('email'),
            'displayName': user_info.get('name'),
            'photoURL': user_info.get('picture', ''),
            'hasCalendarAccess': True,
            'calendarTokens': {
                'accessToken': access_token,
                'refreshToken': refresh_token or '',
                'expiresAt': datetime.now(timezone.utc) + timedelta(seconds=expires_in),
                'scope': scope
            }
        }

        # Store user in database
        processed_user_data = _prepare_user_data_for_storage(user_data)
        db = get_database()
        users = db['users']

        # Check if user exists to determine isNewUser flag
        existing_user = users.find_one({"googleId": user_data["googleId"]})
        is_new_user = existing_user is None

        # Create or update user
        user = db_create_or_update_user(users, processed_user_data)
        if not user:
            return jsonify({
                "success": False,
                "error": "Failed to store user data"
            }), 500

        # Serialize user data for response
        serialized_user = process_user_for_response(user)

        # Return success response with user data and tokens
        return jsonify({
            "success": True,
            "user": serialized_user,
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token or '',
                "id_token": id_token,
                "expires_in": expires_in,
                "scope": scope,
                "token_type": "Bearer"
            },
            "isNewUser": is_new_user,
            "message": "OAuth callback processed successfully"
        }), 200

    except Exception as e:
        print(f"Error in oauth_callback: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@auth_bp.route("/oauth-callback", methods=["OPTIONS"])
def handle_oauth_callback_options():
    """Handle CORS preflight requests for OAuth callback endpoint."""
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
            datetime.strptime(original_date, '%Y-%m-%d')
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