"""
n8n Integration Routes
API endpoints for forwarding task execution requests to n8n orchestrator
"""

import os
import hmac
import hashlib
import json
import requests
import traceback
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from flask import Blueprint, request, jsonify

from backend.db_config import get_database
from backend.utils.auth import verify_firebase_token

# Create blueprint
n8n_bp = Blueprint("n8n", __name__)


def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Get user data from database using a verified Firebase token.

    Args:
        token: The Firebase ID token

    Returns:
        User document from database or None if not found
    """
    try:
        # Verify the token first
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            return None

        # Extract user ID (Firebase UID)
        user_id = decoded_token.get('uid')
        if not user_id:
            return None

        # Get database instance
        db = get_database()
        users = db['users']

        # Find user by Firebase UID
        user = users.find_one({"googleId": user_id}, {"_id": 0})

        if user:
            print(f"✅ User found for n8n request: {user.get('email')}")
            return user

        # Development bypass - return mock user
        if os.getenv('NODE_ENV') == 'development' and user_id == 'dev_test_user_12345':
            from datetime import datetime, timezone, timedelta
            return {
                'googleId': 'dev_test_user_12345',
                'email': 'dev@example.com',
                'displayName': 'Dev User',
                'calendar': {
                    'connected': True,
                    'credentials': {
                        'accessToken': 'mock-access-token-for-dev',
                        'refreshToken': 'mock-refresh-token-for-dev',
                        'expiresAt': datetime.now(timezone.utc) + timedelta(hours=1),
                        'tokenType': 'Bearer',
                        'scope': 'https://www.googleapis.com/auth/calendar'
                    }
                }
            }

        print(f"❌ User not found for Firebase UID: {user_id}")
        return None

    except Exception as e:
        print(f"Error getting user from token: {e}")
        traceback.print_exc()
        return None


def ensure_access_token_valid(users, user_id: str, credentials_data: Dict[str, Any]) -> Optional[str]:
    """
    Ensure Google Calendar access token is valid; refresh if needed.
    Reuses logic from calendar_routes.py for consistency.

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

    # Normalize expiresAt
    expires_dt = None
    try:
        if isinstance(expires_at, (int, float)):
            # Handle both millisecond and second timestamps
            ts_seconds = expires_at / 1000 if expires_at > 1e12 else expires_at
            expires_dt = datetime.fromtimestamp(ts_seconds, tz=timezone.utc)
        elif isinstance(expires_at, datetime):
            expires_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        elif isinstance(expires_at, str):
            expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    except Exception as e:
        print(f"⚠️ Failed to parse expiresAt for user {user_id}: {expires_at}, error: {e}")
        expires_dt = None

    # If no expiry info, allow token to be used (will fail if invalid)
    if not expires_dt and access_token:
        print(f"🔍 No expiry info for access token, allowing API call to test validity")
        return access_token

    # Check if token is expired
    now_utc = datetime.now(timezone.utc)
    if expires_dt and expires_dt < now_utc:
        print(f"⏰ Access token expired for user {user_id}")

        if not refresh_token:
            print(f"❌ No refresh token available for user {user_id}")
            return None

        # Attempt token refresh
        return refresh_access_token(users, user_id, credentials_data, refresh_token)

    # Token is valid
    if expires_dt:
        time_until_expiry = expires_dt - now_utc
        print(f"✅ Access token valid for user {user_id}, expires in {time_until_expiry.total_seconds():.0f}s")

    return access_token


def refresh_access_token(users, user_id: str, credentials_data: Dict[str, Any], refresh_token: str) -> Optional[str]:
    """
    Refresh Google Calendar access token using refresh token.

    Args:
        users: MongoDB users collection
        user_id: User's Google ID
        credentials_data: Current calendar credentials
        refresh_token: Valid refresh token

    Returns:
        New access token or None if refresh fails
    """
    try:
        # Development bypass - skip actual Google API call for mock tokens
        if os.getenv('NODE_ENV') == 'development' and refresh_token == 'mock-refresh-token-for-dev':
            print(f"🔧 DEV MODE: Skipping token refresh for dev user {user_id}, returning mock token")
            return credentials_data.get('accessToken', 'mock-access-token-for-dev')

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

                # Update stored credentials
                updated_credentials = {
                    **credentials_data,
                    "accessToken": new_access_token,
                    "expiresAt": new_expires_at
                }

                users.update_one(
                    {"googleId": user_id},
                    {"$set": {
                        "calendar.credentials": updated_credentials,
                        "calendar.lastSyncTime": datetime.now(timezone.utc)
                    }}
                )

                print(f"✅ Successfully refreshed access token for user {user_id}")
                return new_access_token
            else:
                print(f"❌ Token refresh response missing access_token for user {user_id}")
                return None
        else:
            print(f"❌ Token refresh failed for user {user_id}: {token_resp.status_code} - {token_resp.text}")
            return None

    except Exception as e:
        print(f"❌ Token refresh exception for user {user_id}: {str(e)}")
        traceback.print_exc()
        return None


