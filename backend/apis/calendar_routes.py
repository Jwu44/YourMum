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

def get_parameter_store_credentials(parameter_name: str = '/yourdai/firebase-credentials') -> Optional[str]:
    """
    Fetch Firebase credentials from AWS Parameter Store.
    
    Args:
        parameter_name (str): Parameter Store path to the credentials
        
    Returns:
        Optional[str]: JSON string with credentials or None if retrieval fails
    """
    print(f"Attempting to retrieve credentials from Parameter Store: {parameter_name}")
    try:
        # Initialize SSM client
        ssm = boto3.client('ssm')
        print("Created boto3 SSM client successfully")
        
        # Get the parameter with decryption for SecureString
        response = ssm.get_parameter(
            Name=parameter_name,
            WithDecryption=True
        )
        print(f"Parameter Store API response received: {response.keys() if response else 'None'}")
        
        # Return the parameter value
        if 'Parameter' in response and 'Value' in response['Parameter']:
            creds_value = response['Parameter']['Value']
            print(f"Successfully retrieved credentials from Parameter Store. Length: {len(creds_value)} chars")
            print(f"Credentials preview: {creds_value[:30]}...")
            return creds_value
        else:
            print(f"Parameter Store response missing expected structure: {response}")
            logger.error(f"Parameter Store response missing expected structure: {response}")
            return None
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        print(f"AWS ClientError: {error_code} - {error_message}")
        print(f"Full error details: {e.response}")
        if error_code == 'ParameterNotFound':
            print(f"Parameter not found in Parameter Store: {parameter_name}")
            logger.error(f"Parameter not found in Parameter Store: {parameter_name}")
        elif error_code == 'AccessDeniedException':
            print(f"Access denied to Parameter Store parameter: {parameter_name}. Check IAM permissions.")
            logger.error(f"Access denied to Parameter Store parameter: {parameter_name}. Check IAM permissions.")
        else:
            print(f"Error retrieving from Parameter Store: {str(e)}")
            logger.error(f"Error retrieving from Parameter Store: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error accessing Parameter Store: {str(e)}")
        logger.error(f"Unexpected error accessing Parameter Store: {str(e)}")
        return None

def initialize_firebase() -> Optional[firebase_admin.App]:
    """
    Initialize Firebase Admin SDK with credentials from AWS Parameter Store.
    
    Returns:
        Optional[firebase_admin.App]: Initialized Firebase app instance or None if initialization fails
    """
    print("Starting Firebase initialization...")
    # Skip initialization if already done
    try:
        app = get_app()
        print("Firebase already initialized, returning existing app")
        return app
    except ValueError:
        print("Firebase not yet initialized, continuing with initialization")
        # App not yet initialized, continue with initialization
        pass
    
    # Primary approach: Get credentials directly from Parameter Store
    print("Attempting to get credentials from Parameter Store...")
    creds_content = get_parameter_store_credentials()
    if creds_content:
        print("Retrieved credentials from Parameter Store, initializing Firebase...")
        return _initialize_with_credentials(creds_content)
        
    # Fallback: Get credentials from environment variable
    print("Parameter Store approach failed, trying environment variable...")
    creds_content = os.environ.get('FIREBASE_CREDENTIALS', '')
    print(f"FIREBASE_CREDENTIALS env var: {creds_content[:30]}..." if creds_content else "FIREBASE_CREDENTIALS env var not set or empty")
    if creds_content:
        print("Using FIREBASE_CREDENTIALS environment variable...")
        return _initialize_with_credentials(creds_content)
    
    # If all else fails, try fallback methods
    print("All primary methods failed, trying fallback initialization...")
    return _fallback_initialization()

def _initialize_with_credentials(creds_content: str) -> Optional[firebase_admin.App]:
    """
    Initialize Firebase using credentials content from environment.
    
    Args:
        creds_content (str): JSON string or path containing Firebase credentials
        
    Returns:
        Optional[firebase_admin.App]: Initialized Firebase app instance or None if initialization fails
    """
    print(f"Initializing with credentials, content length: {len(creds_content)} chars")
    try:
        # First try: Parse as JSON (for Parameter Store injection)
        if creds_content and creds_content.strip().startswith('{'):
            print("Detected JSON format credential content")
            try:
                creds_dict = json.loads(creds_content)
                print(f"Successfully parsed JSON. Keys: {creds_dict.keys()}")
                cred = credentials.Certificate(creds_dict)
                print("Certificate created successfully")
                app = firebase_admin.initialize_app(cred)
                print("Successfully initialized Firebase with credentials from JSON content")
                logger.info("Successfully initialized Firebase with credentials from Parameter Store")
                return app
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {str(e)}")
                logger.warning(f"Credential content is not valid JSON, trying as file path. Error: {str(e)}")
                
        # Second try: Check if it's a valid file path
        print(f"Checking if credential content is a file path: {creds_content}")
        if os.path.exists(creds_content):
            print(f"File exists at path: {creds_content}")
            try:
                cred = credentials.Certificate(creds_content)
                print("Certificate created successfully from file")
                app = firebase_admin.initialize_app(cred)
                print(f"Successfully initialized Firebase with credentials file: {creds_content}")
                logger.info(f"Successfully initialized Firebase with credentials file: {creds_content}")
                return app
            except Exception as e:
                print(f"Error initializing with credential file: {str(e)}")
                logger.error(f"Error initializing with credential file: {str(e)}")
        else:
            print(f"No file exists at path: {creds_content}")
        
        # If we reach here, neither approach worked
        print("Neither JSON nor file path approach worked, trying fallback initialization")
        return _fallback_initialization()
            
    except Exception as e:
        print(f"Error in credential initialization: {str(e)}")
        logger.error(f"Error in credential initialization: {str(e)}")
        return _fallback_initialization()

