"""
Test module for Slack app configuration.

Tests Slack app credentials, scopes, and configuration validation
following the TDD approach outlined in dev-guide.md.
"""

import os
import pytest
from unittest.mock import patch
from backend.config.slack_app import SlackAppConfig


class TestSlackAppConfig:
    """Test cases for Slack app configuration."""

    def test_slack_config_initialization(self):
        """Test that SlackAppConfig initializes with environment variables."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e',
            'SLACK_VERIFICATION_TOKEN': 'DUQYU39OVuFKULF9MliTCLye'
        }):
            config = SlackAppConfig()
            
            assert config.client_id == '1855513823862.9291610769799'
            assert config.client_secret == '5c26008b1917b69c5de94922fb8562a0'
            assert config.signing_secret == '0efe4a3d2e74103a6bd0209f5147646e'
            assert config.verification_token == 'DUQYU39OVuFKULF9MliTCLye'

    def test_missing_required_credentials_raises_error(self):
        """Test that missing required credentials raise ValueError."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="SLACK_CLIENT_ID environment variable is required"):
                SlackAppConfig()

    def test_get_oauth_url_generation(self):
        """Test OAuth URL generation with correct parameters."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            config = SlackAppConfig()
            redirect_uri = "https://yourdai-production.up.railway.app/api/slack/oauth/callback"
            state = "test-state-123"
            
            oauth_url = config.get_oauth_url(redirect_uri, state)
            
            assert "https://slack.com/oauth/v2/authorize" in oauth_url
            assert "client_id=1855513823862.9291610769799" in oauth_url
            # URL-encoded version of redirect_uri
            assert "redirect_uri=https%3A%2F%2Fyourdai-production.up.railway.app%2Fapi%2Fslack%2Foauth%2Fcallback" in oauth_url
            assert f"state={state}" in oauth_url
            assert "scope=" in oauth_url

    def test_oauth_scopes_are_correctly_formatted(self):
        """Test that OAuth scopes are correctly formatted for Slack API."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            config = SlackAppConfig()
            
            expected_scopes = [
                "app_mentions:read",
                "channels:history", 
                "chat:write",
                "users:read",
                "team:read"
            ]
            
            assert config.oauth_scopes == expected_scopes
            
            # Test scope string formatting for URL
            scope_string = config.get_scope_string()
            assert scope_string == "app_mentions:read,channels:history,chat:write,users:read,team:read"

    def test_webhook_url_configuration(self):
        """Test webhook URL configuration for different environments."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e',
            'NODE_ENV': 'production'
        }):
            config = SlackAppConfig()
            webhook_url = config.get_webhook_url()
            
            assert webhook_url == "https://yourdai-production.up.railway.app/api/slack/events"

    def test_development_webhook_url_with_ngrok(self):
        """Test webhook URL configuration for development with ngrok."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e',
            'NODE_ENV': 'development',
            'NGROK_URL': 'https://abc123.ngrok.io'
        }):
            config = SlackAppConfig()
            webhook_url = config.get_webhook_url()
            
            assert webhook_url == "https://abc123.ngrok.io/api/slack/events"

    def test_is_valid_configuration(self):
        """Test configuration validation method."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            config = SlackAppConfig()
            
            assert config.is_valid() is True

    def test_invalid_configuration_missing_secrets(self):
        """Test configuration validation with missing secrets."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            with pytest.raises(ValueError):
                SlackAppConfig()