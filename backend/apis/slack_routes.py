"""
Slack Integration Routes
API endpoints for Slack OAuth, webhook handling, and integration management
"""

import os
import json
import asyncio
from datetime import datetime
from flask import Blueprint, request, jsonify, redirect, url_for
from urllib.parse import urlencode
from typing import Dict, Any, Optional

from backend.db_config import get_database
from backend.services.slack_service import SlackService
from backend.services.event_bus import event_bus
from backend.services.slack_message_processor import SlackMessageProcessor
from backend.apis.routes import get_user_from_token

# Use an explicit frontend URL (prefer these envs, fallback to dev Next port)
frontend_base_url = os.getenv('NEXT_PUBLIC_FRONTEND_URL') or 'http://localhost:8000'

# Create blueprint
slack_bp = Blueprint("slack_integration", __name__)

# Initialize services
db_client = get_database()
message_processor = SlackMessageProcessor()
slack_service = SlackService(db_client=db_client, message_processor=message_processor)


def extract_user_from_request() -> tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Extract user ID from Firebase token in request headers
    
    Returns:
        Tuple of (user_id, error_response)
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, {
            "success": False,
            "error": "Authentication required"
        }
    
    token = auth_header.split(' ')[1]
    user = get_user_from_token(token)
    
    if not user or not user.get('googleId'):
        return None, {
            "success": False,
            "error": "Invalid authentication token"
        }
    
    return user.get('googleId'), None


@slack_bp.route('/auth/connect', methods=['GET'])
def generate_oauth_url():
    """
    Generate Slack OAuth URL for workspace connection
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: OAuth URL generated successfully
        401: Authentication required
        500: Internal server error
    """
    try:
        # Extract user ID
        user_id, error_response = extract_user_from_request()
        if not user_id:
            return jsonify(error_response), 401
        
        # Generate OAuth URL with secure state token containing user ID
        oauth_url, secure_state_token = slack_service.generate_oauth_url(user_id)
        
        return jsonify({
            "oauth_url": oauth_url,
            "state": secure_state_token
        }), 200
        
    except Exception as e:
        print(f"Error generating OAuth URL: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to generate OAuth URL: {str(e)}"
        }), 500


@slack_bp.route('/auth/callback', methods=['GET'])
def handle_oauth_callback():
    """
    Handle OAuth callback from Slack
    
    Query Parameters:
        code: OAuth authorization code (required)
        state: Secure state token containing user ID (required)
        error: Error code if authorization failed (optional)
    
    Returns:
        200: Integration connected successfully
        400: Missing code/state, invalid state, or authorization denied
        500: Internal server error
    """
    try:
        # Check for OAuth errors
        error = request.args.get('error')
        if error:
            return jsonify({
                "success": False,
                "error": f"OAuth authorization failed: {error}"
            }), 400
        
        # Extract required parameters
        code = request.args.get('code')
        state = request.args.get('state')
        
        if not code:
            return jsonify({
                "success": False,
                "error": "Missing authorization code"
            }), 400
        
        if not state:
            return jsonify({
                "success": False,
                "error": "Missing state parameter"
            }), 400
        
        # Extract user ID from secure state token
        user_id = slack_service.validate_and_extract_user_from_state(state)
        if not user_id:
            # Check if this is a legacy simple state token (backward compatibility)
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                # Try legacy auth method
                token = auth_header.split(' ')[1]
                user = get_user_from_token(token)
                if user and user.get('googleId'):
                    user_id = user.get('googleId')
                else:
                    return jsonify({
                        "success": False,
                        "error": "Invalid state parameter - malformed or expired"
                    }), 400
            else:
                return jsonify({
                    "success": False,
                    "error": "Invalid state parameter - malformed or expired"
                }), 400
        
        # Handle OAuth callback (run async function in sync context)
        try:
            import asyncio
            result = asyncio.run(slack_service.handle_oauth_callback(code, state, user_id))
        except RuntimeError:
            # Handle case where event loop is already running (in tests)
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, slack_service.handle_oauth_callback(code, state, user_id))
                result = future.result()
        
        if result.get('success'):
            # Redirect to success page instead of returning JSON
            # Construct query parameters for the success page
            success_params = {
                'success': 'true',
                'message': result.get('message', 'Slack integration connected successfully'),
                'workspace_name': result.get('workspace_name', ''),
                'workspace_id': result.get('workspace_id', ''),
                'connected_at': result.get('connected_at', '')
            }
            
            success_url = f"{frontend_base_url}/integrations/slack/callback/success?{urlencode(success_params)}"
            
            return redirect(success_url)
        else:
            # For errors, still redirect to success page but with error parameters
            error_params = {
                'success': 'false',
                'error': result.get('error', 'OAuth callback failed')
            }
            
            success_url = f"{frontend_base_url}/integrations/slack/callback/success?{urlencode(error_params)}"
            
            return redirect(success_url)
            
    except Exception as e:
        print(f"Error in OAuth callback: {str(e)}")
        
        # For exceptions, also redirect to success page with error
        error_params = {
            'success': 'false',
            'error': f"OAuth callback failed: {str(e)}"
        }
        
        success_url = f"{frontend_base_url}/integrations/slack/callback/success?{urlencode(error_params)}"
        
        return redirect(success_url)


