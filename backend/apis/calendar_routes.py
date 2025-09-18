from flask import Blueprint, jsonify, request
from backend.db_config import get_database
import traceback
from datetime import datetime, timezone, timedelta
import uuid
import requests
import os
import json
from typing import List, Dict, Optional, Tuple
# urllib.parse imports removed - no longer needed after OAuth route cleanup
from firebase_admin import credentials, get_app
import firebase_admin
from backend.services.calendar_service import convert_calendar_event_to_task
from backend.services.schedule_service import schedule_service
from backend.services.event_bus import event_bus
import pytz  # Add pytz for timezone handling
from backend.utils.auth import get_user_id_from_token as auth_get_user_id_from_token
from backend.utils.timezone import get_user_timezone_for_date_calculation, get_reliable_user_timezone

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
    """Backwards-compatible shim to centralized auth utility."""
    return auth_get_user_id_from_token(token)

@calendar_bp.route("/oauth-exchange", methods=["POST"])
def oauth_exchange():
    """
    Exchange Google OAuth authorization code for access and refresh tokens
    
    This endpoint handles direct Google OAuth flow to obtain refresh tokens,
    which Firebase Auth doesn't provide. Essential for long-term calendar access.
    
    Expected request body:
    {
        "authorization_code": str
    }
    
    Authorization header required with Firebase ID token
    """
    try:
        data = request.json
        if not data or 'authorization_code' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: authorization_code"
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
        
        authorization_code = data['authorization_code']
        
        # Get Google OAuth credentials from environment
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.getenv('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:3000/integrations/calendar/callback')
        
        if not client_id or not client_secret:
            return jsonify({
                "success": False,
                "error": "Google OAuth credentials not configured"
            }), 500
        
        print(f"DEBUG: Exchanging authorization code for user {user_id}")
        
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
        
        # Extract tokens and calculate expiry
        access_token = token_json.get('access_token')
        refresh_token = token_json.get('refresh_token')
        expires_in = token_json.get('expires_in', 3600)
        scope = token_json.get('scope', '')
        
        if not access_token:
            return jsonify({
                "success": False,
                "error": "No access token received from Google"
            }), 400
        
        if not refresh_token:
            print("WARNING: No refresh token received from Google. User may need to re-consent.")
        
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        scopes = scope.split(' ') if scope else []
        
        # Create credentials object
        credentials = {
            'accessToken': access_token,
            'refreshToken': refresh_token or "",  # Ensure refreshToken is never None to satisfy MongoDB schema
            'expiresAt': expires_at,
            'scopes': scopes
        }
        
        print(f"DEBUG: Received tokens - access: {bool(access_token)}, refresh: {bool(refresh_token)}")
        
        # Store credentials in database
        db = get_database()
        users = db['users']
        
        update_result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                "calendar.connected": True,
                "calendar.credentials": credentials,
                "calendar.syncStatus": "completed",
                "calendar.lastSyncTime": datetime.now(timezone.utc),
                "calendarSynced": True,
                "metadata.lastModified": datetime.now(timezone.utc)
            }}
        )
        
        if update_result.modified_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        print(f"DEBUG: Successfully stored OAuth tokens for user {user_id}")
        
        return jsonify({
            "success": True,
            "credentials": {
                "accessToken": access_token,
                "refreshToken": refresh_token,
                "expiresAt": expires_at.isoformat(),
                "scopes": scopes
            },
            "connected": True
        })
        
    except Exception as e:
        print(f"Error in OAuth token exchange: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to exchange OAuth tokens: {str(e)}"
        }), 500

def fetch_google_calendar_events(access_token: str, date: str, user_timezone: str = "Australia/Sydney") -> List[Dict]:
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
            print(f"Invalid timezone '{user_timezone}', falling back to Australia/Sydney")
            user_tz = pytz.timezone('Australia/Sydney')
            
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
        elif response.status_code == 401:
            # Bubble up 401 via special exception to allow caller to refresh & retry
            raise PermissionError("Unauthorized")
        else:
            print(f"Google Calendar API error: {response.status_code} - {response.text}")
            return []
            
    except PermissionError:
        # Do not swallow permission errors; callers handle refresh and retry
        raise
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        traceback.print_exc()
        return []