def generate_hmac_signature(payload: Dict[str, Any], secret: str) -> str:
    """
    Generate HMAC-SHA256 signature for n8n webhook authentication.

    Args:
        payload: Request payload dictionary
        secret: HMAC secret key

    Returns:
        Hex-encoded HMAC signature
    """
    payload_string = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        secret.encode('utf-8'),
        payload_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature


@n8n_bp.route("/execute-task", methods=["POST"])
def execute_task():
    """
    Execute a natural language task via n8n orchestrator.

    Expected request body:
    {
        "userId": str (Firebase UID, required),
        "taskId": str (Task UUID, required),
        "taskText": str (Natural language task description, required)
    }

    Headers:
        Authorization: Bearer <firebase_id_token> (required)

    Returns:
        200: Task execution successful with result link
        400: Invalid request data, missing token, or calendar not connected
        401: Authentication required
        500: Internal server error or n8n webhook error
    """
    print("\n🔵 execute_task endpoint called!")
    try:
        # Extract and validate authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authentication required"
            }), 401

        token = auth_header[7:]
        user = get_user_from_token(token)
        if not user or not user.get('googleId'):
            return jsonify({
                "success": False,
                "error": "Invalid authentication token"
            }), 401

        user_id = user.get('googleId')

        # Debug logging
        print(f"\n[DEBUG] User object: {user}")
        print(f"[DEBUG] Calendar data: {user.get('calendar', {})}\n")

        # Validate request data
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400

        # Validate required fields
        required_fields = ['userId', 'taskId', 'taskText']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        # Verify userId matches authenticated user (skip in development for testing)
        if os.getenv('NODE_ENV') != 'development' and data['userId'] != user_id:
            return jsonify({
                "success": False,
                "error": "User ID mismatch"
            }), 400

        # In development, allow using a different userId for testing
        if os.getenv('NODE_ENV') == 'development' and data['userId'] != user_id:
            print(f"⚠️ DEV MODE: Using userId from request ({data['userId']}) instead of auth token ({user_id})")
            user_id = data['userId']
            # Re-fetch user with the provided userId
            db = get_database()
            users = db['users']
            user = users.find_one({"googleId": user_id}, {"_id": 0})
            if not user:
                return jsonify({
                    "success": False,
                    "error": f"User not found: {user_id}"
                }), 404

        task_id = data['taskId']
        task_text = data['taskText']

        # Get Google Calendar access token from user's stored credentials
        calendar_data = user.get('calendar', {})
        if not calendar_data.get('connected'):
            return jsonify({
                "success": False,
                "error": "Google Calendar not connected. Please connect your calendar in the Integrations page."
            }), 400

        credentials_data = calendar_data.get('credentials', {})
        if not credentials_data:
            return jsonify({
                "success": False,
                "error": "No calendar credentials found. Please reconnect your calendar."
            }), 400

        # Ensure access token is valid (auto-refresh if needed)
        db = get_database()
        users = db['users']
        access_token = ensure_access_token_valid(users, user_id, credentials_data)

        if not access_token:
            return jsonify({
                "success": False,
                "error": "Failed to obtain valid Google Calendar access token. Please reconnect your calendar."
            }), 400

        # Get Slack credentials if user has connected Slack (optional)
        slack_credentials = None
        slack_integration = user.get('slack_integration', {})
        if slack_integration and slack_integration.get('access_token'):
            from backend.utils.encryption import decrypt_token

            try:
                slack_credentials = {
                    "accessToken": decrypt_token(slack_integration['access_token']),
                    "workspaceId": slack_integration.get('workspace_id'),
                    "workspaceName": slack_integration.get('workspace_name'),
                    "slackUserId": slack_integration.get('slack_user_id'),
                    "teamId": slack_integration.get('team_id')
                }
                print(f"✅ Slack credentials loaded for workspace: {slack_credentials['workspaceName']}")
            except Exception as e:
                print(f"⚠️ Failed to decrypt Slack token: {str(e)}")
                # Continue without Slack credentials - not all tasks require Slack

        # Construct n8n webhook payload
        n8n_payload = {
            "userId": user_id,
            "taskId": task_id,
            "taskText": task_text,
            "accessToken": access_token  # Google Calendar token
        }

        # Add Slack credentials if available
        if slack_credentials:
            n8n_payload["slackCredentials"] = slack_credentials

        # Get n8n webhook URL from environment
        n8n_webhook_url = os.getenv('N8N_WEBHOOK_URL')
        if not n8n_webhook_url:
            return jsonify({
                "success": False,
                "error": "n8n webhook URL not configured"
            }), 500

        # Generate HMAC signature for authentication
        n8n_secret = os.getenv('N8N_WEBHOOK_SECRET', '')
        signature = generate_hmac_signature(n8n_payload, n8n_secret)

        print(f"\n{'='*60}")
        print(f"📤 Sending task to n8n orchestrator")
        print(f"{'='*60}")
        print(f"User: {user.get('email')} ({user_id})")
        print(f"Task ID: {task_id}")
        print(f"Task Text: {task_text}")
        print(f"Webhook URL: {n8n_webhook_url}")
        print(f"Integrations: Google Calendar ✓{', Slack ✓' if slack_credentials else ''}")
        print(f"{'='*60}\n")

        # Send request to n8n webhook
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {signature}'
        }

        n8n_response = requests.post(
            n8n_webhook_url,
            json=n8n_payload,
            headers=headers,
            timeout=30  # 30 second timeout
        )

        # Print response to terminal for curl testing
        print(f"\n{'='*60}")
        print(f"📥 n8n Orchestrator Response")
        print(f"{'='*60}")
        print(f"Status Code: {n8n_response.status_code}")
        print(f"Response Body:")

        # Handle empty or non-JSON responses
        response_text = n8n_response.text
        if response_text:
            try:
                response_json = n8n_response.json()
                print(json.dumps(response_json, indent=2))
            except ValueError:
                print(f"Raw text: {response_text}")
        else:
            print("(Empty response)")
        print(f"{'='*60}\n")

        # Parse n8n response
        if n8n_response.status_code == 200:
            # Handle empty response
            if not response_text:
                return jsonify({
                    "success": False,
                    "error": "n8n returned empty response. Check your n8n workflow configuration.",
                    "taskId": task_id
                }), 500

            try:
                n8n_result = n8n_response.json()

                if n8n_result.get('success'):
                    return jsonify({
                        "success": True,
                        "link": n8n_result.get('link'),
                        "message": "Task executed successfully",
                        "taskId": task_id
                    }), 200
                else:
                    # n8n returned error with guidance
                    error_message = n8n_result.get('error', 'Unknown error from n8n')
                    return jsonify({
                        "success": False,
                        "error": error_message,
                        "taskId": task_id
                    }), 500

            except ValueError:
                # Response is not JSON
                return jsonify({
                    "success": False,
                    "error": "Invalid response from n8n webhook",
                    "taskId": task_id
                }), 500
        else:
            # n8n webhook returned error status code
            error_detail = n8n_response.text[:500]  # Limit error text length
            return jsonify({
                "success": False,
                "error": f"n8n webhook error (status {n8n_response.status_code}): {error_detail}",
                "taskId": task_id
            }), 500

    except requests.exceptions.Timeout:
        print(f"❌ n8n webhook request timed out")
        return jsonify({
            "success": False,
            "error": "Task execution timed out. Please try again."
        }), 500

    except requests.exceptions.RequestException as e:
        print(f"❌ n8n webhook request failed: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to connect to n8n webhook: {str(e)}"
        }), 500

    except Exception as e:
        print(f"❌ Error in execute_task: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500


@n8n_bp.route("/execute-task", methods=["OPTIONS"])
def handle_execute_task_options():
    """Handle CORS preflight requests for execute-task endpoint."""
    return jsonify({"status": "ok"}), 200
