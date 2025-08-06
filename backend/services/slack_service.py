"""
Slack Service Module - Direct Slack Events API Integration

This module provides Slack integration functionality using direct Slack Events API,
replacing the Klavis AI MCP server dependency with native Slack integration:
- Direct OAuth 2.0 flow for workspace authorization
- Webhook event processing with signature verification
- Converting Slack messages to yourdAI Task objects  
- Managing Slack integration status and connections

Follows the architecture guidelines in CLAUDE.md and dev-guide.md principles.
"""

import os
import json
from typing import Dict, List, Any, Tuple, Optional, Union
from datetime import datetime, timezone
from dotenv import load_dotenv

from backend.models.task import Task
from backend.config.slack_app import SlackAppConfig
from backend.utils.slack_auth import SlackOAuthHandler
from backend.utils.slack_webhook_validator import SlackWebhookValidator
from backend.db_config import get_database

# Load environment variables
load_dotenv()


class SlackService:
    """
    Service class for managing direct Slack integration.
    
    Handles all Slack-related operations including OAuth, webhook processing,
    and task creation from Slack @mentions using direct Slack Events API.
    """

    def __init__(self):
        """Initialize the Slack service with direct integration utilities."""
        try:
            # Initialize configuration and utilities
            self.app_config = SlackAppConfig()
            self.oauth_handler = SlackOAuthHandler() 
            self.webhook_validator = SlackWebhookValidator()
            
            # Verify configuration is valid
            if not self.app_config.is_valid():
                raise ValueError("Invalid Slack app configuration")
                
        except Exception as e:
            raise ValueError(f"Failed to initialize Slack service: {str(e)}")

    def initiate_oauth_flow(self, user_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Initiate OAuth flow for user to connect their Slack workspace.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Tuple of (success: bool, result: Dict) with OAuth URL and state
        """
        try:
            # Generate secure state for CSRF protection
            state = self.oauth_handler.generate_oauth_state(user_id)
            
            # Get OAuth redirect URI
            redirect_uri = self.app_config.get_oauth_redirect_uri()
            
            # Generate OAuth authorization URL
            oauth_url = self.app_config.get_oauth_url(redirect_uri, state)
            
            return True, {
                'oauth_url': oauth_url,
                'state': state,
                'redirect_uri': redirect_uri
            }
            
        except Exception as e:
            return False, {'error': f'Failed to initiate OAuth flow: {str(e)}'}

    def complete_oauth_flow(
        self, 
        user_id: str, 
        code: str, 
        state: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Complete OAuth flow by exchanging authorization code for tokens.
        
        Args:
            user_id: User's unique identifier
            code: OAuth authorization code from callback
            state: State parameter for CSRF validation
            
        Returns:
            Tuple of (success: bool, result: Dict) with completion status
        """
        try:
            # Verify state parameter for CSRF protection
            if not self.oauth_handler.verify_oauth_state(state, user_id):
                return False, {'error': 'Invalid state parameter - possible CSRF attack'}
            
            # Exchange authorization code for tokens
            redirect_uri = self.app_config.get_oauth_redirect_uri()
            success, token_result = self.oauth_handler.exchange_code_for_tokens(code, redirect_uri)
            
            if not success:
                return False, {'error': f'Token exchange failed: {token_result.get("error", "Unknown error")}'}
            
            # Store tokens securely in database
            store_success, store_result = self.oauth_handler.store_oauth_tokens(user_id, token_result)
            
            if not store_success:
                return False, {'error': f'Failed to store tokens: {store_result.get("error", "Unknown error")}'}
            
            return True, {
                'message': 'Slack integration connected successfully',
                'team_name': token_result.get('team', {}).get('name'),
                'team_id': token_result.get('team', {}).get('id')
            }
            
        except Exception as e:
            return False, {'error': f'OAuth completion failed: {str(e)}'}

    def process_webhook_event(
        self,
        payload: Dict[str, Any],
        timestamp: str,
        signature: str
    ) -> Tuple[bool, Union[str, Task, Dict[str, Any]]]:
        """
        Process incoming webhook event from Slack.
        
        Args:
            payload: Webhook payload from Slack
            timestamp: Request timestamp from X-Slack-Request-Timestamp header
            signature: Signature from X-Slack-Signature header
            
        Returns:
            Tuple of (success: bool, result: Union[str, Task, Dict]) where result is:
            - Challenge string for URL verification
            - Task object for successful event processing
            - Error dict for failures
        """
        try:
            # Convert payload to JSON string for signature verification
            payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True)
            
            # Verify webhook signature for security
            if not self.webhook_validator.verify_signature(payload_json, timestamp, signature):
                return False, {'error': 'Invalid signature - unauthorized request'}
            
            # Handle URL verification challenge
            if payload.get('type') == 'url_verification':
                challenge = self.webhook_validator.handle_url_verification(payload)
                if challenge:
                    return True, challenge
                else:
                    return False, {'error': 'Invalid URL verification payload'}
            
            # Handle event callbacks
            if payload.get('type') == 'event_callback':
                return self._process_event_callback(payload)
            
            # Unknown event type
            return False, {'error': f'Unknown event type: {payload.get("type")}'}
            
        except Exception as e:
            return False, {'error': f'Webhook processing error: {str(e)}'}

    def _process_event_callback(self, payload: Dict[str, Any]) -> Tuple[bool, Union[Task, Dict[str, Any]]]:
        """
        Process event callback payload with multi-workspace support.
        
        Args:
            payload: Event callback payload
            
        Returns:
            Tuple of (success: bool, result: Union[Task, Dict]) with Task or error
        """
        try:
            # Validate payload structure
            if not self.webhook_validator.validate_event_payload(payload):
                return False, {'error': 'Invalid event payload structure'}
            
            event = payload.get('event', {})
            
            # Check if event is relevant for task creation
            if not self.webhook_validator.is_relevant_event(event):
                return False, {'error': 'Event not relevant for task creation'}
                
            # Skip bot messages to avoid loops
            if self.webhook_validator.is_bot_message(event):
                return False, {'error': 'Ignoring bot message'}
            
            # Extract workspace information
            workspace_info = self.webhook_validator.extract_workspace_info(payload)
            team_id = workspace_info.get('team_id')
            
            if not team_id:
                return False, {'error': 'Missing team_id in payload'}
            
            # Extract user ID for rate limiting
            slack_user_id = event.get('user')
            if slack_user_id and not self.webhook_validator.check_rate_limit(slack_user_id, team_id):
                return False, {'error': 'Rate limit exceeded for user'}
            
            # Check for duplicate messages
            message_ts = event.get('ts')
            channel_id = event.get('channel')
            
            if message_ts and channel_id:
                if self._is_duplicate_message(team_id, message_ts, channel_id):
                    return False, {'error': 'Duplicate message already processed'}
            
            # Extract clean text from mention
            cleaned_text = self.webhook_validator.extract_mention_text(event)
            if not cleaned_text.strip():
                return False, {'error': 'Empty message text after cleaning'}
            
            # Find yourdAI user connected to this Slack workspace
            yourdai_user_id = self._find_user_by_workspace(team_id)
            if not yourdai_user_id:
                return False, {'error': f'No yourdAI user connected to workspace {team_id}'}
            
            # Create task from Slack event with user mapping
            task = self.create_task_from_mention(event, cleaned_text, workspace_info)
            task.user_id = yourdai_user_id  # Add user mapping for task creation
            
            return True, task
            
        except Exception as e:
            return False, {'error': f'Event processing error: {str(e)}'}

    def _is_duplicate_message(self, team_id: str, message_ts: str, channel_id: str) -> bool:
        """
        Check if message has already been processed to prevent duplicates.
        
        Args:
            team_id: Slack team/workspace ID
            message_ts: Message timestamp
            channel_id: Channel ID
            
        Returns:
            True if duplicate, False if new message
        """
        try:
            # Create unique message identifier
            message_key = f"{team_id}:{channel_id}:{message_ts}"
            
            # Check database for existing message
            db = get_database()
            processed_messages = db['slack_processed_messages']
            
            existing = processed_messages.find_one({'message_key': message_key})
            
            if existing:
                return True
            
            # Mark message as processed
            processed_messages.insert_one({
                'message_key': message_key,
                'team_id': team_id,
                'channel_id': channel_id,
                'message_ts': message_ts,
                'processed_at': datetime.now(timezone.utc)
            })
            
            return False
            
        except Exception as e:
            print(f"Duplicate check error: {e}")
            return False  # Allow message through on error

    def create_task_from_mention(
        self,
        event_data: Dict[str, Any],
        cleaned_text: str,
        workspace_info: Optional[Dict[str, str]] = None
    ) -> Task:
        """
        Create Task object from Slack mention event with multi-workspace support.
        
        Args:
            event_data: Slack event data
            cleaned_text: Cleaned message text
            workspace_info: Optional workspace information from payload
            
        Returns:
            Task object configured for Slack-sourced tasks
        """
        # Generate Slack message URL if we have workspace info
        slack_message_url = None
        if workspace_info and workspace_info.get('team_id'):
            team_id = workspace_info['team_id']
            channel_id = event_data.get('channel')
            message_ts = event_data.get('ts')
            
            if channel_id and message_ts:
                # Convert timestamp format for URL (remove decimal point)
                ts_for_url = message_ts.replace('.', '')
                slack_message_url = f"https://app.slack.com/client/{team_id}/{channel_id}/thread/{channel_id}-{ts_for_url}"
        
        # Create Task with Slack-specific configuration
        task = Task(
            text=cleaned_text,
            categories={"Work"},  # Default category for Slack tasks (use set)
            source="slack",
            slack_message_url=slack_message_url,
            completed=False
        )
        
        # Add workspace context to task metadata if available
        if workspace_info:
            task.metadata = {
                'slack_workspace': {
                    'team_id': workspace_info.get('team_id'),
                    'team_domain': workspace_info.get('team_domain'),
                    'channel_id': event_data.get('channel'),
                    'user_id': event_data.get('user'),
                    'message_ts': event_data.get('ts')
                }
            }
        
        return task

    def get_integration_status(self, user_id: str, team_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Get current Slack integration status for user with multi-workspace support.
        
        Args:
            user_id: User's unique identifier
            team_id: Optional specific team_id to check status for
            
        Returns:
            Tuple of (success: bool, status: Dict) with integration details
        """
        try:
            # Get all user workspaces
            workspaces_success, workspaces = self.oauth_handler.get_user_workspaces(user_id)
            
            if not workspaces_success:
                return True, {
                    'connected': False,
                    'workspaces': [],
                    'error': 'No workspaces found'
                }
                
            if not workspaces:
                return True, {
                    'connected': False,
                    'workspaces': [],
                    'error': 'No connected workspaces'
                }
            
            # If specific team_id requested, return status for that workspace
            if team_id:
                workspace = next((ws for ws in workspaces if ws['team_id'] == team_id), None)
                if not workspace:
                    return True, {
                        'connected': False,
                        'team_id': team_id,
                        'error': 'Workspace not connected'
                    }
                
                # Validate token for specific workspace
                tokens_success, token_result = self.oauth_handler.get_user_tokens(user_id, team_id)
                token_valid = False
                if tokens_success:
                    access_token = token_result.get('access_token')
                    if access_token:
                        token_valid = self.oauth_handler.validate_token(access_token)
                
                return True, {
                    'connected': True,
                    'token_valid': token_valid,
                    'team_id': workspace['team_id'],
                    'team_name': workspace['team_name'],
                    'scope': workspace['scope'],
                    'connected_at': workspace['connected_at']
                }
            
            # Return status for all connected workspaces
            return True, {
                'connected': True,
                'workspaces': workspaces,
                'total_workspaces': len(workspaces)
            }
            
        except Exception as e:
            return False, {'error': f'Status check error: {str(e)}'}

    def disconnect_integration(self, user_id: str, team_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Disconnect user's Slack integration with multi-workspace support.
        
        Args:
            user_id: User's unique identifier
            team_id: Optional specific team_id to disconnect (if None, disconnects all)
            
        Returns:
            Tuple of (success: bool, result: Dict) with disconnection status
        """
        try:
            return self.oauth_handler.revoke_user_tokens(user_id, team_id)
            
        except Exception as e:
            return False, {'error': f'Disconnect error: {str(e)}'}

    def check_duplicate_message(
        self,
        user_id: str,
        message_ts: str,
        channel_id: str
    ) -> bool:
        """
        Check if a message has been processed to prevent duplicates.
        
        Args:
            user_id: User's unique identifier  
            message_ts: Slack message timestamp
            channel_id: Slack channel ID
            
        Returns:
            True if duplicate, False if new message
        """
        # Development bypass
        if os.getenv('NODE_ENV') == 'development' and user_id == 'dev-user-123':
            return False
        
        try:
            # Create unique message identifier
            message_key = f"{user_id}:{channel_id}:{message_ts}"
            
            # Check database for existing message
            db = get_database()
            processed_messages = db['slack_processed_messages']
            
            existing = processed_messages.find_one({'message_key': message_key})
            
            if existing:
                return True
            
            # Mark message as processed
            processed_messages.insert_one({
                'message_key': message_key,
                'user_id': user_id,
                'channel_id': channel_id, 
                'message_ts': message_ts,
                'processed_at': datetime.now(timezone.utc)
            })
            
            return False
            
        except Exception as e:
            print(f"Duplicate check error: {e}")
            return False  # Allow message through on error

    def _find_user_by_workspace(self, team_id: str) -> Optional[str]:
        """
        Find yourdAI user ID by Slack workspace team_id for multi-workspace support.
        
        Args:
            team_id: Slack workspace team ID
            
        Returns:
            yourdAI user ID if found, None otherwise
        """
        try:
            db = get_database()
            users = db['users']
            
            # Search in new multi-workspace format
            user = users.find_one({f"slack_workspaces.{team_id}.connected": True})
            
            if user:
                return user.get('googleId')
            
            # Fallback to legacy single workspace format
            user = users.find_one({
                "slack.connected": True,
                "slack.team_id": team_id
            })
            
            if user:
                return user.get('googleId')
                
            return None
            
        except Exception as e:
            print(f"Error finding user by workspace: {e}")
            return None

    # Legacy methods for backward compatibility
    # These will be removed in future versions
    
    def create_slack_server_instance(self, user_id: str, platform_name: str = "yourdai") -> Tuple[bool, Dict[str, Any]]:
        """
        Legacy method for backward compatibility.
        Redirects to new OAuth flow initiation.
        """
        return self.initiate_oauth_flow(user_id)
    
    def get_slack_integration_status(self, user_id: str, instance_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Legacy method for backward compatibility.
        Redirects to new status check.
        """
        return self.get_integration_status(user_id)
    
    def disconnect_slack_integration(self, user_id: str, instance_id: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Legacy method for backward compatibility.
        Redirects to new disconnect method.
        """
        return self.disconnect_integration(user_id)
    
    def get_user_workspaces(self, user_id: str) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Get all connected Slack workspaces for a user.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Tuple of (success: bool, workspaces: List[Dict]) with workspace info
        """
        try:
            return self.oauth_handler.get_user_workspaces(user_id)
            
        except Exception as e:
            return False, []