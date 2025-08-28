"""
Slack Service Module
Handles Slack OAuth, event processing, and task creation
"""

import os
import re
import hmac
import hashlib
import uuid
import base64
import time
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from slack_sdk import WebClient
import aiohttp

from backend.models.task import Task
from backend.models.schedule_schema import format_schedule_date
from backend.utils.encryption import encrypt_token, decrypt_token


class SlackService:
    """Handles Slack OAuth, event processing, and task creation"""
    
    def __init__(self, db_client=None, message_processor=None):
        """
        Initialize SlackService with required credentials and dependencies
        
        Args:
            db_client: MongoDB client instance
            message_processor: SlackMessageProcessor instance
        """
        self.client_id = os.environ.get('SLACK_CLIENT_ID')
        self.client_secret = os.environ.get('SLACK_CLIENT_SECRET')
        self.signing_secret = os.environ.get('SLACK_SIGNING_SECRET')
        self.app_id = os.environ.get('SLACK_APP_ID')
        
        if not all([self.client_id, self.client_secret, self.signing_secret]):
            raise ValueError("Missing required Slack environment variables")
        
        self.db_client = db_client
        self.message_processor = message_processor
        
        # Base OAuth URL for Slack
        self.oauth_base_url = "https://slack.com/oauth/v2/authorize"
        
    def generate_secure_state_token(self, user_id: str) -> str:
        """
        Generate secure state token with embedded user ID
        
        Format: base64(user_id:timestamp:uuid)
        
        Args:
            user_id: YourMum user ID to embed in state
            
        Returns:
            Base64 encoded secure state token
        """
        timestamp = str(int(time.time()))
        random_uuid = str(uuid.uuid4())
        state_payload = f"{user_id}:{timestamp}:{random_uuid}"
        
        # Use URL-safe base64 encoding and remove padding
        secure_state = base64.urlsafe_b64encode(state_payload.encode()).decode().rstrip('=')
        return secure_state
    
    def validate_and_extract_user_from_state(self, state_token: str, max_age_minutes: int = 10) -> Optional[str]:
        """
        Validate secure state token and extract user ID
        
        Args:
            state_token: Base64 encoded state token
            max_age_minutes: Maximum age of state token in minutes
            
        Returns:
            User ID if state is valid, None otherwise
        """
        try:
            # Add padding for base64 decoding if needed
            padding = 4 - len(state_token) % 4
            if padding != 4:
                state_token += '=' * padding
            
            # Decode state token
            decoded_state = base64.urlsafe_b64decode(state_token).decode()
            parts = decoded_state.split(':')
            
            # Validate format
            if len(parts) != 3:
                return None
            
            user_id, timestamp_str, uuid_str = parts
            
            # Validate timestamp is numeric
            try:
                timestamp = int(timestamp_str)
            except ValueError:
                return None
            
            # Check if token is expired
            current_time = int(time.time())
            if current_time - timestamp > max_age_minutes * 60:
                return None
            
            # Validate UUID format (basic check)
            if len(uuid_str) != 36 or uuid_str.count('-') != 4:
                return None
            
            return user_id
            
        except Exception:
            return None
    
    def generate_oauth_url(self, user_id: str, redirect_uri: str = None) -> Tuple[str, str]:
        """
        Generate OAuth URL for Slack workspace connection with secure state token
        
        Args:
            user_id: YourMum user ID to embed in state token
            redirect_uri: Optional custom redirect URI
            
        Returns:
            Tuple of (oauth_url, secure_state_token)
        """
        scopes = [
            'app_mentions:read',
            'channels:history',
            'groups:history',
            'im:history',
            'chat:write',
            'users:read',
            'team:read'
        ]
        
        # Generate secure state token with embedded user ID
        secure_state_token = self.generate_secure_state_token(user_id)
        
        # Default redirect URI
        if not redirect_uri:
            redirect_uri = f"{os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:8000')}/api/integrations/slack/auth/callback"
        
        params = {
            'client_id': self.client_id,
            'scope': ' '.join(scopes),
            'state': secure_state_token,
            'redirect_uri': redirect_uri
        }
        
        param_string = '&'.join([f"{key}={value}" for key, value in params.items()])
        oauth_url = f"{self.oauth_base_url}?{param_string}"
        
        return oauth_url, secure_state_token
    
    async def handle_oauth_callback(self, code: str, state: str, user_id: str) -> Dict[str, Any]:
        """
        Handle OAuth callback from Slack and store integration data
        
        Args:
            code: OAuth authorization code from Slack
            state: State token for CSRF protection
            user_id: YourMum user ID
            
        Returns:
            Dictionary with success status and integration data
        """
        try:
            # Exchange code for tokens
            oauth_data = await self._exchange_code_for_tokens(code)
            
            if not oauth_data.get('ok'):
                raise ValueError(f"OAuth failed: {oauth_data.get('error', 'Unknown error')}")
            
            # Extract integration data
            integration_data = self._extract_integration_data(oauth_data)
            
            # Encrypt tokens before storage (only if they exist)
            if integration_data['access_token']:
                integration_data['access_token'] = encrypt_token(integration_data['access_token'])
            
            # Bot token is required and should always exist
            integration_data['bot_token'] = encrypt_token(integration_data['bot_token'])
            
            # Store integration in database
            self._store_integration_data(user_id, integration_data)
            
            return {
                'success': True,
                'workspace_id': integration_data['workspace_id'],
                'workspace_name': integration_data['workspace_name'],
                'connected_at': integration_data['connected_at']
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"[OAuth] Error processing callback: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def _sanitize_oauth_response_for_logging(self, oauth_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a sanitized version of OAuth response for safe logging"""
        if not oauth_data:
            return {}
        
        sanitized = {
            'ok': oauth_data.get('ok'),
            'has_access_token': bool(oauth_data.get('access_token')),
            'token_type': oauth_data.get('token_type'),
            'scope': oauth_data.get('scope'),
            'bot_user_id': oauth_data.get('bot_user_id'),
            'app_id': oauth_data.get('app_id'),
            'team': {
                'id': oauth_data.get('team', {}).get('id'),
                'name': oauth_data.get('team', {}).get('name')
            } if oauth_data.get('team') else None,
            'authed_user': {
                'id': oauth_data.get('authed_user', {}).get('id'),
                'has_access_token': bool(oauth_data.get('authed_user', {}).get('access_token')),
                'token_type': oauth_data.get('authed_user', {}).get('token_type'),
                'scope': oauth_data.get('authed_user', {}).get('scope')
            } if oauth_data.get('authed_user') else None,
            'error': oauth_data.get('error'),
            'warning': oauth_data.get('warning')
        }
        return sanitized
    
    async def _exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange OAuth code for access tokens"""
        oauth_url = "https://slack.com/api/oauth.v2.access"

        # Use the same redirect_uri used during the authorization request
        redirect_uri = f"{os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:8000')}/api/integrations/slack/auth/callback"

        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': redirect_uri
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(oauth_url, data=data) as response:
                return await response.json()
    
    def _extract_integration_data(self, oauth_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure integration data from OAuth response"""
        # Validate OAuth response structure
        if not oauth_data.get('ok'):
            raise ValueError(f"OAuth failed: {oauth_data.get('error', 'Unknown error')}")
        
        if not oauth_data.get('team', {}).get('id'):
            raise ValueError("Missing team information in OAuth response")
        
        # Extract bot token (required)
        bot_token = oauth_data.get('access_token')
        if not bot_token:
            raise ValueError("Missing bot access token in OAuth response")
        
        # Extract user token (optional for some integrations)
        user_token = oauth_data.get('authed_user', {}).get('access_token')
        
        return {
            'workspace_id': oauth_data['team']['id'],
            'workspace_name': oauth_data['team']['name'],
            'team_id': oauth_data['team']['id'],
            'slack_user_id': oauth_data.get('authed_user', {}).get('id'),
            'slack_username': oauth_data.get('authed_user', {}).get('name', 'Unknown User'),
            'access_token': user_token if user_token else None,  # Keep as None if not present
            'bot_token': bot_token,
            'bot_user_id': oauth_data.get('bot_user_id'),
            'connected_at': datetime.utcnow().isoformat(),
            'last_event_at': None,
            'channels_joined': []
        }
    
    def _store_integration_data(self, user_id: str, integration_data: Dict[str, Any]):
        """Store integration data in user document"""
        if self.db_client is None:
            raise ValueError("Database client not configured")
        
        # Get users collection
        users_collection = self.db_client.get_collection('users')
        
        # Update user document with Slack integration
        users_collection.update_one(
            {'googleId': user_id},
            {'$set': {'slack_integration': integration_data}},
            upsert=False
        )
    
    def verify_webhook_signature(self, request_body: str, headers: Dict[str, str]) -> bool:
        """
        Verify webhook request is from Slack using HMAC-SHA256
        
        Args:
            request_body: Raw request body as string
            headers: Request headers dictionary
            
        Returns:
            True if signature is valid, False otherwise
        """
        try:
            timestamp = headers.get('X-Slack-Request-Timestamp', '')
            slack_signature = headers.get('X-Slack-Signature', '')
            
            if not timestamp or not slack_signature:
                return False
            
            # Check timestamp to prevent replay attacks (within 5 minutes)
            current_time = int(datetime.utcnow().timestamp())
            if abs(current_time - int(timestamp)) > 300:
                return False
            
            # Create signature base string
            sig_basestring = f"v0:{timestamp}:{request_body}"
            
            # Calculate expected signature
            expected_signature = "v0=" + hmac.new(
                self.signing_secret.encode(),
                sig_basestring.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            return hmac.compare_digest(expected_signature, slack_signature)
            
        except Exception:
            return False
    
    async def process_event(self, event_data: Dict[str, Any], user_id: str) -> Optional[Task]:
        """
        Process Slack event and create task if needed
        
        Args:
            event_data: Slack event data
            user_id: YourMum user ID
            
        Returns:
            Task object if message is actionable, None otherwise
        """
        try:
            # Extract event details
            event = event_data.get('event', {})
            event_type = event.get('type')
            
            # Only process message events
            if event_type != 'message':
                return None
            
            # Skip bot messages
            if event.get('bot_id'):
                return None
            
            # Get user integration data (sync read)
            integration_data = self._get_user_integration(user_id)
            if not integration_data:
                return None
            
            # Check if user is mentioned
            if not self._is_user_mentioned(event, integration_data['slack_user_id']):
                return None
            
            # Enrich event with additional context (best effort; do not fail task creation)
            enriched_event = await self._enrich_event_data(event, integration_data)

            # Derive a task title directly from message text without AI gating
            raw_text = event.get('text', '')
            task_text = self._extract_task_text(raw_text)
            if not task_text:
                # Provide a sensible fallback to ensure a task is always created
                channel_name = enriched_event.get('channel_name', 'Slack')
                task_text = f"Follow up on message in #{channel_name}"
            
            # Create task from Slack event
            task = Task.from_slack_event(
                event=enriched_event,
                task_text=task_text,
                user_id=user_id
            )
            
            # Store task in database
            self._store_task(task, user_id)
            
            # Light debug log for observability
            try:
                print(f"[Slack] Task created for user {user_id}: '{task_text}' (channel={enriched_event.get('channel_name','?')})")
            except Exception:
                pass
            
            return task
            
        except Exception as e:
            # Log error but don't raise to avoid webhook failures
            print(f"Error processing Slack event: {str(e)}")
            return None

    def _extract_task_text(self, text: str) -> str:
        """
        Convert a raw Slack message into a concise task title.
        - Removes user mentions like <@Uxxxx>
        - Removes broadcast mentions like <!here>, <!channel>, <!everyone>
        - Collapses whitespace and trims
        - Truncates to a reasonable length to keep task titles tidy
        """
        if not text:
            return ""

        cleaned = re.sub(r"<@[UW][A-Z0-9]+>", "", text)  # remove user mentions
        cleaned = re.sub(r"<!(?:here|channel|everyone)>", "", cleaned, flags=re.IGNORECASE)  # remove broadcast mentions
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Slack often includes punctuation-only prompts; guard against empties
        if not cleaned:
            return ""

        # Keep task titles readable
        max_len = 140
        return cleaned if len(cleaned) <= max_len else cleaned[: max_len - 1] + "…"
    
    def _get_user_integration(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's Slack integration data from database (synchronous)"""
        if self.db_client is None:
            return None

        users_collection = self.db_client.get_collection('users')
        user_doc = users_collection.find_one({'googleId': user_id})

        if not user_doc or 'slack_integration' not in user_doc:
            return None

        return user_doc['slack_integration']
    
    def _is_user_mentioned(self, event: Dict[str, Any], slack_user_id: str) -> bool:
        """Check if the user is mentioned in the message"""
        text = event.get('text', '')
        
        # Direct mention
        if f'<@{slack_user_id}>' in text:
            return True
        
        # Channel-wide mentions (@here, @channel, @everyone)
        channel_mentions = ['<!here>', '<!channel>', '<!everyone>']
        if any(mention in text for mention in channel_mentions):
            return True
        
        return False
    
    async def _enrich_event_data(self, event: Dict[str, Any], integration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich event data with additional context from Slack API"""
        # Add team/workspace information
        enriched_event = {
            **event,
            'team_id': integration_data['team_id'],
            'team_domain': integration_data['workspace_name'].lower().replace(' ', ''),
            'team_name': integration_data['workspace_name']
        }
        
        # Try to get channel name if not present
        if 'channel_name' not in enriched_event:
            enriched_event['channel_name'] = await self._get_channel_name(
                event.get('channel'),
                integration_data
            )
        
        # Try to get user name if not present
        if 'user_name' not in enriched_event:
            enriched_event['user_name'] = await self._get_user_name(
                event.get('user'),
                integration_data
            )
        
        return enriched_event
    
    async def _get_channel_name(self, channel_id: str, integration_data: Dict[str, Any]) -> str:
        """Get channel name from Slack API"""
        try:
            bot_token = decrypt_token(integration_data['bot_token'])
            client = WebClient(token=bot_token)
            
            response = client.conversations_info(channel=channel_id)
            if response['ok']:
                return response['channel']['name']
        except Exception:
            pass
        
        return 'Unknown Channel'
    
    async def _get_user_name(self, user_id: str, integration_data: Dict[str, Any]) -> str:
        """Get user name from Slack API"""
        try:
            bot_token = decrypt_token(integration_data['bot_token'])
            client = WebClient(token=bot_token)
            
            response = client.users_info(user=user_id)
            if response['ok']:
                return response['user']['name']
        except Exception:
            pass
        
        return 'Unknown User'
    
    def _store_task(self, task: Task, user_id: str):
        """Store task in database"""
        if self.db_client is None:
            return
        
        # For now, we'll add to today's schedule
        # This should integrate with existing schedule service
        tasks_collection = self.db_client.get_collection('UserSchedules')

        # Store under normalized date key used across schedule service
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        formatted_date = format_schedule_date(today_str)

        # Add task and update metadata timestamp without breaking existing schema
        tasks_collection.update_one(
            {'userId': user_id, 'date': formatted_date},
            {
                '$push': {'schedule': task.to_dict()},
                '$set': {'metadata.last_modified': datetime.utcnow().isoformat()}
            },
            upsert=True
        )
    
    def disconnect_integration(self, user_id: str) -> Dict[str, Any]:
        """
        Disconnect Slack integration for a user
        
        Args:
            user_id: YourMum user ID
            
        Returns:
            Dictionary with success status
        """
        try:
            if self.db_client is None:
                raise ValueError("Database client not configured")
            
            users_collection = self.db_client.get_collection('users')
            
            # Remove Slack integration data
            users_collection.update_one(
                {'googleId': user_id},
                {'$unset': {'slack_integration': ""}}
            )
            
            return {'success': True}
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_integration_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get Slack integration status for a user
        
        Args:
            user_id: YourMum user ID
            
        Returns:
            Dictionary with integration status
        """
        try:
            integration_data = self._get_user_integration(user_id)
            
            if not integration_data:
                return {
                    'connected': False,
                    'workspace_name': None,
                    'connected_at': None
                }
            
            return {
                'connected': True,
                'workspace_name': integration_data.get('workspace_name'),
                'workspace_id': integration_data.get('workspace_id'),
                'connected_at': integration_data.get('connected_at'),
                'last_event_at': integration_data.get('last_event_at')
            }
            
        except Exception as e:
            return {
                'connected': False,
                'error': str(e)
            }