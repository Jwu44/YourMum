"""
Test module for Slack OAuth 2.0 authentication.

Tests OAuth flow, token exchange, token storage, and workspace authentication
following the TDD approach outlined in dev-guide.md.
"""

import os
import json
from unittest.mock import patch, Mock, MagicMock
import pytest
from datetime import datetime, timezone
from backend.utils.slack_auth import SlackOAuthHandler


class TestSlackOAuthHandler:
    """Test cases for Slack OAuth 2.0 authentication."""

    def test_oauth_handler_initialization(self):
        """Test that SlackOAuthHandler initializes with required configuration."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            handler = SlackOAuthHandler()
            assert handler.client_id == '1855513823862.9291610769799'
            assert handler.client_secret == '5c26008b1917b69c5de94922fb8562a0'

    def test_missing_oauth_credentials_raises_error(self):
        """Test that missing OAuth credentials raise ValueError."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="SLACK_CLIENT_ID environment variable is required"):
                SlackOAuthHandler()

    def test_generate_oauth_state(self):
        """Test OAuth state generation for CSRF protection."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            handler = SlackOAuthHandler()
            user_id = "test-user-123"
            
            state = handler.generate_oauth_state(user_id)
            
            # Should be a non-empty string
            assert isinstance(state, str)
            assert len(state) > 0
            
            # Should be able to verify the state
            assert handler.verify_oauth_state(state, user_id) is True

    def test_invalid_oauth_state_verification(self):
        """Test OAuth state verification rejects invalid states."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            handler = SlackOAuthHandler()
            user_id = "test-user-123"
            
            # Test with invalid state
            invalid_states = [
                "invalid-state",
                "",
                None,
                "tampered-state-data"
            ]
            
            for invalid_state in invalid_states:
                assert handler.verify_oauth_state(invalid_state, user_id) is False

    @patch('requests.post')
    def test_exchange_code_for_tokens_success(self, mock_post):
        """Test successful OAuth code exchange for tokens."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            # Mock successful Slack API response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'ok': True,
                'access_token': 'xoxb-test-token',
                'scope': 'app_mentions:read,chat:write',
                'team': {
                    'id': 'T1234567',
                    'name': 'Test Workspace'
                },
                'authed_user': {
                    'id': 'U1234567'
                }
            }
            mock_post.return_value = mock_response
            
            handler = SlackOAuthHandler()
            code = "test-auth-code"
            redirect_uri = "https://yourdai-production.up.railway.app/api/slack/oauth/callback"
            
            success, result = handler.exchange_code_for_tokens(code, redirect_uri)
            
            assert success is True
            assert result['access_token'] == 'xoxb-test-token'
            assert result['team']['id'] == 'T1234567'
            assert result['team']['name'] == 'Test Workspace'

    @patch('requests.post')
    def test_exchange_code_for_tokens_failure(self, mock_post):
        """Test OAuth code exchange failure handling."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            # Mock failed Slack API response
            mock_response = Mock()
            mock_response.status_code = 400
            mock_response.json.return_value = {
                'ok': False,
                'error': 'invalid_code'
            }
            mock_post.return_value = mock_response
            
            handler = SlackOAuthHandler()
            code = "invalid-auth-code"
            redirect_uri = "https://yourdai-production.up.railway.app/api/slack/oauth/callback"
            
            success, result = handler.exchange_code_for_tokens(code, redirect_uri)
            
            assert success is False
            assert 'error' in result
            assert result['error'] == 'invalid_code'

    def test_encrypt_token_data(self):
        """Test token data encryption for secure storage."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            handler = SlackOAuthHandler()
            
            token_data = {
                'access_token': 'xoxb-test-token-12345',
                'scope': 'app_mentions:read,chat:write',
                'team_id': 'T1234567'
            }
            
            encrypted_data = handler.encrypt_token_data(token_data)
            
            # Should be different from original
            assert encrypted_data != json.dumps(token_data)
            assert isinstance(encrypted_data, str)
            assert len(encrypted_data) > 0

    def test_decrypt_token_data(self):
        """Test token data decryption from storage."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            handler = SlackOAuthHandler()
            
            original_data = {
                'access_token': 'xoxb-test-token-12345',
                'scope': 'app_mentions:read,chat:write',
                'team_id': 'T1234567'
            }
            
            # Encrypt then decrypt
            encrypted_data = handler.encrypt_token_data(original_data)
            decrypted_data = handler.decrypt_token_data(encrypted_data)
            
            assert decrypted_data == original_data

    def test_invalid_encrypted_data_handling(self):
        """Test handling of invalid encrypted data."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            handler = SlackOAuthHandler()
            
            invalid_data_cases = [
                "invalid-encrypted-data",
                "",
                None,
                "corrupted-base64-data"
            ]
            
            for invalid_data in invalid_data_cases:
                result = handler.decrypt_token_data(invalid_data)
                assert result is None

    @patch('backend.utils.slack_auth.get_database')
    def test_store_oauth_tokens(self, mock_get_database):
        """Test storing OAuth tokens in database."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            # Mock database
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            mock_users.update_one.return_value = Mock(modified_count=1)
            mock_get_database.return_value = mock_db
            
            handler = SlackOAuthHandler()
            user_id = "test-user-123"
            token_data = {
                'access_token': 'xoxb-test-token',
                'scope': 'app_mentions:read,chat:write',
                'team': {
                    'id': 'T1234567',
                    'name': 'Test Workspace'
                }
            }
            
            success, result = handler.store_oauth_tokens(user_id, token_data)
            
            assert success is True
            assert 'message' in result
            
            # Verify database was called
            mock_users.update_one.assert_called_once()

    @patch('backend.utils.slack_auth.get_database')
    def test_get_user_tokens(self, mock_get_database):
        """Test retrieving user's OAuth tokens from database."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            # Mock database with stored tokens
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            
            handler = SlackOAuthHandler()
            
            # Create test token data and encrypt it
            token_data = {
                'access_token': 'xoxb-test-token',
                'team_id': 'T1234567'
            }
            encrypted_tokens = handler.encrypt_token_data(token_data)
            
            mock_users.find_one.return_value = {
                'googleId': 'test-user-123',
                'slack': {
                    'connected': True,
                    'encrypted_tokens': encrypted_tokens,
                    'team_name': 'Test Workspace'
                }
            }
            mock_get_database.return_value = mock_db
            
            user_id = "test-user-123"
            success, result = handler.get_user_tokens(user_id)
            
            assert success is True
            assert result['access_token'] == 'xoxb-test-token'
            assert result['team_id'] == 'T1234567'

    @patch('backend.utils.slack_auth.get_database')
    def test_get_user_tokens_not_found(self, mock_get_database):
        """Test retrieving tokens for user without Slack integration."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            # Mock database with no user found
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            mock_users.find_one.return_value = None
            mock_get_database.return_value = mock_db
            
            handler = SlackOAuthHandler()
            user_id = "nonexistent-user"
            
            success, result = handler.get_user_tokens(user_id)
            
            assert success is False
            assert 'error' in result

    @patch('requests.post')
    def test_validate_token_active(self, mock_post):
        """Test validation of active Slack tokens."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            # Mock successful auth.test response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'ok': True,
                'team': 'Test Workspace',
                'team_id': 'T1234567'
            }
            mock_post.return_value = mock_response
            
            handler = SlackOAuthHandler()
            access_token = "xoxb-valid-token"
            
            is_valid = handler.validate_token(access_token)
            
            assert is_valid is True

    @patch('requests.post')
    def test_validate_token_invalid(self, mock_post):
        """Test validation of invalid Slack tokens."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            # Mock failed auth.test response
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.json.return_value = {
                'ok': False,
                'error': 'invalid_auth'
            }
            mock_post.return_value = mock_response
            
            handler = SlackOAuthHandler()
            access_token = "xoxb-invalid-token"
            
            is_valid = handler.validate_token(access_token)
            
            assert is_valid is False

    def test_get_oauth_scopes(self):
        """Test OAuth scopes configuration."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0'
        }):
            handler = SlackOAuthHandler()
            scopes = handler.get_oauth_scopes()
            
            expected_scopes = [
                'app_mentions:read',
                'channels:history', 
                'chat:write',
                'users:read',
                'team:read'
            ]
            
            assert scopes == expected_scopes