@slack_bp.route('/webhook', methods=['POST'])
def handle_webhook():
    """
    Handle incoming Slack webhooks (events, slash commands, interactive components)
    
    Headers:
        X-Slack-Request-Timestamp: Request timestamp (required)
        X-Slack-Signature: HMAC signature (required)
        Content-Type: application/json (required)
    
    Returns:
        200: Event processed successfully or URL verification challenge
        401: Invalid webhook signature
        400: Malformed request
        500: Internal server error
    """
    try:
        # Get request body as string for signature verification
        request_body = request.get_data(as_text=True)
        headers = dict(request.headers)
        
        # Handle URL verification challenge
        try:
            event_data = json.loads(request_body)
            if event_data.get('type') == 'url_verification':
                challenge = event_data.get('challenge', '')
                return challenge, 200
        except json.JSONDecodeError:
            pass
        
        # Verify webhook signature
        if not slack_service.verify_webhook_signature(request_body, headers):
            return jsonify({
                "success": False,
                "error": "Invalid signature"
            }), 401
        
        # Parse event data
        try:
            event_data = json.loads(request_body)
        except json.JSONDecodeError:
            return jsonify({
                "success": False,
                "error": "Invalid JSON payload"
            }), 400
        
        # Process different event types
        event_type = event_data.get('type')
        
        if event_type == 'event_callback':
            # Handle workspace events (mentions, messages, etc.)
            asyncio.run(process_workspace_event(event_data))
            
        elif event_type == 'slash_command':
            # Handle slash commands (future feature)
            asyncio.run(process_slash_command(event_data))
            
        elif event_type == 'interactive_component':
            # Handle interactive components (future feature)
            asyncio.run(process_interactive_component(event_data))
        
        # Return success response
        return jsonify({
            "status": "processed",
            "event_type": event_type
        }), 200
        
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Webhook processing failed: {str(e)}"
        }), 500


async def process_workspace_event(event_data: Dict[str, Any]):
    """
    Process Slack workspace events (app mentions, messages)
    
    Args:
        event_data: Slack event callback data
    """
    try:
        team_id = event_data.get('team_id')
        event = event_data.get('event', {})
        
        if not team_id or not event:
            return
        
        # Find users connected to this workspace
        users_collection = db_client.get_collection('users')
        connected_users = users_collection.find({
            'slack_integration.workspace_id': team_id
        })
        
        # Process event for each connected user
        for user in connected_users:
            user_id = user.get('googleId')
            if user_id:
                # Process event through SlackService (run async function)
                task = await slack_service.process_event(event_data, user_id)
                
                if task:
                    print(f"Created task from Slack event: {task.text} for user {user_id}")
                    # Notify user's active clients that today's schedule has been updated
                    # Using UTC date to match current storage semantics
                    date_str = datetime.utcnow().strftime('%Y-%m-%d')
                    event_bus.publish(user_id, {
                        "type": "schedule_updated",
                        "date": date_str
                    })
    except Exception as e:
        print(f"Error processing workspace event: {str(e)}")


