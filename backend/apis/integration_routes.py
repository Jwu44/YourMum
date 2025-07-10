from flask import Blueprint, jsonify, request
from backend.db_config import get_database
import traceback
from datetime import datetime, timezone
from backend.services.schedule_service import ScheduleService
from backend.services.slack_service import SlackService
import os
from backend.apis.routes import get_user_from_token

# Create Blueprint for integration routes
integration_bp = Blueprint("integrations", __name__)

# Initialize services
schedule_service = ScheduleService()
slack_service = SlackService()

@integration_bp.route("/slack/connect", methods=["POST"])
def connect_slack():
    """
    Initialize Slack integration for a user via Klavis AI.
    
    Authorization header required with Firebase ID token.
    
    Returns:
        JSON response with OAuth URL for Slack authorization or error message
    """
    try:
        # Get user from token (includes dev bypass)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
            
        user = get_user_from_token(token)
        if not user:
            return jsonify({
                "success": False,
                "error": "Invalid token or user not found"
            }), 401
        
        user_id = user.get('googleId')
        
        # Create Slack MCP server instance via Klavis AI
        success, result = slack_service.create_slack_server_instance(
            user_id=user_id,
            platform_name="yourdai"
        )
        
        if not success:
            return jsonify({
                "success": False,
                "error": result.get("error", "Failed to create Slack integration")
            }), 500
        
        # Store integration data in user document (for ALL users, including dev)
        db = get_database()
        users = db['users']
        
        slack_integration_data = {
            "connected": False,  # Will be true after OAuth completion
            "instanceId": result["instanceId"],
            "serverUrl": result["serverUrl"],
            "oauthUrl": result["oauthUrl"],
            "connectedAt": None,  # Will be set after OAuth completion
            "lastSyncTime": None
        }
        
        # Ensure user document exists and update with Slack integration data
        # Use upsert to create user if they don't exist (handles dev users)
        users.update_one(
            {"googleId": user_id},
            {
                "$set": {
                    "slack": slack_integration_data,
                    "metadata.lastModified": datetime.now(timezone.utc)
                },
                "$setOnInsert": {
                    # Create basic user document if it doesn't exist
                    "googleId": user_id,
                    "email": user.get("email", f"{user_id}@example.com"),
                    "displayName": user.get("displayName", "User"),
                    "photoURL": user.get("photoURL", ""),
                    "role": user.get("role", "free"),
                    "calendarSynced": user.get("calendarSynced", False),
                    "lastLogin": datetime.now(timezone.utc),  # Missing required field
                    "createdAt": datetime.now(timezone.utc)
                }
            },
            upsert=True  # Create document if it doesn't exist
        )
        
        return jsonify({
            "success": True,
            "oauthUrl": result["oauthUrl"],
            "message": "Slack integration initialized. Complete OAuth flow to finish setup."
        }), 200
        
    except Exception as e:
        print(f"Error in connect_slack: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@integration_bp.route("/slack/status", methods=["GET"])
def get_slack_status():
    """
    Get the current Slack integration status for the authenticated user.
    
    Authorization header required with Firebase ID token.
    
    Returns:
        JSON response with Slack integration status
    """
    try:
        # Get user from token (includes dev bypass)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
            
        user = get_user_from_token(token)
        if not user:
            return jsonify({
                "success": False,
                "error": "Invalid token or user not found"
            }), 401
        
        # Extract Slack integration data (works for all users with real data)
        slack_data = user.get("slack", {})
        
        # Prepare status response
        status = {
            "connected": slack_data.get("connected", False),
            "instanceId": slack_data.get("instanceId"),
            "serverUrl": slack_data.get("serverUrl"),
            "connectedAt": slack_data.get("connectedAt"),
            "lastSyncTime": slack_data.get("lastSyncTime")
        }
        
        return jsonify({
            "success": True,
            "status": status
        }), 200
        
    except Exception as e:
        print(f"Error in get_slack_status: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@integration_bp.route("/slack/oauth-status", methods=["GET"])
def check_slack_oauth_status():
    """
    Check if OAuth has been completed for user's Slack integration.
    
    This endpoint verifies if the Klavis server instance has completed OAuth
    and updates the user's connection status accordingly.
    
    Authorization header required with Firebase ID token.
    
    Returns:
        JSON response with OAuth completion status:
        - success: boolean indicating if check was successful
        - oauth_completed: boolean indicating if OAuth flow is complete
        - connected: boolean indicating if integration is connected
        - error: error message if check failed
    """
    try:
        # Get user from token (includes dev bypass)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
            
        user = get_user_from_token(token)
        if not user:
            return jsonify({
                "success": False,
                "error": "Invalid token or user not found"
            }), 401
        
        user_id = user.get('googleId')
        slack_data = user.get("slack", {})
        instance_id = slack_data.get("instanceId")
        
        # Check if user has Slack integration instance
        if not instance_id:
            return jsonify({
                "success": False,
                "error": "No Slack integration instance found"
            }), 400
        
        # Development bypass for OAuth completion check (skip external API call)
        if os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123':
            # Update database to simulate OAuth completion for consistent state
            if not slack_data.get("connected", False):
                _update_dev_user_connection_status(user_id)
            # Mock OAuth completion for dev user
            return jsonify({
                "success": True,
                "oauth_completed": True,
                "connected": True,
                "message": "OAuth completed (dev mode)"
            }), 200
        
        # Check OAuth completion status with Klavis AI
        success, status_result = slack_service.check_oauth_completion_status(instance_id)
        
        if not success:
            return jsonify({
                "success": False,
                "error": status_result.get("error", "Failed to check OAuth status")
            }), 500
        
        oauth_completed = status_result.get("oauth_completed", False)
        authenticated = status_result.get("authenticated", False)
        
        # If OAuth is completed and not yet marked as connected, update user status
        if oauth_completed and authenticated and not slack_data.get("connected", False):
            try:
                db = get_database()
                users = db['users']
                
                # Update user's Slack integration status
                update_result = users.update_one(
                    {"googleId": user_id},
                    {"$set": {
                        "slack.connected": True,
                        "slack.connectedAt": datetime.now(timezone.utc),
                        "slack.lastSyncTime": datetime.now(timezone.utc),
                        "metadata.lastModified": datetime.now(timezone.utc)
                    }}
                )
                
                if update_result.modified_count == 0:
                    print(f"Warning: Failed to update connection status for user {user_id}")
                    
            except Exception as update_error:
                print(f"Error updating user connection status: {update_error}")
                # Don't fail the request if database update fails
        
        return jsonify({
            "success": True,
            "oauth_completed": oauth_completed,
            "connected": oauth_completed and authenticated,
            "authenticated": authenticated
        }), 200
        
    except Exception as e:
        print(f"Error in check_slack_oauth_status: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@integration_bp.route("/slack/webhook", methods=["POST"])
def slack_webhook():
    """
    Enhanced webhook endpoint to receive @mention notifications from Klavis AI.
    """
    try:
        webhook_data = request.json
        if not webhook_data:
            return jsonify({
                "success": False,
                "error": "Missing webhook data"
            }), 400
        
        # Extract user ID from webhook data
        user_id = webhook_data.get("user_id")
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Missing user_id in webhook data"
            }), 400
        
        # Development bypass for dev users - use mock user but still process webhook
        if os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123':
            user = {
                'googleId': 'dev-user-123',
                'email': 'dev@example.com',
                'displayName': 'Dev User',
                'slack': {'connected': True}  # Mock connected slack for dev user
            }
            print(f"DEBUG: Using development bypass for webhook processing for user {user_id}")
        else:
            # Verify user exists and has Slack integration
            db = get_database()
            users = db['users']
            user = users.find_one({"googleId": user_id})
        
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        slack_data = user.get("slack", {})
        if not slack_data.get("connected", False):
            return jsonify({
                "success": False,
                "error": "Slack integration not connected for user"
            }), 400
        
        # Extract message metadata for duplicate checking
        message_data = webhook_data.get("message", {})
        message_ts = message_data.get("ts", "")
        channel_id = message_data.get("channel", "")
        
        # Check for duplicate messages (skip for dev users to avoid database operations)
        if message_ts and channel_id and not (os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123'):
            is_duplicate = slack_service.check_duplicate_message(user_id, message_ts, channel_id)
            if is_duplicate:
                return jsonify({
                    "success": True,
                    "message": "Message already processed (duplicate)",
                    "duplicate": True
                }), 200
        
        # Process webhook to create Task with enhanced validation
        success, task, error_message = slack_service.process_slack_webhook(webhook_data)
        
        if not success:
            return jsonify({
                "success": False,
                "error": error_message or "Failed to process Slack message"
            }), 400
        
        if not task:
            return jsonify({
                "success": False,
                "error": "No task created from Slack message"
            }), 400
        
        # Get today's date for task scheduling
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Get existing schedule for today
        existing_success, existing_result = schedule_service.get_schedule_by_date(user_id, today)
        
        if existing_success:
            # Add task to existing schedule
            existing_tasks = existing_result.get("schedule", [])
            existing_tasks.append(task.to_dict())
            
            # Update schedule with new task
            update_success, update_result = schedule_service.update_schedule_tasks(
                user_id=user_id,
                date=today,
                tasks=existing_tasks
            )
            
            if not update_success:
                return jsonify({
                    "success": False,
                    "error": f"Failed to add task to existing schedule: {update_result.get('error', 'Unknown error')}"
                }), 500
        else:
            # Create new schedule with the task
            new_tasks = [task.to_dict()]
            create_success, create_result = schedule_service.create_empty_schedule(
                user_id=user_id,
                date=today,
                tasks=new_tasks
            )
            
            if not create_success:
                return jsonify({
                    "success": False,
                    "error": f"Failed to create new schedule with task: {create_result.get('error', 'Unknown error')}"
                }), 500
        
        # Update user's last sync time (skip for dev users)
        if not (os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123'):
            try:
                db = get_database()
                users = db['users']
                users.update_one(
                    {"googleId": user_id},
                    {"$set": {
                        "slack.lastSyncTime": datetime.now(timezone.utc),
                        "metadata.lastModified": datetime.now(timezone.utc)
                    }}
                )
            except Exception as update_error:
                print(f"Failed to update user sync time: {update_error}")
        
        return jsonify({
            "success": True,
            "message": "Task created successfully from Slack message",
            "task": task.to_dict(),
            "scheduled_date": today
        }), 200
        
    except Exception as e:
        error_msg = f"Internal server error in slack_webhook: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

@integration_bp.route("/slack/disconnect", methods=["POST"])
def disconnect_slack():
    """
    Disconnect Slack integration for the authenticated user.
    
    Authorization header required with Firebase ID token.
    
    Returns:
        JSON response indicating success or failure of disconnection
    """
    try:
        # Get user from token (includes dev bypass)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
            
        user = get_user_from_token(token)
        if not user:
            return jsonify({
                "success": False,
                "error": "Invalid token or user not found"
            }), 401
        
        user_id = user.get('googleId')
        slack_data = user.get("slack", {})
        instance_id = slack_data.get("instanceId")
        
        if not instance_id:
            return jsonify({
                "success": False,
                "error": "No Slack integration found to disconnect"
            }), 400
        
        # Development bypass for external service calls
        if os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123':
            print(f"DEBUG: Skipping external Klavis API call for dev user {user_id}")
        else:
            # Disconnect via Slack service (non-dev users only)
            success, result = slack_service.disconnect_slack_integration(user_id, instance_id)
            
            if not success:
                return jsonify({
                    "success": False,
                    "error": result.get("error", "Failed to disconnect Slack integration")
                }), 500
        
        # Remove Slack integration data from user document (for all users)
        db = get_database()
        users = db['users']
        update_result = users.update_one(
            {"googleId": user_id},
            {
                "$unset": {"slack": ""},
                "$set": {"metadata.lastModified": datetime.now(timezone.utc)}
            }
        )
        
        if update_result.modified_count == 0:
            return jsonify({
                "success": False,
                "error": "Failed to update user document"
            }), 500
        
        return jsonify({
            "success": True,
            "message": "Slack integration disconnected successfully"
        }), 200
        
    except Exception as e:
        print(f"Error in disconnect_slack: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

# OPTIONS handler for CORS preflight requests
@integration_bp.route("/slack/<path:endpoint>", methods=["OPTIONS"])
def handle_slack_options(endpoint):
    """Handle CORS preflight requests for Slack endpoints."""
    return jsonify({"status": "ok"}), 200 

def _update_dev_user_connection_status(user_id: str) -> None:
    """
    Update development user's Slack connection status in database.
    
    Args:
        user_id: User's unique identifier (should be 'dev-user-123' for dev mode)
    """
    try:
        db = get_database()
        users = db['users']
        
        # Update user's Slack integration status
        update_result = users.update_one(
            {"googleId": user_id},
            {"$set": {
                "slack.connected": True,
                "slack.connectedAt": datetime.now(timezone.utc),
                "slack.lastSyncTime": datetime.now(timezone.utc),
                "metadata.lastModified": datetime.now(timezone.utc)
            }}
        )
        
        if update_result.modified_count == 0:
            print(f"Warning: Failed to update dev user connection status for {user_id}")
            
    except Exception as update_error:
        print(f"Error updating dev user connection status: {update_error}")
        # Don't fail on database errors in dev mode 