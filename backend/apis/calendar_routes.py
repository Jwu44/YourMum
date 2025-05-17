from flask import Blueprint, jsonify, request
from backend.db_config import get_database
import traceback
from datetime import datetime, timezone
from backend.models.task import Task
import uuid
import requests
import os
import json
from typing import List, Dict, Optional
import logging
import boto3
from firebase_admin import credentials, get_app
import firebase_admin

logger = logging.getLogger(__name__)

calendar_bp = Blueprint("calendar", __name__)

# Update the helper function to extract user ID from Firebase token
def initialize_firebase() -> Optional[firebase_admin.App]:
    """
    Initialize Firebase Admin SDK with credentials from various sources.
    
    Attempts to load credentials in this order:
    1. AWS SSM Parameter Store (if FIREBASE_CREDENTIALS_PATH is an ARN)
    2. Local file (if FIREBASE_CREDENTIALS_PATH is a valid file path)
    3. GOOGLE_APPLICATION_CREDENTIALS environment variable
    4. Project ID only (if FIREBASE_PROJECT_ID is available)
    5. Default initialization (as a last resort)
    
    Returns:
        Optional[firebase_admin.App]: Initialized Firebase app instance or None if initialization fails
    """
    # Skip initialization if already done
    try:
        return get_app()
    except ValueError:
        # App not yet initialized, continue with initialization
        pass
    
    # Get credentials path from environment variable
    ssm_parameter_path: str = os.environ.get('FIREBASE_CREDENTIALS_PATH', '')
    
    _initialize_from_ssm(ssm_parameter_path)


def _initialize_from_ssm(ssm_parameter_path: str) -> Optional[firebase_admin.App]:
    """
    Initialize Firebase using credentials stored in AWS SSM Parameter Store.
    
    Args:
        ssm_parameter_path (str): ARN of the parameter in SSM Parameter Store
        
    Returns:
        Optional[firebase_admin.App]: Initialized Firebase app instance or None if initialization fails
    """
    try:
        # Extract region and parameter name from ARN
        # ARN format: arn:aws:ssm:region:account-id:parameter/parameter-name
        parts = ssm_parameter_path.split(':')
        region = parts[3]  # Extract region from ARN
        parameter_name = parts[5].split('/', 1)[1]  # Extract parameter name
        
        # Initialize SSM client
        ssm_client = boto3.client('ssm', region_name=region)
        
        # Get parameter value
        response = ssm_client.get_parameter(
            Name=parameter_name,
            WithDecryption=True  # Decrypt if encrypted
        )
        
        creds_json = response['Parameter']['Value']
        creds_dict = json.loads(creds_json)
        
        # Initialize Firebase Admin SDK with credentials
        cred = credentials.Certificate(creds_dict)
        app = firebase_admin.initialize_app(cred)
        logger.info("Successfully initialized Firebase with credentials from SSM Parameter Store")
        return app
        
    except Exception as e:
        logger.error(f"Error retrieving Firebase credentials from SSM: {str(e)}")
        return _fallback_initialization()

