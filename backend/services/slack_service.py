"""
Slack Service Module
Handles Slack OAuth, event processing, and task creation
"""

import os
import hmac
import hashlib
import json
import uuid
import asyncio
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
import aiohttp

from backend.models.task import Task
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
        
    def generate_oauth_url(self, state_token: str, redirect_uri: str = None) -> Tuple[str, str]:
        """
        Generate OAuth URL for Slack workspace connection
        
        Args:
            state_token: CSRF protection state token
            redirect_uri: Optional custom redirect URI
            
        Returns:
            Tuple of (oauth_url, state_token)
        """
        scopes = [
            'app_mentions:read',
            'channels:history',
            'groups:history',
            'im:history',
            'chat:write',
            'users:read',
            'team:read',
            'identity.basic'
        ]
        
        # Default redirect URI
        if not redirect_uri:
            redirect_uri = f"{os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:8000')}/api/integrations/slack/auth/callback"
        
        params = {
            'client_id': self.client_id,
            'scope': ' '.join(scopes),
            'state': state_token,
            'redirect_uri': redirect_uri
        }
        
        param_string = '&'.join([f"{key}={value}" for key, value in params.items()])
        oauth_url = f"{self.oauth_base_url}?{param_string}"
        
        return oauth_url, state_token
    
    async def handle_oauth_callback(self, code: str, state: str, user_id: str) -> Dict[str, Any]:
        """
        Handle OAuth callback from Slack and store integration data
        
        Args:
            code: OAuth authorization code from Slack
            state: State token for CSRF protection
            user_id: YourdAI user ID
            
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
            
            # Encrypt tokens before storage
            integration_data['access_token'] = encrypt_token(integration_data['access_token'])
            integration_data['bot_token'] = encrypt_token(integration_data['bot_token'])
            
            # Store integration in database
            await self._store_integration_data(user_id, integration_data)
            
            return {
                'success': True,
                'workspace_id': integration_data['workspace_id'],
                'workspace_name': integration_data['workspace_name'],
                'connected_at': integration_data['connected_at']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange OAuth code for access tokens"""
        oauth_url = "https://slack.com/api/oauth.v2.access"
        
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(oauth_url, data=data) as response:
                return await response.json()
    
    def _extract_integration_data(self, oauth_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure integration data from OAuth response"""
        return {
            'workspace_id': oauth_data['team']['id'],
            'workspace_name': oauth_data['team']['name'],
            'team_id': oauth_data['team']['id'],
            'slack_user_id': oauth_data.get('authed_user', {}).get('id'),
            'slack_username': oauth_data.get('authed_user', {}).get('name', 'Unknown User'),
            'access_token': oauth_data.get('authed_user', {}).get('access_token', ''),
            'bot_token': oauth_data.get('access_token', ''),
            'bot_user_id': oauth_data.get('bot_user_id'),
            'connected_at': datetime.utcnow().isoformat(),
            'last_event_at': None,
            'channels_joined': []
        }
    
    async def _store_integration_data(self, user_id: str, integration_data: Dict[str, Any]):
        """Store integration data in user document"""
        if not self.db_client:
            raise ValueError("Database client not configured")
        
        # Get users collection
        users_collection = self.db_client.get_collection('users')
        
        # Update user document with Slack integration
        await users_collection.update_one(
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
            user_id: YourdAI user ID
            
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
            
            # Get user integration data
            integration_data = await self._get_user_integration(user_id)
            if not integration_data:
                return None
            
            # Check if user is mentioned
            if not self._is_user_mentioned(event, integration_data['slack_user_id']):
                return None
            
            # Enrich event with additional context
            enriched_event = await self._enrich_event_data(event, integration_data)
            
            # Process with AI to determine if actionable
            if not self.message_processor:
                return None
                
            is_actionable, task_text = await self.message_processor.process_mention(enriched_event)
            
            if not is_actionable or not task_text:
                return None
            
            # Create task from Slack event
            task = Task.from_slack_event(
                event=enriched_event,
                task_text=task_text,
                user_id=user_id
            )
            
            # Store task in database
            await self._store_task(task, user_id)
            
            return task
            
        except Exception as e:
            # Log error but don't raise to avoid webhook failures
            print(f"Error processing Slack event: {str(e)}")
            return None
    
    async def _get_user_integration(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's Slack integration data from database"""
        if not self.db_client:
            return None
        
        users_collection = self.db_client.get_collection('users')
        user_doc = await users_collection.find_one({'googleId': user_id})
        
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
    
    async def _store_task(self, task: Task, user_id: str):
        """Store task in database"""
        if not self.db_client:
            return
        
        # For now, we'll add to today's schedule
        # This should integrate with existing schedule service
        tasks_collection = self.db_client.get_collection('UserSchedules')
        
        today = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Try to add to existing schedule or create new one
        await tasks_collection.update_one(
            {'userId': user_id, 'date': today},
            {
                '$push': {'schedule': task.to_dict()},
                '$set': {'last_modified': datetime.utcnow().isoformat()}
            },
            upsert=True
        )
    
    async def disconnect_integration(self, user_id: str) -> Dict[str, Any]:
        """
        Disconnect Slack integration for a user
        
        Args:
            user_id: YourdAI user ID
            
        Returns:
            Dictionary with success status
        """
        try:
            if not self.db_client:
                raise ValueError("Database client not configured")
            
            users_collection = self.db_client.get_collection('users')
            
            # Remove Slack integration data
            await users_collection.update_one(
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
            user_id: YourdAI user ID
            
        Returns:
            Dictionary with integration status
        """
        try:
            integration_data = await self._get_user_integration(user_id)
            
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