"""
Integration Routes - Direct Slack Events API Integration

This module provides Flask routes for Slack integration using direct Slack Events API,
replacing Klavis AI MCP server dependency with native Slack integration.

Handles OAuth flow, webhook events, and integration management following
the architecture guidelines in CLAUDE.md and dev-guide.md principles.
"""

from flask import Blueprint, jsonify, request
from backend.db_config import get_database
import traceback
from datetime import datetime, timezone
from backend.services.schedule_service import ScheduleService
from backend.services.slack_service import SlackService
from backend.models.task import Task
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
    Initialize Slack integration OAuth flow for a user.
    
    Authorization header required with Firebase ID token.
    
    Returns:
        JSON response with OAuth URL for Slack authorization or error message
    """
    try:
        # Get user from token
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
        
        # Initiate OAuth flow via direct Slack integration
        success, result = slack_service.initiate_oauth_flow(user_id)
        
        if not success:
            return jsonify({
                "success": False,
                "error": result.get("error", "Failed to initiate OAuth flow")
            }), 500
        
        return jsonify({
            "success": True,
            "oauth_url": result["oauth_url"],
            "state": result["state"],
            "message": "OAuth flow initiated. Complete authorization to finish setup."
        }), 200
        
    except Exception as e:
        print(f"Error in connect_slack: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500


@integration_bp.route("/slack/oauth/callback", methods=["POST"])
def slack_oauth_callback():
    """
    Handle OAuth callback from Slack authorization.
    
    Authorization header required with Firebase ID token.
    Request body should contain: {"code": "...", "state": "..."}
    
    Returns:
        JSON response with completion status
    """
    try:
        # Get user from token
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
        
        # Get OAuth callback data
        request_data = request.get_json() or {}
        code = request_data.get('code')
        state = request_data.get('state')
        
        if not code or not state:
            return jsonify({
                "success": False,
                "error": "Missing required OAuth parameters (code, state)"
            }), 400
        
        # Complete OAuth flow
        success, result = slack_service.complete_oauth_flow(user_id, code, state)
        
        if not success:
            error_msg = result.get('error', 'OAuth completion failed')
            status_code = 400 if 'CSRF' in error_msg else 500
            
            return jsonify({
                "success": False,
                "error": error_msg
            }), status_code
        
        return jsonify({
            "success": True,
            "message": result["message"],
            "team_name": result.get("team_name"),
            "team_id": result.get("team_id")
        }), 200
        
    except Exception as e:
        print(f"Error in slack_oauth_callback: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500


@integration_bp.route("/slack/status", methods=["GET"])
def get_slack_status():
    """
    Get the current Slack integration status for the authenticated user with multi-workspace support.
    
    Authorization header required with Firebase ID token.
    Query parameter 'team_id' optional for specific workspace status.
    
    Returns:
        JSON response with Slack integration status
    """
    try:
        # Get user from token
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
        team_id = request.args.get('team_id')  # Optional team_id for specific workspace
        
        # Get integration status with multi-workspace support
        success, status = slack_service.get_integration_status(user_id, team_id)
        
        if not success:
            return jsonify({
                "success": False,
                "error": status.get("error", "Failed to get integration status")
            }), 500
        
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


@integration_bp.route("/slack/disconnect", methods=["POST"])
def disconnect_slack():
    """
    Disconnect Slack integration for the authenticated user with multi-workspace support.
    
    Authorization header required with Firebase ID token.
    Request body can contain optional 'team_id' for specific workspace disconnection.
    
    Returns:
        JSON response indicating success or failure of disconnection
    """
    try:
        # Get user from token
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
        
        # Get optional team_id from request body
        request_data = request.get_json() or {}
        team_id = request_data.get('team_id')  # Optional for specific workspace
        
        # Disconnect integration with multi-workspace support
        success, result = slack_service.disconnect_integration(user_id, team_id)
        
        if not success:
            return jsonify({
                "success": False,
                "error": result.get("error", "Failed to disconnect Slack integration")
            }), 500
        
        return jsonify({
            "success": True,
            "message": result["message"],
            "team_id": team_id
        }), 200
        
    except Exception as e:
        print(f"Error in disconnect_slack: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500


# New endpoint for direct Slack Events API
@integration_bp.route("/slack/events", methods=["POST"])
def slack_events():
    """
    Handle incoming Slack Events API webhooks.
    
    This endpoint receives webhook events directly from Slack Events API,
    including URL verification challenges and event callbacks.
    
    Required headers:
        X-Slack-Request-Timestamp: Request timestamp for signature verification
        X-Slack-Signature: HMAC signature for request authentication
    
    Returns:
        - Challenge string for URL verification
        - JSON response for event processing results
    """
    try:
        # Get required headers
        timestamp = request.headers.get('X-Slack-Request-Timestamp')
        signature = request.headers.get('X-Slack-Signature')
        
        if not timestamp or not signature:
            return jsonify({
                "success": False,
                "error": "Missing required headers: X-Slack-Request-Timestamp, X-Slack-Signature"
            }), 400
        
        # Get request payload
        payload = request.get_json()
        if not payload:
            return jsonify({
                "success": False,
                "error": "Missing JSON payload"
            }), 400
        
        # Process webhook event through SlackService
        success, result = slack_service.process_webhook_event(payload, timestamp, signature)
        
        if not success:
            error_msg = result.get('error', 'Unknown webhook processing error')
            
            # Determine appropriate status code based on error type
            if 'signature' in error_msg.lower() or 'unauthorized' in error_msg.lower():
                status_code = 401
            elif 'rate limit' in error_msg.lower():
                status_code = 429
            elif 'duplicate' in error_msg.lower():
                # Return success for duplicates to avoid Slack retries
                return jsonify({
                    "success": True,
                    "message": "Message already processed (duplicate)"
                }), 200
            else:
                status_code = 400
                
            return jsonify({
                "success": False,
                "error": error_msg
            }), status_code
        
        # Handle URL verification challenge
        if isinstance(result, str):
            # Return challenge string directly for URL verification
            return result, 200, {'Content-Type': 'text/plain'}
        
        # Handle Task creation from event
        if isinstance(result, Task):
            return _process_task_from_slack_event(result, payload)
        
        # Handle other successful results
        return jsonify({
            "success": True,
            "result": result
        }), 200
        
    except Exception as e:
        print(f"Error in slack_events: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500


def _process_task_from_slack_event(task: Task, payload: dict) -> tuple:
    """
    Process Task created from Slack event and add to user's schedule with multi-workspace support.
    
    Args:
        task: Task object created from Slack event (includes user_id mapping)
        payload: Original webhook payload for context
        
    Returns:
        Tuple of (response, status_code)
    """
    try:
        # Get team_id and user_id from task and payload
        team_id = payload.get('team_id')
        if not team_id:
            return jsonify({
                "success": False,
                "error": "Missing team_id in webhook payload"
            }), 400
        
        # Use the mapped yourdAI user_id from task
        user_id = getattr(task, 'user_id', None)
        if not user_id:
            return jsonify({
                "success": False,
                "error": "No yourdAI user found for this Slack workspace"
            }), 400
        
        # Get today's date for task scheduling
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Try to get existing schedule for today
        existing_success, existing_result = schedule_service.get_schedule_by_date(
            user_id, today
        )
        
        if existing_success:
            # Add task to existing schedule
            existing_tasks = existing_result.get("schedule", [])
            # Remove user_id from task dict before storing (it's not part of Task model)
            task_dict = task.to_dict()
            if hasattr(task, 'user_id'):
                delattr(task, 'user_id')  # Clean up temporary attribute
            existing_tasks.append(task_dict)
            
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
            task_dict = task.to_dict()
            if hasattr(task, 'user_id'):
                delattr(task, 'user_id')  # Clean up temporary attribute
            new_tasks = [task_dict]
            
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
        
        return jsonify({
            "success": True,
            "message": "Task created successfully from Slack message",
            "task": task_dict,
            "scheduled_date": today,
            "workspace": team_id,
            "user_id": user_id
        }), 200
        
    except Exception as e:
        print(f"Error processing task from Slack event: {e}")
        return jsonify({
            "success": False,
            "error": f"Task processing error: {str(e)}"
        }), 500


# Legacy webhook endpoint for backward compatibility
@integration_bp.route("/slack/webhook", methods=["POST"])
def slack_webhook():
    """
    Legacy webhook endpoint for backward compatibility.
    Redirects to new slack_events endpoint.
    """
    return slack_events()


# OPTIONS handlers for CORS preflight requests
@integration_bp.route("/slack/<path:endpoint>", methods=["OPTIONS"])
def handle_slack_options(endpoint):
    """Handle CORS preflight requests for Slack endpoints."""
    return jsonify({"status": "ok"}), 200


@integration_bp.route("/slack/events", methods=["OPTIONS"])
def handle_slack_events_options():
    """Handle CORS preflight requests for Slack events endpoint."""
    return jsonify({"status": "ok"}), 200


@integration_bp.route("/slack/workspaces", methods=["GET"])
def get_slack_workspaces():
    """
    Get all connected Slack workspaces for the authenticated user.
    
    Authorization header required with Firebase ID token.
    
    Returns:
        JSON response with list of connected workspaces
    """
    try:
        # Get user from token
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
        
        # Get all connected workspaces
        success, workspaces = slack_service.get_user_workspaces(user_id)
        
        if not success:
            return jsonify({
                "success": False,
                "error": "Failed to get connected workspaces"
            }), 500
        
        return jsonify({
            "success": True,
            "workspaces": workspaces,
            "total": len(workspaces)
        }), 200
        
    except Exception as e:
        print(f"Error in get_slack_workspaces: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500


# Legacy routes for backward compatibility
@integration_bp.route("/slack/oauth-status", methods=["GET"])
def check_slack_oauth_status():
    """
    Legacy OAuth status check endpoint.
    Redirects to new status endpoint.
    """
    return get_slack_status()