def _fallback_initialization() -> Optional[firebase_admin.App]:
    """
    Attempt fallback initialization methods when primary methods fail.
    
    Returns:
        Optional[firebase_admin.App]: Initialized Firebase app instance or None if initialization fails
    """
    # Fall back to project ID if available
    project_id = os.environ.get('FIREBASE_PROJECT_ID')
    if project_id:
        try:
            app = firebase_admin.initialize_app(options={'projectId': project_id})
            logger.info(f"Initialized Firebase with project ID only: {project_id}")
            return app
        except Exception as e:
            logger.error(f"Error initializing Firebase with project ID: {str(e)}")
    
    # Last resort: default initialization
    try:
        app = firebase_admin.initialize_app()
        logger.warning("Initialized Firebase with default credentials - authentication may fail")
        return app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase with any method: {str(e)}")
        return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Verify a Firebase ID token and extract the user ID.
    
    Args:
        token (str): Firebase ID token
    
    Returns:
        Optional[str]: User ID if token is valid, None otherwise
    """
    try:
        # Ensure Firebase is initialized
        if not firebase_admin._apps:
            initialize_firebase()
            
        # Verify the token
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(token)
        
        # Extract and return user ID
        return decoded_token.get('uid')
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
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
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Invalid or missing authentication token"
            }), 401
        
        credentials = data['credentials']
        
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
                "calendar.lastSyncTime": datetime.now(timezone.utc).isoformat(),
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

@calendar_bp.route("/events", methods=["GET"])
def get_calendar_events():
    """
    Fetch Google Calendar events for a user
    
    Query parameters:
    - date: string (required) - The date to fetch events for (YYYY-MM-DD)
    
    Authorization header required with Firebase ID token
    """
    try:
        date = request.args.get('date')
        
        if not date:
            return jsonify({
                "success": False,
                "error": "Missing date parameter"
            }), 400
        
        # Get user ID from token
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Invalid or missing authentication token"
            }), 401
        
        # Get database instance
        db = get_database()
        users = db['users']
        
        # Get user with calendar credentials
        user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        if not user.get('calendar', {}).get('connected') or not user.get('calendar', {}).get('credentials'):
            return jsonify({
                "success": False,
                "error": "User not connected to Google Calendar"
            }), 400
        
        # Format date for API request (start and end of day)
        try:
            start_date = f"{date}T00:00:00Z"
            end_date = f"{date}T23:59:59Z"
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid date format. Use YYYY-MM-DD"
            }), 400
        
        # Get credentials
        credentials = user['calendar']['credentials']
        
        # Call MCP server to fetch events
        tasks = fetch_calendar_events(credentials, start_date, end_date)
        
        # Store the events in the database for this user and date
        store_schedule_for_user(user_id, date, tasks)
        
        return jsonify({
            "success": True,
            "data": tasks
        })
        
    except Exception as e:
        print(f"Error fetching Google Calendar events: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to fetch Google Calendar events: {str(e)}"
        }), 500

def fetch_calendar_events(credentials: Dict, start_date: str, end_date: str) -> List[Dict]:
    """
    Fetch calendar events from the Google Calendar MCP server
    
    Args:
        credentials: User's Google Calendar credentials
        start_date: Start date for events fetch (ISO string)
        end_date: End date for events fetch (ISO string)
        
    Returns:
        List of Task objects
    """
    # MCP server URL from config
    MCP_SERVER_URL = os.getenv(
        "GOOGLE_CALENDAR_MCP_URL", 
        "https://mcp.pipedream.net/6ea7852a-7ca6-40c6-8c97-33ab3dfa6663/google_calendar"
    )
    
    try:
        # Call MCP server to fetch events
        response = requests.post(MCP_SERVER_URL, json={
            "action": "getEvents",
            "accessToken": credentials['accessToken'],
            "timeMin": start_date,
            "timeMax": end_date
        })
        
        # Check for successful response
        response.raise_for_status()
        
        # Parse response
        events_data = response.json()
        
        if not events_data or not events_data.get('items'):
            return []
        
        # Convert events to tasks
        tasks = []
        for event in events_data['items']:
            task = Task(
                id=str(uuid.uuid4()),
                text=event['summary'],
                completed=False,
                start_time=event.get('start', {}).get('dateTime'),
                end_time=event.get('end', {}).get('dateTime'),
                gcal_event_id=event['id'],
                is_recurring=None,  # Can be set based on recurrence data if available
                type="event"
            )
            tasks.append(task.to_dict())
        
        return tasks
        
    except requests.RequestException as e:
        print(f"Error calling MCP server: {e}")
        raise Exception(f"Failed to call MCP server: {str(e)}")

def store_schedule_for_user(user_id: str, date: str, tasks: List[Dict]):
    """
    Store the schedule for a user on a specific date
    
    Args:
        user_id: User's Google ID
        date: Date string (YYYY-MM-DD)
        tasks: List of task objects to store
    """
    try:
        # Get database instance
        db = get_database()
        schedules = db['schedules']
        
        # Update or insert schedule for user and date
        result = schedules.update_one(
            {
                "userId": user_id,
                "date": date
            },
            {
                "$set": {
                    "tasks": tasks,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return result.modified_count > 0 or result.upserted_id is not None
        
    except Exception as e:
        print(f"Error storing schedule: {e}")
        traceback.print_exc()
        return False