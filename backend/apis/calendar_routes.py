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
from firebase_admin import credentials, get_app
import firebase_admin
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

calendar_bp = Blueprint("calendar", __name__)

def get_firebase_credentials() -> Optional[Dict]:
    """
    Fetch Firebase credentials from AWS Parameter Store.
    
    Returns:
        Optional[Dict]: Firebase credentials as dict or None if retrieval fails
    """
    parameter_name = 'yourdai/firebase-credentials'
    logger.info(f"Retrieving Firebase credentials from Parameter Store: {parameter_name}")
    
    try:
        # Log AWS region and configuration
        import boto3
        session = boto3.session.Session()
        region = session.region_name
        logger.info(f"AWS Session region: {region}")
        
        ssm = boto3.client('ssm')
        logger.info("SSM client created, attempting to get parameter")
        response = ssm.get_parameter(Name=parameter_name, WithDecryption=True)
        logger.info("Parameter retrieved successfully")
        
        if 'Parameter' in response and 'Value' in response['Parameter']:
            creds_json = response['Parameter']['Value']
            logger.info("Firebase credentials retrieved successfully from Parameter Store")
            return json.loads(creds_json)
        else:
            logger.error(f"Parameter Store response missing expected structure: {response}")
            return None
            
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        logger.error(f"AWS ClientError: {error_code} - {error_message}")
        
        if error_code == 'AccessDeniedException':
            logger.error("Access denied to Parameter Store. Check IAM permissions.")
        
        # Log instance metadata for debugging IAM role issues
        try:
            import requests
            metadata_url = "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
            r = requests.get(metadata_url, timeout=2)
            logger.info(f"Instance IAM role: {r.text}")
        except Exception as meta_e:
            logger.error(f"Failed to retrieve instance metadata: {str(meta_e)}")
            
        return None
    except Exception as e:
        logger.error(f"Error retrieving Firebase credentials: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

def initialize_firebase() -> Optional[firebase_admin.App]:
    """
    Initialize Firebase Admin SDK with credentials from AWS Parameter Store.
    
    Returns:
        Optional[firebase_admin.App]: Firebase app instance or None if initialization fails
    """
    # Return existing app if already initialized
    try:
        return get_app()
    except ValueError:
        logger.info("Firebase not yet initialized, continuing...")
    
    # Get credentials and initialize
    creds_dict = get_firebase_credentials()
    if creds_dict:
        try:
            cred = credentials.Certificate(creds_dict)
            return firebase_admin.initialize_app(cred)
        except Exception as e:
            logger.error(f"Firebase initialization error: {str(e)}")
            return None
    
    # Fallback to environment variable if Parameter Store fails
    creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if creds_path and os.path.exists(creds_path):
        try:
            return firebase_admin.initialize_app()
        except Exception as e:
            logger.error(f"Firebase initialization with GOOGLE_APPLICATION_CREDENTIALS failed: {str(e)}")
    
    logger.error("Firebase initialization failed: No valid credentials found")
    return None

def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Verify a Firebase ID token and extract the user ID.
    
    Args:
        token (str): Firebase ID token
    
    Returns:
        Optional[str]: User ID if token is valid, None otherwise
    """
    if not token:
        logger.error("No token provided for verification")
        return None
        
    # Ensure Firebase is initialized
    if not firebase_admin._apps:
        app = initialize_firebase()
        if not app:
            logger.error("Cannot verify token: Firebase initialization failed")
            return None
    
    try:
        from firebase_admin import auth
        print(f"DEBUG - Attempting to verify token with Firebase")
        print(f"DEBUG - Firebase apps initialized: {firebase_admin._apps}")
        decoded_token = auth.verify_id_token(token)
        print(f"DEBUG - Token verification successful. User ID: {decoded_token.get('uid')}")
        return decoded_token.get('uid')
    except Exception as e:
        print(f"DEBUG - Token verification error: {str(e)}")
        print(f"DEBUG - Exception type: {type(e).__name__}")
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
        
        # Get user ID from token - FIX: Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
        else:
            token = auth_header
            
        print(f"Extracted token from Authorization header. Token: {token}")
        
        user_id = get_user_id_from_token(token)
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
        
        # Get user ID from token - FIX: Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
        else:
            token = auth_header
            
        print(f"DEBUG - FULL TOKEN: {token}")
        print(f"DEBUG - Auth header: {auth_header}")
        print(f"DEBUG - Request body: {request.json}")
        
        user_id = get_user_id_from_token(token)
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