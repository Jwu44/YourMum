from flask import Blueprint, jsonify, request
from backend.db_config import get_database
import traceback
from datetime import datetime, timezone
from backend.models.task import Task
import uuid
import requests
import os
import json
from typing import List, Dict, Optional, Tuple
from firebase_admin import credentials, get_app
import firebase_admin
from backend.services.ai_service import categorize_task
from backend.services.schedule_service import schedule_service
import pytz  # Add pytz for timezone handling

calendar_bp = Blueprint("calendar", __name__)

def initialize_firebase() -> Optional[firebase_admin.App]:
    """Initialize Firebase Admin SDK with credentials from JSON."""
    # Check for existing app
    try:
        return get_app()
    except ValueError:
        print("Firebase not yet initialized, continuing...")
    
    # Get Firebase credentials JSON
    firebase_json = os.environ.get('FIREBASE_JSON')
    
    if not firebase_json:
        print("FIREBASE_JSON environment variable not set")
        raise ValueError("Firebase credentials not found in environment variables")
    
    try:
        # Parse the JSON string
        json_data = json.loads(firebase_json)
        
        # In Railway, the JSON is stored directly, no need for nested fields check
        creds_dict = json_data
        print("Successfully parsed Firebase credentials from JSON")
        
    except json.JSONDecodeError as e:
        print(f"Error parsing Firebase credentials JSON: {str(e)}")
        raise ValueError("Firebase credentials are not valid JSON")
    
    # Initialize Firebase with credentials
    try:
        cred = credentials.Certificate(creds_dict)
        app = firebase_admin.initialize_app(cred)
        print("Successfully initialized Firebase with credentials")
        return app
    except Exception as e:
        print(f"Firebase initialization error: {str(e)}")
        raise ValueError(f"Failed to initialize Firebase: {str(e)}")

