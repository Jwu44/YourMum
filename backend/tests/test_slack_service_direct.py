"""
Test module for direct Slack integration SlackService rewrite.

Tests the new SlackService implementation that uses direct Slack Events API
instead of Klavis AI MCP server, following TDD approach from dev-guide.md.
"""

import os
import json
from unittest.mock import patch, Mock, MagicMock
import pytest
from datetime import datetime, timezone
from backend.services.slack_service import SlackService
from backend.models.task import Task


class TestSlackServiceDirect:
    """Test cases for direct Slack integration SlackService."""

    def test_slack_service_initialization(self):
        """Test that SlackService initializes with direct integration utilities."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            service = SlackService()
            
            # Should initialize with new utilities
            assert hasattr(service, 'oauth_handler')
            assert hasattr(service, 'webhook_validator')
            assert hasattr(service, 'app_config')

    def test_missing_credentials_raises_error(self):
        """Test that missing Slack credentials raise ValueError."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="SLACK_CLIENT_ID environment variable is required"):
                SlackService()

    @patch('backend.services.slack_service.SlackOAuthHandler')
    def test_initiate_oauth_flow(self, mock_oauth_handler_class):
        """Test initiating OAuth flow for user."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock OAuth handler
            mock_oauth_handler = Mock()
            mock_oauth_handler.generate_oauth_state.return_value = "encrypted-state-123"
            mock_oauth_handler_class.return_value = mock_oauth_handler
            
            service = SlackService()
            user_id = "test-user-123"
            
            success, result = service.initiate_oauth_flow(user_id)
            
            assert success is True
            assert 'oauth_url' in result
            assert 'state' in result
            assert result['state'] == "encrypted-state-123"

    @patch('backend.services.slack_service.SlackOAuthHandler')
    def test_complete_oauth_flow_success(self, mock_oauth_handler_class):
        """Test successful OAuth flow completion."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock OAuth handler
            mock_oauth_handler = Mock()
            mock_oauth_handler.verify_oauth_state.return_value = True
            mock_oauth_handler.exchange_code_for_tokens.return_value = (True, {
                'access_token': 'xoxb-test-token',
                'team': {'id': 'T1234567', 'name': 'Test Workspace'}
            })
            mock_oauth_handler.store_oauth_tokens.return_value = (True, {'message': 'Success'})
            mock_oauth_handler_class.return_value = mock_oauth_handler
            
            service = SlackService()
            user_id = "test-user-123"
            code = "oauth-code-123"
            state = "encrypted-state-123"
            
            success, result = service.complete_oauth_flow(user_id, code, state)
            
            assert success is True
            assert 'message' in result

    @patch('backend.services.slack_service.SlackOAuthHandler')
    def test_complete_oauth_flow_invalid_state(self, mock_oauth_handler_class):
        """Test OAuth flow completion with invalid state."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock OAuth handler
            mock_oauth_handler = Mock()
            mock_oauth_handler.verify_oauth_state.return_value = False
            mock_oauth_handler_class.return_value = mock_oauth_handler
            
            service = SlackService()
            user_id = "test-user-123"
            code = "oauth-code-123"
            state = "invalid-state"
            
            success, result = service.complete_oauth_flow(user_id, code, state)
            
            assert success is False
            assert 'error' in result
            assert 'Invalid state' in result['error']

    @patch('backend.services.slack_service.SlackWebhookValidator')
    def test_process_webhook_url_verification(self, mock_validator_class):
        """Test processing Slack URL verification challenge."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock webhook validator
            mock_validator = Mock()
            mock_validator.verify_signature.return_value = True
            mock_validator.handle_url_verification.return_value = "challenge-response-123"
            mock_validator_class.return_value = mock_validator
            
            service = SlackService()
            
            payload = {
                'type': 'url_verification',
                'challenge': 'challenge-response-123'
            }
            
            success, result = service.process_webhook_event(
                payload, "timestamp", "signature"
            )
            
            assert success is True
            assert result == "challenge-response-123"

    @patch('backend.services.slack_service.get_database')
    @patch('backend.services.slack_service.SlackWebhookValidator')
    def test_process_webhook_app_mention(self, mock_validator_class, mock_get_database):
        """Test processing app_mention webhook event."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock webhook validator
            mock_validator = Mock()
            mock_validator.verify_signature.return_value = True
            mock_validator.validate_event_payload.return_value = True
            mock_validator.is_relevant_event.return_value = True
            mock_validator.extract_mention_text.return_value = "create task for meeting"
            mock_validator.check_rate_limit.return_value = True
            mock_validator_class.return_value = mock_validator
            
            # Mock database for duplicate checking
            mock_db = MagicMock()
            mock_processed = Mock()
            mock_db.__getitem__.return_value = mock_processed
            mock_processed.find_one.return_value = None  # No duplicate
            mock_processed.insert_one.return_value = Mock()
            mock_get_database.return_value = mock_db
            
            service = SlackService()
            
            payload = {
                'type': 'event_callback',
                'event': {
                    'type': 'app_mention',
                    'user': 'U1234567',
                    'text': '<@U0BOTUSER> create task for meeting',
                    'ts': '1234567890.123456',
                    'channel': 'C1234567'
                },
                'team_id': 'T1234567'
            }
            
            success, result = service.process_webhook_event(
                payload, "timestamp", "signature"
            )
            
            assert success is True
            assert isinstance(result, Task)
            assert result.text == "create task for meeting"
            assert result.source == "slack"

    @patch('backend.services.slack_service.SlackWebhookValidator')
    def test_process_webhook_invalid_signature(self, mock_validator_class):
        """Test processing webhook with invalid signature."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock webhook validator
            mock_validator = Mock()
            mock_validator.verify_signature.return_value = False
            mock_validator_class.return_value = mock_validator
            
            service = SlackService()
            
            payload = {'type': 'event_callback'}
            
            success, result = service.process_webhook_event(
                payload, "timestamp", "invalid-signature"
            )
            
            assert success is False
            assert 'Invalid signature' in result['error']

    @patch('backend.services.slack_service.SlackWebhookValidator')
    def test_process_webhook_rate_limited(self, mock_validator_class):
        """Test processing webhook with rate limiting."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock webhook validator
            mock_validator = Mock()
            mock_validator.verify_signature.return_value = True
            mock_validator.validate_event_payload.return_value = True
            mock_validator.is_relevant_event.return_value = True
            mock_validator.check_rate_limit.return_value = False  # Rate limited
            mock_validator_class.return_value = mock_validator
            
            service = SlackService()
            
            payload = {
                'type': 'event_callback',
                'event': {
                    'type': 'app_mention',
                    'user': 'U1234567',
                    'text': '<@U0BOTUSER> create task',
                    'ts': '1234567890.123456'
                }
            }
            
            success, result = service.process_webhook_event(
                payload, "timestamp", "signature"
            )
            
            assert success is False
            assert 'Rate limit exceeded' in result['error']

    @patch('backend.services.slack_service.SlackOAuthHandler')
    def test_get_integration_status(self, mock_oauth_handler_class):
        """Test getting user's Slack integration status."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock OAuth handler
            mock_oauth_handler = Mock()
            mock_oauth_handler.get_user_tokens.return_value = (True, {
                'access_token': 'xoxb-test-token',
                'team_id': 'T1234567'
            })
            mock_oauth_handler.validate_token.return_value = True
            mock_oauth_handler_class.return_value = mock_oauth_handler
            
            service = SlackService()
            user_id = "test-user-123"
            
            success, result = service.get_integration_status(user_id)
            
            assert success is True
            assert result['connected'] is True
            assert result['team_id'] == 'T1234567'
            assert result['token_valid'] is True

    @patch('backend.services.slack_service.SlackOAuthHandler')
    def test_get_integration_status_not_connected(self, mock_oauth_handler_class):
        """Test getting integration status for user not connected."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock OAuth handler
            mock_oauth_handler = Mock()
            mock_oauth_handler.get_user_tokens.return_value = (False, {'error': 'No tokens found'})
            mock_oauth_handler_class.return_value = mock_oauth_handler
            
            service = SlackService()
            user_id = "test-user-123"
            
            success, result = service.get_integration_status(user_id)
            
            assert success is True
            assert result['connected'] is False
            assert result['token_valid'] is False

    @patch('backend.services.slack_service.SlackOAuthHandler')
    def test_disconnect_integration(self, mock_oauth_handler_class):
        """Test disconnecting user's Slack integration."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock OAuth handler
            mock_oauth_handler = Mock()
            mock_oauth_handler.revoke_user_tokens.return_value = (True, {'message': 'Disconnected'})
            mock_oauth_handler_class.return_value = mock_oauth_handler
            
            service = SlackService()
            user_id = "test-user-123"
            
            success, result = service.disconnect_integration(user_id)
            
            assert success is True
            assert 'message' in result

    def test_create_task_from_mention(self):
        """Test creating Task object from Slack mention."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            service = SlackService()
            
            event_data = {
                'type': 'app_mention',
                'user': 'U1234567',
                'text': '<@U0BOTUSER> create task for meeting tomorrow',
                'ts': '1234567890.123456',
                'channel': 'C1234567'
            }
            
            cleaned_text = "create task for meeting tomorrow"
            task = service.create_task_from_mention(event_data, cleaned_text)
            
            assert isinstance(task, Task)
            assert task.text == cleaned_text
            assert task.source == "slack"
            assert "Work" in task.categories
            assert task.completed is False

    def test_create_task_with_slack_url(self):
        """Test creating Task object with Slack message URL."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            service = SlackService()
            
            event_data = {
                'type': 'app_mention',
                'user': 'U1234567',
                'text': '<@U0BOTUSER> review PR',
                'ts': '1234567890.123456',
                'channel': 'C1234567'
            }
            
            cleaned_text = "review PR"
            slack_url = "https://workspace.slack.com/archives/C1234567/p1234567890123456"
            
            task = service.create_task_from_mention(event_data, cleaned_text, slack_url)
            
            assert task.slack_message_url == slack_url

    def test_check_duplicate_message_prevention(self):
        """Test duplicate message prevention logic."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }), patch('backend.services.slack_service.get_database') as mock_get_db:
            # Mock database
            mock_db = MagicMock()
            mock_processed = Mock()
            mock_db.__getitem__.return_value = mock_processed
            mock_get_db.return_value = mock_db
            
            # First call - no existing message
            mock_processed.find_one.return_value = None
            mock_processed.insert_one.return_value = Mock()
            
            service = SlackService()
            user_id = "test-user-123"
            message_ts = "1234567890.123456"
            channel_id = "C1234567"
            
            is_duplicate = service.check_duplicate_message(user_id, message_ts, channel_id)
            
            assert is_duplicate is False
            mock_processed.insert_one.assert_called_once()

    def test_check_duplicate_message_found(self):
        """Test duplicate message detection."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }), patch('backend.services.slack_service.get_database') as mock_get_db:
            # Mock database with existing message
            mock_db = MagicMock()
            mock_processed = Mock()
            mock_db.__getitem__.return_value = mock_processed
            mock_processed.find_one.return_value = {'message_key': 'test-user-123:C1234567:1234567890.123456'}
            mock_get_db.return_value = mock_db
            
            service = SlackService()
            user_id = "test-user-123"
            message_ts = "1234567890.123456"
            channel_id = "C1234567"
            
            is_duplicate = service.check_duplicate_message(user_id, message_ts, channel_id)
            
            assert is_duplicate is True