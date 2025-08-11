from flask import Blueprint, jsonify, request
from backend.db_config import get_database
import traceback
from datetime import datetime, timezone, timedelta
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
from backend.services.event_bus import event_bus
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
        # Optional timezone from client (persist as user preference)
        requested_timezone = data.get('timezone')
        
        # Convert expiresAt timestamp to datetime object
        if 'expiresAt' in credentials and isinstance(credentials['expiresAt'], (int, float)):
            credentials['expiresAt'] = datetime.fromtimestamp(credentials['expiresAt']/1000, tz=timezone.utc)
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        print(f"DEBUG: Connecting calendar for user {user_id}")
        print(f"DEBUG: Calendar credentials provided: {bool(credentials.get('accessToken'))}")
        
        # Update user with calendar credentials and connection status
        update_set = {
            "calendar.connected": True,
            "calendar.credentials": credentials,
            "calendar.syncStatus": "completed",
            "calendar.lastSyncTime": datetime.now(timezone.utc),
            "calendarSynced": True,
            "metadata.lastModified": datetime.now(timezone.utc)
        }
        if isinstance(requested_timezone, str) and requested_timezone:
            update_set["timezone"] = requested_timezone

        result = users.update_one(
            {"googleId": user_id},
            {"$set": update_set}
        )
        
        print(f"DEBUG: Calendar connection update result - modified count: {result.modified_count}")
        
        if result.modified_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        # Verify the connection is actually readable before returning success
        # This ensures write consistency and prevents race conditions with /events endpoint
        verification_user = users.find_one({"googleId": user_id})
        if not verification_user:
            return jsonify({
                "success": False,
                "error": "User verification failed after connection update"
            }), 500
            
        verification_calendar = verification_user.get('calendar', {})
        if not verification_calendar.get('connected') or not verification_calendar.get('credentials'):
            return jsonify({
                "success": False,
                "error": "Calendar connection verification failed - please try again"
            }), 500
            
        print(f"DEBUG: Calendar connection verified - connection ready for API calls")

        # Ensure Google Calendar watch is established for realtime updates
        try:
            ensure_calendar_watch_for_user(user_id)
        except Exception as _e:
            # Non-fatal in v1; proceed without blocking connect
            pass
        
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
    
    Authentication:
        - Requires Authorization header with Firebase ID token
    Body:
        - No body required
        - Legacy support: will ignore any provided userId in body
    
    Returns:
        JSON response with status of disconnection
    """
    try:
        # Extract user ID from Authorization header token
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
        
        user_id = get_user_id_from_token(token)
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Invalid or missing authentication token"
            }), 401
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Update user to remove calendar credentials and connection
        result = users.update_one(
            {"googleId": user_id},
            {
                "$set": {
                    "calendar.connected": False,
                    "calendar.syncStatus": "disconnected",
                    "calendar.lastSyncTime": None,
                    "calendarSynced": False,
                    "metadata.lastModified": datetime.now(timezone.utc)
                },
                "$unset": {
                    "calendar.credentials": "",
                    "calendar.selectedCalendars": ""
                }
            }
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
        
        # Get access token and handle refresh if expired
        credentials_data = calendar_data.get('credentials', {})
        access_token = credentials_data.get('accessToken')
        if not access_token:
            return jsonify({
                "success": False,
                "error": "No valid access token found",
                "tasks": []
            }), 400 if not is_post_request else 200

        # Detect expiration, normalize expiresAt to datetime
        expires_at = credentials_data.get('expiresAt')
        refresh_token = credentials_data.get('refreshToken') or credentials_data.get('refresh_token')
        try:
            expires_dt = None
            if isinstance(expires_at, (int, float)):
                ts_seconds = expires_at / 1000 if expires_at > 1e12 else expires_at
                expires_dt = datetime.fromtimestamp(ts_seconds, tz=timezone.utc)
            elif isinstance(expires_at, datetime):
                expires_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        except Exception:
            expires_dt = None

        # If expired and refresh token present, attempt refresh
        if expires_dt and expires_dt < datetime.now(timezone.utc) and refresh_token:
            try:
                client_id = os.getenv('GOOGLE_CLIENT_ID')
                client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
                token_url = 'https://oauth2.googleapis.com/token'
                payload = {
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': client_id,
                    'client_secret': client_secret
                }
                token_resp = requests.post(token_url, data=payload)
                if token_resp.status_code == 200:
                    token_json = token_resp.json()
                    new_access_token = token_json.get('access_token')
                    expires_in = token_json.get('expires_in', 3600)
                    if new_access_token:
                        access_token = new_access_token
                        # Persist refreshed credentials
                        new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                        users.update_one(
                            {"googleId": user_id},
                            {"$set": {
                                "calendar.credentials": {
                                    **credentials_data,
                                    "accessToken": access_token,
                                    "expiresAt": new_expires_at
                                }
                            }}
                        )
                    else:
                        raise ValueError('No access_token in refresh response')
                else:
                    error_msg = f"Failed to refresh access token: {token_resp.text}"
                    return jsonify({
                        "success": False,
                        "error": error_msg,
                        "tasks": []
                    }), 400 if not is_post_request else 200
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to refresh access token: {str(e)}",
                    "tasks": []
                }), 400 if not is_post_request else 200
        
        # Get user's timezone (with fallback to query timezone or UTC)
        query_timezone = request.args.get('timezone') if not is_post_request else None
        user_timezone = user.get('timezone') or query_timezone or 'UTC'
        
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


@calendar_bp.route("/webhook", methods=["POST"])
def calendar_webhook():
    """
    Google Calendar push notification webhook.
    Validates channel headers, then fetches and syncs today's events for the user,
    and publishes a schedule_updated SSE event.
    """
    try:
        channel_id = request.headers.get('X-Goog-Channel-ID')
        resource_id = request.headers.get('X-Goog-Resource-ID')
        channel_token = request.headers.get('X-Goog-Channel-Token')

        if not channel_id or not resource_id or not channel_token:
            # Acknowledge but do nothing (avoid retries)
            return jsonify({"status": "ignored"}), 200

        # Find user by matching watch info
        db = get_database()
        users = db['users']
        user = users.find_one({
            'calendar.watch.channelId': channel_id,
            'calendar.watch.resourceId': resource_id,
            'calendar.watch.token': channel_token
        })

        if not user:
            return jsonify({"status": "no-user"}), 200

        user_id = user.get('googleId')
        calendar_data = user.get('calendar', {})
        credentials_data = calendar_data.get('credentials', {})
        if not calendar_data.get('connected') or not credentials_data:
            return jsonify({"status": "not-connected"}), 200

        # Ensure token valid
        access_token = _ensure_access_token_valid(users, user_id, credentials_data)
        if not access_token:
            return jsonify({"status": "no-token"}), 200

        # Compute today's date in user's timezone (or UTC)
        user_timezone = user.get('timezone') or 'UTC'
        try:
            tz = pytz.timezone(user_timezone)
        except Exception:
            tz = pytz.UTC
        now_local = datetime.now(tz)
        date_str = now_local.strftime('%Y-%m-%d')

        # Fetch and convert
        events = fetch_google_calendar_events(access_token, date_str, user_timezone)
        calendar_tasks = []
        for ev in events:
            task = convert_calendar_event_to_task(ev, date_str)
            if task:
                calendar_tasks.append(task)

        # Persist via schedule service
        success, _ = schedule_service.create_schedule_from_calendar_sync(
            user_id=user_id,
            date=date_str,
            calendar_tasks=calendar_tasks
        )

        # Publish realtime notification regardless of success for v1 simplicity
        try:
            event_bus.publish(user_id, {"type": "schedule_updated", "date": date_str})
        except Exception:
            pass

        return jsonify({"status": "ok", "synced": success}), 200
    except Exception as e:
        print(f"Error handling calendar webhook: {e}")
        traceback.print_exc()
        return jsonify({"status": "error"}), 200


# -----------------------------
# Google Calendar Push: Watch Management
# -----------------------------

def _parse_expiration_ms(expiration_value: str) -> Optional[datetime]:
    """Parse Google watch expiration (ms since epoch) to timezone-aware datetime."""
    try:
        ms = int(expiration_value)
        seconds = ms / 1000.0
        return datetime.fromtimestamp(seconds, tz=timezone.utc)
    except Exception:
        return None


def _ensure_access_token_valid(users, user_id: str, credentials_data: Dict[str, any]) -> Optional[str]:
    """Ensure access token is valid; refresh if needed. Returns access_token or None."""
    access_token = credentials_data.get('accessToken')
    if not access_token:
        return None

    expires_at = credentials_data.get('expiresAt')
    refresh_token = credentials_data.get('refreshToken') or credentials_data.get('refresh_token')

    # Normalize expiresAt
    try:
        expires_dt = None
        if isinstance(expires_at, (int, float)):
            ts_seconds = expires_at / 1000 if expires_at > 1e12 else expires_at
            expires_dt = datetime.fromtimestamp(ts_seconds, tz=timezone.utc)
        elif isinstance(expires_at, datetime):
            expires_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
    except Exception:
        expires_dt = None

    if expires_dt and expires_dt < datetime.now(timezone.utc) and refresh_token:
        try:
            client_id = os.getenv('GOOGLE_CLIENT_ID')
            client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
            token_url = 'https://oauth2.googleapis.com/token'
            payload = {
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
                'client_id': client_id,
                'client_secret': client_secret
            }
            token_resp = requests.post(token_url, data=payload)
            if token_resp.status_code == 200:
                token_json = token_resp.json()
                new_access_token = token_json.get('access_token')
                expires_in = token_json.get('expires_in', 3600)
                if new_access_token:
                    access_token = new_access_token
                    new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                    users.update_one(
                        {"googleId": user_id},
                        {"$set": {
                            "calendar.credentials": {
                                **credentials_data,
                                "accessToken": access_token,
                                "expiresAt": new_expires_at
                            }
                        }}
                    )
            else:
                return None
        except Exception:
            return None

    return access_token


def ensure_calendar_watch_for_user(user_id: str) -> Tuple[bool, Dict[str, any]]:
    """
    Ensure a Google Calendar watch channel exists for the user's primary calendar.
    Creates a new channel if missing or expired.
    """
    db = get_database()
    users = db['users']

    user = users.find_one({"googleId": user_id})
    if not user:
        return False, {"error": "User not found"}

    calendar_data = user.get('calendar', {})
    if not calendar_data.get('connected') or not calendar_data.get('credentials'):
        return False, {"error": "Calendar not connected"}

    credentials_data = calendar_data.get('credentials', {})

    # Ensure access token is valid
    access_token = _ensure_access_token_valid(users, user_id, credentials_data)
    if not access_token:
        return False, {"error": "No valid access token"}

    watch_info = calendar_data.get('watch') or {}
    not_expired = False
    if watch_info:
        expiration = watch_info.get('expiration')
        if isinstance(expiration, datetime):
            not_expired = expiration > datetime.now(timezone.utc)
    if watch_info and not_expired:
        return True, {"watch": {
            "channelId": watch_info.get('channelId'),
            "resourceId": watch_info.get('resourceId'),
            "expiration": watch_info.get('expiration').isoformat() if isinstance(watch_info.get('expiration'), datetime) else watch_info.get('expiration')
        }}

    # Create new watch channel via Google Calendar API
    webhook_address = os.getenv('GOOGLE_CALENDAR_WEBHOOK_URL')
    if not webhook_address:
        return False, {"error": "GOOGLE_CALENDAR_WEBHOOK_URL not configured"}

    channel_id = str(uuid.uuid4())
    channel_token = str(uuid.uuid4())

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    body = {
        'id': channel_id,
        'type': 'web_hook',
        'address': webhook_address,
        'token': channel_token
    }
    resp = requests.post(url, headers=headers, json=body)
    if resp.status_code != 200:
        return False, {"error": f"Failed to create watch: {resp.text}"}

    data = resp.json()
    expiration_dt = None
    if 'expiration' in data:
        expiration_dt = _parse_expiration_ms(data['expiration'])

    watch_doc = {
        'channelId': data.get('id', channel_id),
        'resourceId': data.get('resourceId'),
        'expiration': expiration_dt or (datetime.now(timezone.utc) + timedelta(hours=1)),
        'token': channel_token
    }

    users.update_one(
        {"googleId": user_id},
        {"$set": {"calendar.watch": watch_doc}}
    )

    return True, {"watch": {
        "channelId": watch_doc['channelId'],
        "resourceId": watch_doc['resourceId'],
        "expiration": watch_doc['expiration'].isoformat() if isinstance(watch_doc['expiration'], datetime) else watch_doc['expiration']
    }}


@calendar_bp.route("/watch/ensure", methods=["POST"])
def ensure_calendar_watch():
    """Endpoint to ensure Google Calendar push notifications are configured for current user."""
    try:
        # Get user ID from token
        auth_header = request.headers.get('Authorization', '')
        token = auth_header[7:] if auth_header.startswith('Bearer ') else auth_header
        user_id = get_user_id_from_token(token)
        if not user_id:
            return jsonify({"success": False, "error": "Invalid or missing authentication token"}), 401

        ok, result = ensure_calendar_watch_for_user(user_id)
        if not ok:
            return jsonify({"success": False, **result}), 400

        return jsonify({"success": True, **result}), 200
    except Exception as e:
        print(f"Error ensuring calendar watch: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500