async def process_slash_command(event_data: Dict[str, Any]):
    """
    Process Slack slash commands (future feature)
    
    Args:
        event_data: Slack slash command data
    """
    # TODO: Implement slash command processing
    # This could be used for commands like /yourmum add task "Complete project"
    pass


async def process_interactive_component(event_data: Dict[str, Any]):
    """
    Process Slack interactive components (future feature)
    
    Args:
        event_data: Slack interactive component data
    """
    # TODO: Implement interactive component processing
    # This could be used for buttons, modals, or other interactive elements
    pass


@slack_bp.route('/status', methods=['GET'])
def get_integration_status():
    """
    Get Slack integration status for authenticated user
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Integration status retrieved successfully
        401: Authentication required
        500: Internal server error
    """
    try:
        # Extract user ID
        user_id, error_response = extract_user_from_request()
        if not user_id:
            return jsonify(error_response), 401
        
        # Get integration status
        try:
            status = asyncio.run(slack_service.get_integration_status(user_id))
        except RuntimeError:
            # Handle case where event loop is already running (in tests)
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, slack_service.get_integration_status(user_id))
                status = future.result()
        
        return jsonify(status), 200
        
    except Exception as e:
        print(f"Error getting integration status: {str(e)}")
        return jsonify({
            "connected": False,
            "error": f"Failed to get status: {str(e)}"
        }), 500


@slack_bp.route('/disconnect', methods=['DELETE'])
def disconnect_integration():
    """
    Disconnect Slack integration for authenticated user
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Integration disconnected successfully
        401: Authentication required
        500: Internal server error
    """
    try:
        # Extract user ID
        user_id, error_response = extract_user_from_request()
        if not user_id:
            return jsonify(error_response), 401
        
        # Disconnect integration
        result = slack_service.disconnect_integration(user_id)
        
        if result.get('success'):
            return jsonify({
                "success": True,
                "message": "Slack integration disconnected successfully"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to disconnect integration')
            }), 500
            
    except Exception as e:
        print(f"Error disconnecting integration: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Disconnection failed: {str(e)}"
        }), 500


# CORS OPTIONS handlers for all endpoints
@slack_bp.route('/auth/connect', methods=['OPTIONS'])
def handle_connect_options():
    """Handle CORS preflight requests for OAuth connect endpoint."""
    return jsonify({"status": "ok"})


@slack_bp.route('/auth/callback', methods=['OPTIONS'])
def handle_callback_options():
    """Handle CORS preflight requests for OAuth callback endpoint."""
    return jsonify({"status": "ok"})


@slack_bp.route('/webhook', methods=['OPTIONS'])
def handle_webhook_options():
    """Handle CORS preflight requests for webhook endpoint."""
    return jsonify({"status": "ok"})


@slack_bp.route('/status', methods=['OPTIONS'])
def handle_status_options():
    """Handle CORS preflight requests for status endpoint."""
    return jsonify({"status": "ok"})


@slack_bp.route('/disconnect', methods=['OPTIONS'])
def handle_disconnect_options():
    """Handle CORS preflight requests for disconnect endpoint."""
    return jsonify({"status": "ok"})


# Health check endpoint
@slack_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for Slack integration service
    
    Returns:
        200: Service is healthy with configuration status
    """
    try:
        # Check environment configuration
        required_env_vars = [
            'SLACK_CLIENT_ID',
            'SLACK_CLIENT_SECRET', 
            'SLACK_SIGNING_SECRET',
            'ANTHROPIC_API_KEY'
        ]
        
        config_status = {}
        for var in required_env_vars:
            config_status[var] = bool(os.environ.get(var))
        
        # Check service initialization
        services_status = {
            'slack_service_initialized': slack_service is not None,
            'message_processor_initialized': message_processor is not None,
            'database_connected': db_client is not None
        }
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "configuration": config_status,
            "services": services_status
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500