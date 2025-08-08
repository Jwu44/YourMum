"""
Slack Integration Routes
API endpoints for Slack OAuth, webhook handling, and integration management
"""

import os
import json
import uuid
import asyncio
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from typing import Dict, Any, Optional

from backend.db_config import get_database
from backend.services.slack_service import SlackService
from backend.services.slack_message_processor import SlackMessageProcessor
from backend.apis.routes import verify_firebase_token, get_user_from_token

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


async def store_oauth_state(state_token: str, user_id: str):
    """Store OAuth state token with user_id for callback verification"""
    # Use a temporary collection for OAuth states (expires after 10 minutes)
    oauth_states_collection = db_client.get_collection('oauth_states')
    
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    await oauth_states_collection.insert_one({
        'state_token': state_token,
        'user_id': user_id,
        'created_at': datetime.utcnow(),
        'expires_at': expires_at
    })
    
    # Create TTL index for automatic cleanup (if not exists)
    try:
        await oauth_states_collection.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass  # Index might already exist


async def get_user_from_oauth_state(state_token: str) -> Optional[str]:
    """Retrieve user_id from OAuth state token and remove the state"""
    oauth_states_collection = db_client.get_collection('oauth_states')
    
    # Find and remove the state token (one-time use)
    state_doc = await oauth_states_collection.find_one_and_delete({
        'state_token': state_token,
        'expires_at': {'$gt': datetime.utcnow()}  # Not expired
    })
    
    if state_doc:
        return state_doc.get('user_id')
    
    return None


@slack_bp.route('/auth/connect', methods=['GET'])
async def generate_oauth_url():
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
        
        # Generate state token for CSRF protection
        state_token = str(uuid.uuid4())
        
        # Store state token with user_id for callback verification
        await store_oauth_state(state_token, user_id)
        
        # Generate OAuth URL
        oauth_url, returned_state = slack_service.generate_oauth_url(state_token)
        
        return jsonify({
            "oauth_url": oauth_url,
            "state": returned_state
        }), 200
        
    except Exception as e:
        print(f"Error generating OAuth URL: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to generate OAuth URL: {str(e)}"
        }), 500


@slack_bp.route('/auth/callback', methods=['GET'])
async def handle_oauth_callback():
    """
    Handle OAuth callback from Slack
    
    Query Parameters:
        code: OAuth authorization code (required)
        state: CSRF protection state token (required)
        error: Error code if authorization failed (optional)
    
    Headers:
        Authorization: Bearer <firebase_id_token> (required)
    
    Returns:
        200: Integration connected successfully
        400: Missing code or state, or authorization denied
        401: Authentication required
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
        
        # Get user_id from state token instead of requiring auth headers
        user_id = await get_user_from_oauth_state(state)
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Invalid or expired state token"
            }), 400
        
        # Handle OAuth callback (now in async context)
        result = await slack_service.handle_oauth_callback(code, state, user_id)
        
        if result.get('success'):
            # Return an HTML page that closes the popup and notifies parent window
            success_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Slack Integration Success</title>
                <style>
                    body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                    .success {{ color: #28a745; }}
                </style>
            </head>
            <body>
                <div class="success">
                    <h1>✅ Success!</h1>
                    <p>Slack integration connected successfully.</p>
                    <p>Workspace: {result.get('workspace_name', 'Unknown')}</p>
                    <p>You can close this window.</p>
                </div>
                <script>
                    // Notify parent window and close popup
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'slack_oauth_success',
                            data: {{
                                success: true,
                                workspace_name: '{result.get('workspace_name', '')}',
                                workspace_id: '{result.get('workspace_id', '')}',
                                connected_at: '{result.get('connected_at', '')}'
                            }}
                        }}, '*');
                        window.close();
                    }}
                </script>
            </body>
            </html>
            """
            return success_html, 200, {'Content-Type': 'text/html'}
        else:
            # Return error HTML page
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Slack Integration Failed</title>
                <style>
                    body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                    .error {{ color: #dc3545; }}
                </style>
            </head>
            <body>
                <div class="error">
                    <h1>❌ Integration Failed</h1>
                    <p>Failed to connect Slack integration.</p>
                    <p>Error: {result.get('error', 'OAuth callback failed')}</p>
                    <p>You can close this window and try again.</p>
                </div>
                <script>
                    // Notify parent window of error
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'slack_oauth_error',
                            error: '{result.get('error', 'OAuth callback failed')}'
                        }}, '*');
                        window.close();
                    }}
                </script>
            </body>
            </html>
            """
            return error_html, 500, {'Content-Type': 'text/html'}
            
    except Exception as e:
        print(f"Error in OAuth callback: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"OAuth callback failed: {str(e)}"
        }), 500


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
                    
    except Exception as e:
        print(f"Error processing workspace event: {str(e)}")


async def process_slash_command(event_data: Dict[str, Any]):
    """
    Process Slack slash commands (future feature)
    
    Args:
        event_data: Slack slash command data
    """
    # TODO: Implement slash command processing
    # This could be used for commands like /yourdai add task "Complete project"
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
        try:
            result = asyncio.run(slack_service.disconnect_integration(user_id))
        except RuntimeError:
            # Handle case where event loop is already running (in tests)
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, slack_service.disconnect_integration(user_id))
                result = future.result()
        
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