def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Verify a Firebase ID token and extract the user ID.
    
    Args:
        token (str): Firebase ID token
    
    Returns:
        Optional[str]: User ID if token is valid, None otherwise
    """
    if not token:
        print("No token provided for verification")
        return None
    
    # Development bypass
    if os.getenv('NODE_ENV') == 'development' and token == 'mock-token-for-development':
        print("DEBUG - Using development bypass for authentication")
        return 'dev-user-123'
        
    # Ensure Firebase is initialized
    if not firebase_admin._apps:
        app = initialize_firebase()
        if not app:
            print("Cannot verify token: Firebase initialization failed")
            return None
    
    try:
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(token)
        print(f"DEBUG - Token verification successful. User ID: {decoded_token.get('uid')}")
        return decoded_token.get('uid')
    except Exception as e:
        print(f"DEBUG - Token verification error: {str(e)}")
        print(f"DEBUG - Exception type: {type(e).__name__}")
        traceback.print_exc()
        return None

def fetch_google_calendar_events(access_token: str, date: str, user_timezone: str = "UTC") -> List[Dict]:
    """
    Fetch Google Calendar events for a specific date using the access token.
    
    Args:
        access_token (str): Google Calendar access token
        date (str): Date in YYYY-MM-DD format
        user_timezone (str): User's timezone in IANA format (e.g., 'Australia/Sydney')
    
    Returns:
        List[Dict]: List of calendar events
    """
    try:
        # Convert date boundaries to user's timezone for precise event fetching
        # This prevents timezone issues like fetching tomorrow's events for today
        try:
            user_tz = pytz.timezone(user_timezone)
        except pytz.UnknownTimeZoneError:
            print(f"Invalid timezone '{user_timezone}', falling back to UTC")
            user_tz = pytz.UTC
            
        utc_tz = pytz.UTC
        
        # Create start and end of day in user's timezone
        start_local = user_tz.localize(datetime.strptime(f"{date} 00:00:00", "%Y-%m-%d %H:%M:%S"))
        end_local = user_tz.localize(datetime.strptime(f"{date} 23:59:59", "%Y-%m-%d %H:%M:%S"))
        
        # Convert to UTC for Google Calendar API
        start_utc = start_local.astimezone(utc_tz)
        end_utc = end_local.astimezone(utc_tz)
        
        # Format for RFC3339 (Google Calendar API format)
        start_time = start_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
        end_time = end_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        print(f"DEBUG: Fetching events for {date} in timezone {user_timezone}")
        print(f"DEBUG: Local time range: {start_local} to {end_local}")
        print(f"DEBUG: UTC time range: {start_time} to {end_time}")
        
        # Google Calendar API endpoint
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        
        # Request parameters
        params = {
            'timeMin': start_time,
            'timeMax': end_time,
            'singleEvents': True,
            'orderBy': 'startTime'
        }
        
        # Request headers
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        
        # Make the API request
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code == 200:
            events_data = response.json()
            return events_data.get('items', [])
        else:
            print(f"Google Calendar API error: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        traceback.print_exc()
        return []

def convert_calendar_event_to_task(event: Dict, date: str) -> Optional[Dict]:
    """
    Convert a Google Calendar event to a Task object.
    
    Args:
        event (Dict): Google Calendar event data
    
    Returns:
        Optional[Dict]: Task object dictionary or None if conversion fails
    """
    try:
        # Extract event title
        title = event.get('summary', 'Untitled Event')
        
        # Skip if no title or if it's a declined event
        if not title or event.get('status') == 'cancelled':
            return None
        
        # Categorize the event using existing AI service
        categories = categorize_task(title)
        
        # Extract start and end times
        start_time = None
        end_time = None
        
        start_data = event.get('start', {})
        end_data = event.get('end', {})
        
        # Handle both dateTime and date fields (all-day events vs timed events)
        if 'dateTime' in start_data:
            start_dt = datetime.fromisoformat(start_data['dateTime'].replace('Z', '+00:00'))
            start_time = start_dt.strftime('%H:%M')
        
        if 'dateTime' in end_data:
            end_dt = datetime.fromisoformat(end_data['dateTime'].replace('Z', '+00:00'))
            end_time = end_dt.strftime('%H:%M')
        
        # Create Task object
        task_data = {
            'id': str(uuid.uuid4()),
            'text': title,
            'categories': categories,
            'completed': False,
            'is_subtask': False,
            'is_section': False,
            'section': None,
            'parent_id': None,
            'level': 0,
            'section_index': 0,
            'type': 'task',
            'start_time': start_time,
            'end_time': end_time,
            'is_recurring': None,
            'start_date': date,
            'gcal_event_id': event.get('id'),  # Store original event ID for reference
            'from_gcal': True  # Flag to identify calendar-sourced tasks
        }
        
        return task_data
        
    except Exception as e:
        print(f"Error converting calendar event to task: {e}")
        traceback.print_exc()
        return None

@calendar_bp.route("/connect", methods=["POST"])
def connect_google_calendar():
    """
    Connect a user to Google Calendar after authorization
    
    Expected request body:
    {
        "credentials": {
            "accessToken": str,
            "refreshToken": str (optional),
            "expiresAt": int,
            "scopes": List[str]
        }
    }
    
    Authorization header required with Firebase ID token
    """
    try:
        data = request.json
        if not data or 'credentials' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400
        
        # Get user ID from token
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
        else:
            token = auth_header
            
        user_id = get_user_id_from_token(token)
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Invalid or missing authentication token"
            }), 401
        
        credentials = data['credentials']
        
        # Convert expiresAt timestamp to datetime object
        if 'expiresAt' in credentials and isinstance(credentials['expiresAt'], (int, float)):
            credentials['expiresAt'] = datetime.fromtimestamp(credentials['expiresAt']/1000, tz=timezone.utc)
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Update user with calendar credentials
        result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                "calendar.connected": True,
                "calendar.credentials": credentials,
                "calendar.syncStatus": "completed",
                "calendar.lastSyncTime": datetime.now(timezone.utc),
                "calendarSynced": True
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        return jsonify({
            "success": True,
            "data": {
                "connected": True,
                "syncStatus": "completed"
            }
        })
        
    except Exception as e:
        print(f"Error connecting to Google Calendar: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to connect to Google Calendar: {str(e)}"
        }), 500

@calendar_bp.route("/disconnect", methods=["POST"])
def disconnect_google_calendar():
    """
    Disconnect a user's Google Calendar integration
    
    Expected request body:
    {
        "userId": str
    }
    
    Returns:
        JSON response with status of disconnection
    """
    try:
        data = request.json
        if not data or 'userId' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: userId"
            }), 400
        
        user_id = data['userId']
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Update user to remove calendar credentials and connection
        result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                "calendar.connected": False,
                "calendar.credentials": None,
                "calendar.syncStatus": "disconnected",
                "calendar.lastSyncTime": datetime.now(timezone.utc),
                "calendarSynced": False
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        return jsonify({
            "success": True,
            "data": {
                "connected": False,
                "syncStatus": "disconnected"
            }
        })
        
    except Exception as e:
        print(f"Error disconnecting from Google Calendar: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to disconnect from Google Calendar: {str(e)}"
        }), 500

def store_schedule_for_user(user_id: str, date: str, calendar_tasks: List[Dict]) -> Tuple[bool, Optional[Dict]]:
    """
    Store or update calendar tasks for a user on a specific date.
    Uses centralized schedule service for consistent calendar sync operations.
    
    Args:
        user_id: User's Google ID or Firebase UID
        date: Date in YYYY-MM-DD format
        calendar_tasks: List of calendar task objects to store
        
    Returns:
        Tuple of (success: bool, merged_schedule_result: Optional[Dict])
        where merged_schedule_result contains the complete merged schedule on success
    """
    try:
        # Use centralized calendar sync service
        success, result = schedule_service.create_schedule_from_calendar_sync(
            user_id=user_id,
            date=date,
            calendar_tasks=calendar_tasks
        )
        
        if not success:
            print(f"Error storing calendar schedule: {result.get('error', 'Unknown error')}")
            return False, None
        
        return True, result
        
    except Exception as e:
        print(f"Error storing calendar schedule: {e}")
        traceback.print_exc()
        return False, None

@calendar_bp.route("/events", methods=["GET", "POST"])
def get_calendar_events():
    """
    Fetch Google Calendar events for a user and convert them to tasks
    
    GET method: 
    - Query parameters: date (YYYY-MM-DD)
    - Requires Authorization header with Firebase ID token
    - Merges calendar events with existing schedule and returns complete merged schedule
    
    POST method:
    - Request body: { "userId": str, "date": str }
    - Direct user ID-based authentication
    - Returns only calendar events without merging
    
    Returns standardized response with calendar events as tasks
    """
    try:
        # Determine request type and extract parameters
        is_post_request = request.method == "POST"
        
        if is_post_request:
            # Extract from POST body
            data = request.json
            if not data:
                return jsonify({
                    "success": False,
                    "error": "Missing request body"
                }), 400
                
            user_id = data.get('userId')
            date = data.get('date')
            
            if not user_id or not date:
                return jsonify({
                    "success": False,
                    "error": "Missing required parameters: userId and date"
                }), 400
        else:
            # Extract from GET query parameters
            date = request.args.get('date')
            if not date:
                return jsonify({
                    "success": False,
                    "error": "Missing date parameter"
                }), 400
                
            # Get user ID from token
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
            else:
                token = auth_header
            
            user_id = get_user_id_from_token(token)
            if not user_id:
                return jsonify({
                    "success": False,
                    "error": "Invalid or missing authentication token"
                }), 401
        
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Get user with calendar credentials
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found",
                "tasks": []
            }), 404 if not is_post_request else 200
        
        calendar_data = user.get('calendar', {})
        if not calendar_data.get('connected') or not calendar_data.get('credentials'):
            return jsonify({
                "success": False,
                "error": "Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.",
                "tasks": []
            }), 400 if not is_post_request else 200
        
        # Get access token from stored credentials
        access_token = calendar_data['credentials'].get('accessToken')
        if not access_token:
            return jsonify({
                "success": False,
                "error": "No valid access token found",
                "tasks": []
            }), 400 if not is_post_request else 200
        
        # Get user's timezone (with fallback to UTC)
        user_timezone = user.get('timezone', 'UTC')
        
        # Fetch events from Google Calendar with timezone-aware boundaries
        calendar_events = fetch_google_calendar_events(access_token, date, user_timezone)
        
        # Convert events to tasks
        calendar_tasks = []
        for event in calendar_events:
            task_data = convert_calendar_event_to_task(event, date)
            if task_data:
                calendar_tasks.append(task_data)
        
        # Handle GET vs POST request differences
        if not is_post_request:
            # For GET requests: merge with existing schedule and return complete merged schedule
            store_success, merged_result = store_schedule_for_user(user_id, date, calendar_tasks)
            
            if store_success and merged_result:
                # Return complete merged schedule
                response = {
                    "success": True,
                    "tasks": merged_result.get('schedule', []),
                    "count": len(merged_result.get('schedule', [])),
                    "date": date,
                    "calendar_events_added": len(calendar_tasks),
                    "metadata": merged_result.get('metadata', {})
                }
            else:
                # Fallback to calendar tasks only if merge failed
                response = {
                    "success": True,
                    "tasks": calendar_tasks,
                    "count": len(calendar_tasks),
                    "date": date,
                    "calendar_events_added": len(calendar_tasks),
                    "merge_failed": True
                }
        else:
            # For POST requests: return only calendar events (no merging)
            response = {
                "success": True,
                "tasks": calendar_tasks,
                "count": len(calendar_tasks),
                "date": date
            }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to fetch Google Calendar events: {str(e)}",
            "tasks": []
        }), 500 if request.method == "GET" else 200

@calendar_bp.route("/status/<user_id>", methods=["GET"])
def get_calendar_status(user_id: str):
    """
    Get the calendar connection status for a user
    
    Args:
        user_id: User's Google ID
    
    Returns:
        JSON response with calendar status properties directly in the response
    """
    try:
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Get user
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found",
                "connected": False,
                "syncStatus": "never",
                "lastSyncTime": None,
                "hasCredentials": False
            }), 404
        
        calendar_data = user.get('calendar', {})
        
        # Return direct structure (not nested under data)
        return jsonify({
            "success": True,
            "connected": calendar_data.get('connected', False),
            "syncStatus": calendar_data.get('syncStatus', 'never'),
            "lastSyncTime": calendar_data.get('lastSyncTime'),
            "hasCredentials": bool(calendar_data.get('credentials'))
        })
        
    except Exception as e:
        print(f"Error getting calendar status: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to get calendar status: {str(e)}",
            "connected": False,
            "syncStatus": "never",
            "lastSyncTime": None,
            "hasCredentials": False
        }), 500