# Use unified conversion from backend.services.calendar_service

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
        verification_user = users.find_one({"googleId": user_id}, {"_id": 0})
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

@calendar_bp.route("/events", methods=["GET"])
def get_calendar_events():
    """
    Fetch Google Calendar events for a user and convert them to tasks
    
    GET method only:
    - Query parameters: date (YYYY-MM-DD)
    - Requires Authorization header with Firebase ID token
    - Merges calendar events with existing schedule and returns complete merged schedule

    Returns standardized response with calendar events merged into schedule
    """
    try:
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
        user = users.find_one({"googleId": user_id}, {"_id": 0})
        
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found",
                "tasks": []
            }), 404
        
        calendar_data = user.get('calendar', {})
        if not calendar_data.get('connected') or not calendar_data.get('credentials'):
            return jsonify({
                "success": False,
                "error": "Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.",
                "tasks": []
            }), 400
        
        # Get access token via centralized helper (handles refresh if needed)
        credentials_data = calendar_data.get('credentials', {})
        access_token = _ensure_access_token_valid(users, user_id, credentials_data)
        if not access_token:
            return jsonify({
                "success": False,
                "error": "No valid access token",
                "tasks": []
            }), 400
        
        # Get user's timezone using robust fallback logic
        query_timezone = request.args.get('timezone')
        stored_timezone = user.get('timezone')
        # Prefer stored timezone, then query timezone, with reliable fallback
        candidate_timezone = stored_timezone or query_timezone
        user_timezone = get_reliable_user_timezone(candidate_timezone)
        
        # Fetch events from Google Calendar with timezone-aware boundaries
        try:
            calendar_events = fetch_google_calendar_events(access_token, date, user_timezone)
        except PermissionError:
            # 401: Access token may have expired, try refreshing through centralized function
            print(f"🔄 Calendar API returned 401 for user {user_id}, attempting token refresh")
            refreshed_token = _refresh_access_token(users, user_id, credentials_data,
                                                  credentials_data.get('refreshToken', ''))
            if refreshed_token:
                try:
                    calendar_events = fetch_google_calendar_events(refreshed_token, date, user_timezone)
                    print(f"✅ Calendar events fetched successfully after token refresh for user {user_id}")
                except PermissionError:
                    print(f"❌ Calendar API still returning 401 after refresh for user {user_id}")
                    return jsonify({
                        "success": False,
                        "error": "Failed to refresh access token",
                        "tasks": []
                    }), 400
            else:
                # No valid token available; return error to trigger re-authentication
                return jsonify({
                    "success": False,
                    "error": "Calendar access token expired and refresh failed. Please reconnect your calendar.",
                    "tasks": []
                }), 400
        
        # Convert events to tasks
        calendar_tasks = []
        for event in calendar_events:
            task_data = convert_calendar_event_to_task(event, date)
            if task_data:
                calendar_tasks.append(task_data)
        
        # Merge with existing schedule and return complete merged schedule
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
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to fetch Google Calendar events: {str(e)}",
            "tasks": []
        }), 500

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
        user = users.find_one({"googleId": user_id}, {"_id": 0})
        
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

        # Compute today's date in user's timezone using robust timezone calculation
        user_timezone = get_user_timezone_for_date_calculation(user)
        try:
            tz = pytz.timezone(user_timezone)
        except Exception:
            # Fallback to Australia/Sydney, never UTC for user operations
            tz = pytz.timezone('Australia/Sydney')
        now_local = datetime.now(tz)
        date_str = now_local.strftime('%Y-%m-%d')

        # Fetch and convert
        events = fetch_google_calendar_events(access_token, date_str, user_timezone)
        calendar_tasks = []
        for ev in events:
            task = convert_calendar_event_to_task(ev, date_str)
            if task:
                calendar_tasks.append(task)

        # Persist via schedule service using webhook-specific merge rules
        success, _ = schedule_service.apply_calendar_webhook_update(
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
    """
    Ensure access token is valid; refresh if needed. Returns access_token or None.
    Enhanced for single OAuth flow with better error handling and logging.

    Args:
        users: MongoDB users collection
        user_id: User's Google ID
        credentials_data: Calendar credentials from user document

    Returns:
        Valid access token or None if unable to obtain one
    """
    access_token = credentials_data.get('accessToken')
    if not access_token:
        print(f"⚠️ No access token found for user {user_id}")
        return None

    expires_at = credentials_data.get('expiresAt')
    refresh_token = credentials_data.get('refreshToken') or credentials_data.get('refresh_token')

    # Enhanced logging for single OAuth flow validation
    has_refresh = bool(refresh_token)
    print(f"🔍 Token validation for user {user_id}: has_refresh={has_refresh}")

    # Normalize expiresAt with enhanced error handling
    expires_dt = None
    try:
        if isinstance(expires_at, (int, float)):
            # Handle both millisecond and second timestamps
            ts_seconds = expires_at / 1000 if expires_at > 1e12 else expires_at
            expires_dt = datetime.fromtimestamp(ts_seconds, tz=timezone.utc)
        elif isinstance(expires_at, datetime):
            expires_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        elif isinstance(expires_at, str):
            # Handle ISO string format from single OAuth flow
            expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    except Exception as e:
        print(f"⚠️ Failed to parse expiresAt for user {user_id}: {expires_at}, error: {e}")
        expires_dt = None

    # If we have no expiry info but have access token, give it a chance to work
    # This handles cases where tokens might still be valid despite missing metadata
    if not expires_dt and access_token:
        print(f"🔍 No expiry info for access token, allowing API call to test validity")
        return access_token

    # Check if token is expired and handle refresh
    now_utc = datetime.now(timezone.utc)
    if expires_dt and expires_dt < now_utc:
        time_since_expired = now_utc - expires_dt
        print(f"⏰ Access token expired {time_since_expired.total_seconds():.0f}s ago for user {user_id}")

        if not refresh_token:
            print(f"❌ Access token expired but no refresh token available for user {user_id} - need re-authentication")
            return None

        # Attempt token refresh
        return _refresh_access_token(users, user_id, credentials_data, refresh_token)

    # Token is still valid
    if expires_dt:
        time_until_expiry = expires_dt - now_utc
        print(f"✅ Access token valid for user {user_id}, expires in {time_until_expiry.total_seconds():.0f}s")

    return access_token


def _refresh_access_token(users, user_id: str, credentials_data: Dict[str, any], refresh_token: str) -> Optional[str]:
    """
    Refresh access token using refresh token from single OAuth flow.

    Args:
        users: MongoDB users collection
        user_id: User's Google ID
        credentials_data: Current calendar credentials
        refresh_token: Valid refresh token

    Returns:
        New access token or None if refresh fails
    """
    try:
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

        if not client_id or not client_secret:
            print(f"❌ Missing OAuth client credentials for token refresh")
            return None

        print(f"🔄 Attempting to refresh access token for user {user_id}")

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
                new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

                # Update stored credentials with new token
                updated_credentials = {
                    **credentials_data,
                    "accessToken": new_access_token,
                    "expiresAt": new_expires_at
                }

                # Preserve refresh token and other fields from single OAuth flow
                if 'tokenType' not in updated_credentials:
                    updated_credentials['tokenType'] = 'Bearer'

                users.update_one(
                    {"googleId": user_id},
                    {"$set": {
                        "calendar.credentials": updated_credentials,
                        "calendar.lastSyncTime": datetime.now(timezone.utc)
                    }}
                )

                print(f"✅ Successfully refreshed access token for user {user_id}, expires in {expires_in}s")
                return new_access_token
            else:
                print(f"❌ Token refresh response missing access_token for user {user_id}")
                return None
        else:
            error_text = token_resp.text
            print(f"❌ Token refresh failed for user {user_id}: {token_resp.status_code} - {error_text}")

            # Check for specific error types that require re-authentication
            if token_resp.status_code == 400 and 'invalid_grant' in error_text:
                print(f"🔑 Refresh token invalid for user {user_id} - user needs to re-authenticate")

            return None

    except Exception as e:
        print(f"❌ Token refresh exception for user {user_id}: {str(e)}")
        traceback.print_exc()
        return None


# Backend OAuth routes removed - authentication now handled entirely through Firebase
# The /connect endpoint below accepts Google credentials extracted from Firebase Auth
# This eliminates the double SSO issue where users were redirected to Railway domain


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