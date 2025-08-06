"""
Slack OAuth 2.0 Authentication Utility

This module provides direct Slack OAuth 2.0 authentication functionality,
replacing the Klavis AI MCP server dependency with direct Slack integration.

Handles OAuth flow, token exchange, secure token storage, and token validation
following Slack's OAuth 2.0 specification and security best practices.
"""

import os
import json
import base64
import secrets
import hmac
import hashlib
import requests
from typing import Dict, Any, Tuple, Optional, List
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from backend.db_config import get_database


class SlackOAuthHandler:
    """
    Handler class for Slack OAuth 2.0 authentication.
    
    Provides secure OAuth flow management, token storage, and validation
    for direct Slack Events API integration.
    """
    
    def __init__(self):
        """Initialize OAuth handler with Slack app credentials."""
        self.client_id = self._get_required_env("SLACK_CLIENT_ID")
        self.client_secret = self._get_required_env("SLACK_CLIENT_SECRET")
        self._encryption_key = self._get_or_create_encryption_key()
        self._cipher_suite = Fernet(self._encryption_key)
        
        # OAuth configuration for multi-workspace support
        self.oauth_scopes = [
            'app_mentions:read',    # Read @mentions directed at the app
            'channels:history',     # Read message history in channels where app is added
            'chat:write',          # Send messages as the app for confirmations
            'users:read',          # Read basic user information for proper user mapping
            'team:read',           # Read workspace information for multi-workspace support
            'im:history'           # Read direct message history for DM-based task creation
        ]
        
        # API endpoints
        self.oauth_access_url = "https://slack.com/api/oauth.v2.access"
        self.auth_test_url = "https://slack.com/api/auth.test"
    
    def _get_required_env(self, key: str) -> str:
        """
        Get required environment variable with validation.
        
        Args:
            key: Environment variable key
            
        Returns:
            Environment variable value
            
        Raises:
            ValueError: If required environment variable is missing or empty
        """
        value = os.environ.get(key, "").strip()
        if not value:
            raise ValueError(f"{key} environment variable is required")
        return value
    
    def _get_or_create_encryption_key(self) -> bytes:
        """
        Get or create encryption key for token storage.
        
        Returns:
            Fernet encryption key
        """
        # In production, this should be stored securely (e.g., environment variable)
        # For now, generate a key based on client secret for consistency
        key_material = f"yourdai_slack_encryption_{self.client_secret}".encode()
        # Use PBKDF2 to derive a proper Fernet key
        derived_key = hashlib.pbkdf2_hmac('sha256', key_material, b'slack_salt', 100000)
        return base64.urlsafe_b64encode(derived_key[:32])
    
    def generate_oauth_state(self, user_id: str) -> str:
        """
        Generate secure OAuth state parameter for CSRF protection.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Secure state string for OAuth flow
        """
        # Generate random bytes for security
        random_data = secrets.token_bytes(32)
        
        # Create payload with user ID and timestamp
        payload = {
            'user_id': user_id,
            'timestamp': int(datetime.now(timezone.utc).timestamp()),
            'random': base64.b64encode(random_data).decode()
        }
        
        # Encrypt the payload
        payload_json = json.dumps(payload)
        encrypted_state = self._cipher_suite.encrypt(payload_json.encode())
        
        return base64.urlsafe_b64encode(encrypted_state).decode()
    
    def verify_oauth_state(self, state: str, user_id: str) -> bool:
        """
        Verify OAuth state parameter to prevent CSRF attacks.
        
        Args:
            state: State parameter from OAuth callback
            user_id: Expected user ID
            
        Returns:
            True if state is valid, False otherwise
        """
        try:
            # Decode and decrypt state
            encrypted_state = base64.urlsafe_b64decode(state.encode())
            decrypted_payload = self._cipher_suite.decrypt(encrypted_state)
            payload = json.loads(decrypted_payload.decode())
            
            # Verify user ID matches
            if payload.get('user_id') != user_id:
                return False
            
            # Check if state is not too old (15 minutes max)
            state_timestamp = payload.get('timestamp', 0)
            current_timestamp = int(datetime.now(timezone.utc).timestamp())
            if current_timestamp - state_timestamp > 900:  # 15 minutes
                return False
            
            return True
            
        except Exception as e:
            print(f"OAuth state verification error: {e}")
            return False
    
    def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Exchange OAuth authorization code for access tokens.
        
        Args:
            code: OAuth authorization code from callback
            redirect_uri: Redirect URI used in OAuth flow
            
        Returns:
            Tuple of (success: bool, result: Dict) where result contains tokens or error
        """
        try:
            # Prepare token exchange request
            data = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'code': code,
                'redirect_uri': redirect_uri
            }
            
            # Make request to Slack OAuth endpoint
            response = requests.post(
                self.oauth_access_url,
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            result = response.json()
            
            if response.status_code == 200 and result.get('ok'):
                # Successful token exchange
                return True, {
                    'access_token': result.get('access_token'),
                    'scope': result.get('scope'),
                    'team': result.get('team', {}),
                    'authed_user': result.get('authed_user', {}),
                    'token_type': result.get('token_type', 'bot')
                }
            else:
                # Token exchange failed
                error_msg = result.get('error', 'Unknown OAuth error')
                return False, {'error': error_msg}
                
        except requests.RequestException as e:
            return False, {'error': f'Network error during token exchange: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Token exchange error: {str(e)}'}
    
    def encrypt_token_data(self, token_data: Dict[str, Any]) -> str:
        """
        Encrypt token data for secure database storage.
        
        Args:
            token_data: Token data to encrypt
            
        Returns:
            Encrypted token data as base64 string
        """
        try:
            token_json = json.dumps(token_data)
            encrypted_data = self._cipher_suite.encrypt(token_json.encode())
            return base64.b64encode(encrypted_data).decode()
            
        except Exception as e:
            print(f"Token encryption error: {e}")
            raise
    
    def decrypt_token_data(self, encrypted_data: str) -> Optional[Dict[str, Any]]:
        """
        Decrypt token data from database storage.
        
        Args:
            encrypted_data: Encrypted token data as base64 string
            
        Returns:
            Decrypted token data or None if decryption fails
        """
        try:
            if not encrypted_data:
                return None
                
            encrypted_bytes = base64.b64decode(encrypted_data.encode())
            decrypted_data = self._cipher_suite.decrypt(encrypted_bytes)
            return json.loads(decrypted_data.decode())
            
        except Exception as e:
            print(f"Token decryption error: {e}")
            return None
    
    def store_oauth_tokens(self, user_id: str, token_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Store OAuth tokens securely in database with multi-workspace support.
        
        Args:
            user_id: User's unique identifier
            token_data: Token data from OAuth exchange
            
        Returns:
            Tuple of (success: bool, result: Dict) with operation result
        """
        try:
            team_id = token_data.get('team', {}).get('id')
            if not team_id:
                return False, {'error': 'No team_id found in token data'}
            
            # Encrypt token data
            encrypted_tokens = self.encrypt_token_data({
                'access_token': token_data.get('access_token'),
                'scope': token_data.get('scope'),
                'team_id': team_id,
                'team_name': token_data.get('team', {}).get('name'),
                'token_type': token_data.get('token_type', 'bot'),
                'bot_user_id': token_data.get('authed_user', {}).get('id'),
                'stored_at': datetime.now(timezone.utc).isoformat()
            })
            
            # Prepare workspace-specific Slack integration data
            workspace_data = {
                'connected': True,
                'encrypted_tokens': encrypted_tokens,
                'team_id': team_id,
                'team_name': token_data.get('team', {}).get('name'),
                'scope': token_data.get('scope'),
                'bot_user_id': token_data.get('authed_user', {}).get('id'),
                'connectedAt': datetime.now(timezone.utc),
                'lastSyncTime': datetime.now(timezone.utc)
            }
            
            # Update user document with multi-workspace support
            db = get_database()
            users = db['users']
            
            # Use team_id as the key for multiple workspace connections
            update_result = users.update_one(
                {"googleId": user_id},
                {
                    "$set": {
                        f"slack_workspaces.{team_id}": workspace_data,
                        "metadata.lastModified": datetime.now(timezone.utc)
                    }
                },
                upsert=False  # Don't create new user, should already exist
            )
            
            if update_result.modified_count > 0 or update_result.matched_count > 0:
                return True, {
                    'message': 'OAuth tokens stored successfully',
                    'team_id': team_id,
                    'team_name': token_data.get('team', {}).get('name')
                }
            else:
                return False, {'error': 'User not found'}
                
        except Exception as e:
            print(f"Error storing OAuth tokens: {e}")
            return False, {'error': f'Database error: {str(e)}'}
    
    def get_user_tokens(self, user_id: str, team_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Retrieve and decrypt user's OAuth tokens from database with multi-workspace support.
        
        Args:
            user_id: User's unique identifier
            team_id: Optional specific team_id to get tokens for
            
        Returns:
            Tuple of (success: bool, result: Dict) with tokens or error
        """
        try:
            # Get user from database
            db = get_database()
            users = db['users']
            
            user = users.find_one({"googleId": user_id})
            if not user:
                return False, {'error': 'User not found'}
            
            # Check for new multi-workspace format first
            slack_workspaces = user.get('slack_workspaces', {})
            
            if slack_workspaces:
                if team_id and team_id in slack_workspaces:
                    # Get tokens for specific workspace
                    workspace_data = slack_workspaces[team_id]
                    encrypted_tokens = workspace_data.get('encrypted_tokens')
                elif len(slack_workspaces) == 1:
                    # Get tokens for the only connected workspace
                    workspace_data = next(iter(slack_workspaces.values()))
                    encrypted_tokens = workspace_data.get('encrypted_tokens')
                else:
                    # Multiple workspaces, need team_id to specify which one
                    return False, {'error': 'Multiple workspaces connected, team_id required'}
            else:
                # Fallback to legacy single workspace format
                slack_data = user.get('slack', {})
                if not slack_data.get('connected'):
                    return False, {'error': 'No Slack integrations connected'}
                encrypted_tokens = slack_data.get('encrypted_tokens')
            
            if not encrypted_tokens:
                return False, {'error': 'No tokens found'}
            
            # Decrypt tokens
            token_data = self.decrypt_token_data(encrypted_tokens)
            if not token_data:
                return False, {'error': 'Failed to decrypt tokens'}
            
            return True, token_data
            
        except Exception as e:
            print(f"Error retrieving user tokens: {e}")
            return False, {'error': f'Database error: {str(e)}'}
    
    def validate_token(self, access_token: str) -> bool:
        """
        Validate Slack access token by testing authentication.
        
        Args:
            access_token: Slack access token to validate
            
        Returns:
            True if token is valid, False otherwise
        """
        try:
            response = requests.post(
                self.auth_test_url,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            result = response.json()
            return response.status_code == 200 and result.get('ok', False)
            
        except Exception as e:
            print(f"Token validation error: {e}")
            return False
    
    def get_oauth_scopes(self) -> List[str]:
        """
        Get OAuth scopes for multi-workspace Slack integration.
        
        Returns:
            List of OAuth scope strings
        """
        return self.oauth_scopes.copy()
    
    def get_user_workspaces(self, user_id: str) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Get all connected Slack workspaces for a user.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Tuple of (success: bool, workspaces: List[Dict]) with workspace info
        """
        try:
            # Get user from database
            db = get_database()
            users = db['users']
            
            user = users.find_one({"googleId": user_id})
            if not user:
                return False, []
            
            workspaces = []
            
            # Check new multi-workspace format
            slack_workspaces = user.get('slack_workspaces', {})
            for team_id, workspace_data in slack_workspaces.items():
                if workspace_data.get('connected'):
                    workspaces.append({
                        'team_id': team_id,
                        'team_name': workspace_data.get('team_name'),
                        'connected_at': workspace_data.get('connectedAt'),
                        'last_sync': workspace_data.get('lastSyncTime'),
                        'scope': workspace_data.get('scope')
                    })
            
            # Fallback to legacy format
            if not workspaces:
                slack_data = user.get('slack', {})
                if slack_data.get('connected'):
                    workspaces.append({
                        'team_id': slack_data.get('team_id'),
                        'team_name': slack_data.get('team_name'),
                        'connected_at': slack_data.get('connectedAt'),
                        'last_sync': slack_data.get('lastSyncTime'),
                        'scope': slack_data.get('scope'),
                        'legacy': True
                    })
            
            return True, workspaces
            
        except Exception as e:
            print(f"Error getting user workspaces: {e}")
            return False, []
    
    def revoke_user_tokens(self, user_id: str, team_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Revoke and remove user's OAuth tokens with multi-workspace support.
        
        Args:
            user_id: User's unique identifier
            team_id: Optional specific team_id to revoke tokens for (if None, revokes all)
            
        Returns:
            Tuple of (success: bool, result: Dict) with operation result
        """
        try:
            # Get user from database
            db = get_database()
            users = db['users']
            
            user = users.find_one({"googleId": user_id})
            if not user:
                return False, {'error': 'User not found'}
            
            # Note: Slack doesn't provide a token revocation endpoint
            # So we just remove from our database
            
            if team_id:
                # Remove specific workspace
                slack_workspaces = user.get('slack_workspaces', {})
                if team_id not in slack_workspaces:
                    return False, {'error': 'Workspace not connected'}
                
                update_result = users.update_one(
                    {"googleId": user_id},
                    {
                        "$unset": {f"slack_workspaces.{team_id}": ""},
                        "$set": {"metadata.lastModified": datetime.now(timezone.utc)}
                    }
                )
                
                if update_result.modified_count > 0:
                    return True, {'message': f'Workspace {team_id} disconnected successfully'}
                else:
                    return False, {'error': 'Failed to disconnect workspace'}
            else:
                # Remove all Slack integrations (both legacy and new format)
                update_result = users.update_one(
                    {"googleId": user_id},
                    {
                        "$unset": {"slack": "", "slack_workspaces": ""},
                        "$set": {"metadata.lastModified": datetime.now(timezone.utc)}
                    }
                )
                
                if update_result.modified_count > 0:
                    return True, {'message': 'All Slack integrations disconnected successfully'}
                else:
                    return False, {'error': 'Failed to disconnect integrations'}
                
        except Exception as e:
            print(f"Error revoking tokens: {e}")
            return False, {'error': f'Database error: {str(e)}'}