def _fallback_initialization() -> Optional[firebase_admin.App]:
    """
    Attempt fallback initialization methods when primary methods fail.
    
    Returns:
        Optional[firebase_admin.App]: Initialized Firebase app instance or None if initialization fails
    """
    print("Starting fallback initialization...")
    
    # Fallback 1: Check for GOOGLE_APPLICATION_CREDENTIALS environment variable
    google_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    print(f"GOOGLE_APPLICATION_CREDENTIALS env var: {google_creds}" if google_creds else "GOOGLE_APPLICATION_CREDENTIALS env var not set")
    if google_creds:
        try:
            print(f"Trying to initialize with GOOGLE_APPLICATION_CREDENTIALS: {google_creds}")
            app = firebase_admin.initialize_app()  # This will use GOOGLE_APPLICATION_CREDENTIALS automatically
            print("Successfully initialized Firebase with GOOGLE_APPLICATION_CREDENTIALS")
            logger.info("Successfully initialized Firebase with GOOGLE_APPLICATION_CREDENTIALS")
            return app
        except Exception as e:
            print(f"GOOGLE_APPLICATION_CREDENTIALS fallback failed: {str(e)}")
            logger.warning(f"GOOGLE_APPLICATION_CREDENTIALS fallback failed: {str(e)}")
            
    # Fallback 2: Use project ID if available
    project_id = os.environ.get('FIREBASE_PROJECT_ID')
    print(f"FIREBASE_PROJECT_ID env var: {project_id}" if project_id else "FIREBASE_PROJECT_ID env var not set")
    if project_id:
        try:
            print(f"Trying to initialize with project ID: {project_id}")
            app = firebase_admin.initialize_app(options={'projectId': project_id})
            print(f"Initialized Firebase with project ID only: {project_id}")
            logger.info(f"Initialized Firebase with project ID only: {project_id}")
            return app
        except Exception as e:
            print(f"Project ID fallback failed: {str(e)}")
            logger.warning(f"Project ID fallback failed: {str(e)}")
    
    # Fallback 3: Default initialization (last resort)
    try:
        print("Trying default initialization (last resort)")
        app = firebase_admin.initialize_app()
        print("Initialized Firebase with default credentials - authentication may fail")
        logger.warning("Initialized Firebase with default credentials - authentication may fail")
        return app
    except Exception as e:
        print(f"All Firebase initialization methods failed: {str(e)}")
        logger.error(f"All Firebase initialization methods failed: {str(e)}")
        return None

def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Verify a Firebase ID token and extract the user ID.
    
    Args:
        token (str): Firebase ID token
    
    Returns:
        Optional[str]: User ID if token is valid, None otherwise
    """
    print(f"Verifying user token. Token length: {len(token) if token else 0}")
    try:
        # Ensure Firebase is initialized
        if not firebase_admin._apps:
            print("Firebase not initialized yet, initializing now...")
            app = initialize_firebase()
            if app is None:
                print("Firebase initialization failed. Cannot verify token.")
                logger.error("Cannot verify token without Firebase initialization")
                return None
            print(f"Firebase initialized successfully for token verification. App name: {app.name}")
        else:
            print(f"Firebase already initialized. Available apps: {list(firebase_admin._apps.keys())}")
            
        # Import auth only when needed
        from firebase_admin import auth
        print("Imported firebase_admin.auth successfully")
        
        # DEBUG: Check for credential file env var
        google_creds = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        print(f"GOOGLE_APPLICATION_CREDENTIALS env var: {google_creds}" if google_creds else "GOOGLE_APPLICATION_CREDENTIALS env var not set")
        
        # Verify the token
        print("Attempting to verify token...")
        decoded_token = auth.verify_id_token(token)
        print(f"Token verified successfully. Token contents: {decoded_token.keys()}")
        
        # Extract and return user ID
        user_id = decoded_token.get('uid')
        print(f"Extracted user ID: {user_id}")
        return user_id
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        logger.error(f"Token verification error: {str(e)}")
        # Add stack trace for better debugging
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
            
        print(f"Extracted token from Authorization header. Token length: {len(token) if token else 0}")
        
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
            
        print(f"Extracted token from Authorization header. Token length: {len(token) if token else 0}")
        
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