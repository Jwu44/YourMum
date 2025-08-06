"""
Slack App Configuration Module

This module provides configuration management for direct Slack Events API integration,
replacing the Klavis AI MCP server dependency.

Handles Slack app credentials, OAuth scopes, and URL generation following
the architecture guidelines in CLAUDE.md.
"""

import os
from typing import List
from urllib.parse import urlencode


class SlackAppConfig:
    """
    Configuration class for Slack app integration.
    
    Manages Slack app credentials, OAuth scopes, and URL generation
    for direct Slack Events API integration.
    """

    def __init__(self):
        """Initialize Slack app configuration from environment variables."""
        self.client_id = self._get_required_env("SLACK_CLIENT_ID")
        self.client_secret = self._get_required_env("SLACK_CLIENT_SECRET") 
        self.signing_secret = self._get_required_env("SLACK_SIGNING_SECRET")
        self.verification_token = os.environ.get("SLACK_VERIFICATION_TOKEN", "")
        
        # OAuth scopes for yourdAI multi-workspace Slack integration
        self.oauth_scopes = [
            "app_mentions:read",    # Read @mentions directed at the app
            "channels:history",     # Read message history in channels where app is added
            "chat:write",          # Send messages as the app for confirmations
            "users:read",          # Read basic user information for proper user mapping
            "team:read",           # Read workspace information for multi-workspace support
            "im:history"           # Read direct message history for DM-based task creation
        ]

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

    def get_oauth_url(self, redirect_uri: str, state: str) -> str:
        """
        Generate Slack OAuth authorization URL.
        
        Args:
            redirect_uri: OAuth callback URL
            state: CSRF protection state parameter
            
        Returns:
            Complete OAuth authorization URL
        """
        params = {
            "client_id": self.client_id,
            "scope": self.get_scope_string(),
            "redirect_uri": redirect_uri,
            "state": state,
            "response_type": "code"
        }
        
        base_url = "https://slack.com/oauth/v2/authorize"
        return f"{base_url}?{urlencode(params)}"

    def get_scope_string(self) -> str:
        """
        Get OAuth scopes formatted as comma-separated string.
        
        Returns:
            Comma-separated scope string for Slack OAuth
        """
        return ",".join(self.oauth_scopes)

    def get_webhook_url(self) -> str:
        """
        Get webhook URL for Slack Events API subscription.
        
        Returns:
            Webhook URL based on environment (production/development)
        """
        if os.environ.get("NODE_ENV") == "development":
            # Use ngrok URL for local development
            ngrok_url = os.environ.get("NGROK_URL")
            if ngrok_url:
                return f"{ngrok_url.rstrip('/')}/api/integrations/slack/events"
            else:
                return "http://localhost:8000/api/integrations/slack/events"
        else:
            # Production URL for multi-workspace yourdAI Slack app
            return "https://yourdai-production.up.railway.app/api/integrations/slack/events"

    def get_oauth_redirect_uri(self) -> str:
        """
        Get OAuth redirect URI for callback handling.
        
        Returns:
            OAuth callback URL based on environment
        """
        if os.environ.get("NODE_ENV") == "development":
            ngrok_url = os.environ.get("NGROK_URL")
            if ngrok_url:
                return f"{ngrok_url.rstrip('/')}/api/integrations/slack/oauth/callback"
            else:
                return "http://localhost:8000/api/integrations/slack/oauth/callback"
        else:
            # Production callback URL for multi-workspace yourdAI Slack app
            return "https://yourdai-production.up.railway.app/api/integrations/slack/oauth/callback"

    def is_valid(self) -> bool:
        """
        Validate that all required configuration is present.
        
        Returns:
            True if configuration is valid, False otherwise
        """
        return bool(
            self.client_id and 
            self.client_secret and 
            self.signing_secret and
            self.oauth_scopes
        )