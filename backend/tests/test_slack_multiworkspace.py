"""
Test module for multi-workspace Slack integration functionality.

Tests the enhanced multi-workspace support in SlackService, OAuth handler,
and integration routes following TDD approach from dev-guide.md.
"""

import os
import json
from unittest.mock import patch, Mock, MagicMock
import pytest
from datetime import datetime, timezone
from backend.services.slack_service import SlackService
from backend.utils.slack_auth import SlackOAuthHandler
from backend.models.task import Task


class TestMultiWorkspaceSlackIntegration:
    """Test cases for multi-workspace Slack integration."""

    def test_oauth_handler_stores_multiple_workspaces(self):
        """Test that OAuth handler can store tokens for multiple workspaces."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }), patch('backend.utils.slack_auth.get_database') as mock_get_db:
            # Mock database
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            mock_users.update_one.return_value = Mock(modified_count=1)
            mock_get_db.return_value = mock_db
            
            oauth_handler = SlackOAuthHandler()
            user_id = "test-user-123"
            
            # Store tokens for first workspace
            token_data_1 = {
                'access_token': 'xoxb-workspace1-token',
                'team': {'id': 'T1234567', 'name': 'Workspace 1'},
                'authed_user': {'id': 'U1234567'}
            }
            
            success1, result1 = oauth_handler.store_oauth_tokens(user_id, token_data_1)
            assert success1 is True
            assert result1['team_id'] == 'T1234567'
            
            # Store tokens for second workspace
            token_data_2 = {
                'access_token': 'xoxb-workspace2-token',
                'team': {'id': 'T7654321', 'name': 'Workspace 2'},
                'authed_user': {'id': 'U7654321'}
            }
            
            success2, result2 = oauth_handler.store_oauth_tokens(user_id, token_data_2)
            assert success2 is True
            assert result2['team_id'] == 'T7654321'
            
            # Verify both workspaces were stored
            assert mock_users.update_one.call_count == 2
            
            # Check first workspace call
            first_call = mock_users.update_one.call_args_list[0]
            assert first_call[0][0] == {"googleId": user_id}
            assert "slack_workspaces.T1234567" in first_call[0][1]["$set"]
            workspace1_data = first_call[0][1]["$set"]["slack_workspaces.T1234567"]
            assert workspace1_data["team_id"] == "T1234567"
            assert workspace1_data["team_name"] == "Workspace 1"
            assert workspace1_data["connected"] is True
            
            # Check second workspace call
            second_call = mock_users.update_one.call_args_list[1]
            assert second_call[0][0] == {"googleId": user_id}
            assert "slack_workspaces.T7654321" in second_call[0][1]["$set"]
            workspace2_data = second_call[0][1]["$set"]["slack_workspaces.T7654321"]
            assert workspace2_data["team_id"] == "T7654321"
            assert workspace2_data["team_name"] == "Workspace 2"
            assert workspace2_data["connected"] is True

    def test_oauth_handler_gets_specific_workspace_tokens(self):
        """Test retrieving tokens for specific workspace."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }), patch('backend.utils.slack_auth.get_database') as mock_get_db:
            # Mock database with multi-workspace data
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            
            # Mock user with multiple workspaces
            mock_users.find_one.return_value = {
                'googleId': 'test-user-123',
                'slack_workspaces': {
                    'T1234567': {
                        'connected': True,
                        'encrypted_tokens': 'encrypted_tokens_ws1'
                    },
                    'T7654321': {
                        'connected': True,
                        'encrypted_tokens': 'encrypted_tokens_ws2'
                    }
                }
            }
            mock_get_db.return_value = mock_db
            
            oauth_handler = SlackOAuthHandler()
            
            # Mock decryption
            with patch.object(oauth_handler, 'decrypt_token_data') as mock_decrypt:
                mock_decrypt.return_value = {
                    'access_token': 'xoxb-workspace1-token',
                    'team_id': 'T1234567'
                }
                
                # Get tokens for specific workspace
                success, tokens = oauth_handler.get_user_tokens('test-user-123', 'T1234567')
                
                assert success is True
                assert tokens['access_token'] == 'xoxb-workspace1-token'
                assert tokens['team_id'] == 'T1234567'
                mock_decrypt.assert_called_once_with('encrypted_tokens_ws1')

    def test_oauth_handler_lists_user_workspaces(self):
        """Test getting all connected workspaces for a user."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }), patch('backend.utils.slack_auth.get_database') as mock_get_db:
            # Mock database with multi-workspace data
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            
            mock_users.find_one.return_value = {
                'googleId': 'test-user-123',
                'slack_workspaces': {
                    'T1234567': {
                        'connected': True,
                        'team_name': 'Workspace 1',
                        'connectedAt': datetime.now(timezone.utc),
                        'scope': 'app_mentions:read,chat:write'
                    },
                    'T7654321': {
                        'connected': True,
                        'team_name': 'Workspace 2',
                        'connectedAt': datetime.now(timezone.utc),
                        'scope': 'app_mentions:read,chat:write'
                    }
                }
            }
            mock_get_db.return_value = mock_db
            
            oauth_handler = SlackOAuthHandler()
            success, workspaces = oauth_handler.get_user_workspaces('test-user-123')
            
            assert success is True
            assert len(workspaces) == 2
            
            workspace_ids = [ws['team_id'] for ws in workspaces]
            assert 'T1234567' in workspace_ids
            assert 'T7654321' in workspace_ids
            
            workspace_names = [ws['team_name'] for ws in workspaces]
            assert 'Workspace 1' in workspace_names
            assert 'Workspace 2' in workspace_names

    @patch('backend.services.slack_service.get_database')
    def test_slack_service_finds_user_by_workspace(self, mock_get_database):
        """Test that SlackService can find user by workspace team_id."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            # Mock database
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            
            # Mock user found by workspace
            mock_users.find_one.return_value = {
                'googleId': 'test-user-123',
                'slack_workspaces': {
                    'T1234567': {
                        'connected': True,
                        'team_name': 'Test Workspace'
                    }
                }
            }
            mock_get_database.return_value = mock_db
            
            service = SlackService()
            user_id = service._find_user_by_workspace('T1234567')
            
            assert user_id == 'test-user-123'
            
            # Verify correct database query
            expected_query = {"slack_workspaces.T1234567.connected": True}
            mock_users.find_one.assert_called_with(expected_query)

    @patch('backend.services.slack_service.get_database')
    @patch('backend.services.slack_service.SlackWebhookValidator')
    def test_slack_service_processes_multiworkspace_webhook(self, mock_validator_class, mock_get_database):
        """Test webhook processing with proper user mapping for multi-workspace."""
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
            mock_validator.is_bot_message.return_value = False
            mock_validator.extract_workspace_info.return_value = {'team_id': 'T1234567'}
            mock_validator.extract_mention_text.return_value = "create task from workspace"
            mock_validator.check_rate_limit.return_value = True
            mock_validator_class.return_value = mock_validator
            
            # Mock database for user lookup and duplicate checking
            mock_db = MagicMock()
            mock_users = Mock()
            mock_processed = Mock()
            mock_db.__getitem__.side_effect = lambda key: mock_users if key == 'users' else mock_processed
            
            # Mock user found by workspace
            mock_users.find_one.return_value = {
                'googleId': 'test-user-123',
                'slack_workspaces': {
                    'T1234567': {'connected': True, 'team_name': 'Test Workspace'}
                }
            }
            
            # Mock no duplicate message
            mock_processed.find_one.return_value = None
            mock_processed.insert_one.return_value = Mock()
            mock_get_database.return_value = mock_db
            
            service = SlackService()
            
            payload = {
                'type': 'event_callback',
                'team_id': 'T1234567',
                'event': {
                    'type': 'app_mention',
                    'user': 'U1234567',
                    'text': '<@U0BOTUSER> create task from workspace',
                    'ts': '1234567890.123456',
                    'channel': 'C1234567'
                }
            }
            
            success, result = service.process_webhook_event(payload, "timestamp", "signature")
            
            # Debug the result if test fails
            if not success:
                print(f"Error result: {result}")
            
            assert success is True
            assert isinstance(result, Task)
            assert result.text == "create task from workspace"
            assert result.source == "slack"
            assert hasattr(result, 'user_id')
            assert result.user_id == 'test-user-123'

    def test_webhook_validator_extracts_workspace_info(self):
        """Test webhook validator extracts workspace information correctly."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            from backend.utils.slack_webhook_validator import SlackWebhookValidator
            
            validator = SlackWebhookValidator()
            
            payload = {
                'type': 'event_callback',
                'team_id': 'T1234567',
                'team_domain': 'testworkspace',
                'enterprise_id': 'E1234567',
                'event': {
                    'type': 'app_mention',
                    'text': 'test message'
                }
            }
            
            workspace_info = validator.extract_workspace_info(payload)
            
            assert workspace_info['team_id'] == 'T1234567'
            assert workspace_info['team_domain'] == 'testworkspace'
            assert workspace_info['enterprise_id'] == 'E1234567'

    def test_webhook_validator_multiworkspace_rate_limiting(self):
        """Test rate limiting works correctly per workspace."""
        with patch.dict(os.environ, {
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            from backend.utils.slack_webhook_validator import SlackWebhookValidator
            
            validator = SlackWebhookValidator()
            user_id = 'U1234567'
            team_id_1 = 'T1234567'
            team_id_2 = 'T7654321'
            
            # Test that different workspaces have separate rate limits
            for _ in range(validator.rate_limit_max_requests):
                assert validator.check_rate_limit(user_id, team_id_1) is True
                assert validator.check_rate_limit(user_id, team_id_2) is True
            
            # Now both should be rate limited
            assert validator.check_rate_limit(user_id, team_id_1) is False
            assert validator.check_rate_limit(user_id, team_id_2) is False

    def test_task_creation_includes_workspace_metadata(self):
        """Test that tasks created from Slack include workspace metadata."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }):
            service = SlackService()
            
            event_data = {
                'type': 'app_mention',
                'user': 'U1234567',
                'text': '<@U0BOTUSER> create task with metadata',
                'ts': '1234567890.123456',
                'channel': 'C1234567'
            }
            
            workspace_info = {
                'team_id': 'T1234567',
                'team_domain': 'testworkspace'
            }
            
            cleaned_text = "create task with metadata"
            task = service.create_task_from_mention(event_data, cleaned_text, workspace_info)
            
            assert isinstance(task, Task)
            assert task.text == cleaned_text
            assert task.source == "slack"
            assert hasattr(task, 'metadata')
            assert task.metadata['slack_workspace']['team_id'] == 'T1234567'
            assert task.metadata['slack_workspace']['team_domain'] == 'testworkspace'
            assert task.metadata['slack_workspace']['channel_id'] == 'C1234567'
            assert task.metadata['slack_workspace']['user_id'] == 'U1234567'
            assert task.metadata['slack_workspace']['message_ts'] == '1234567890.123456'
            
            # Verify Slack URL generation
            expected_url = "https://app.slack.com/client/T1234567/C1234567/thread/C1234567-1234567890123456"
            assert task.slack_message_url == expected_url

    def test_oauth_handler_disconnects_specific_workspace(self):
        """Test disconnecting specific workspace while keeping others."""
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': '1855513823862.9291610769799',
            'SLACK_CLIENT_SECRET': '5c26008b1917b69c5de94922fb8562a0',
            'SLACK_SIGNING_SECRET': '0efe4a3d2e74103a6bd0209f5147646e'
        }), patch('backend.utils.slack_auth.get_database') as mock_get_db:
            # Mock database
            mock_db = MagicMock()
            mock_users = Mock()
            mock_db.__getitem__.return_value = mock_users
            
            # Mock user with multiple workspaces
            mock_users.find_one.return_value = {
                'googleId': 'test-user-123',
                'slack_workspaces': {
                    'T1234567': {'connected': True, 'team_name': 'Workspace 1'},
                    'T7654321': {'connected': True, 'team_name': 'Workspace 2'}
                }
            }
            mock_users.update_one.return_value = Mock(modified_count=1)
            mock_get_db.return_value = mock_db
            
            oauth_handler = SlackOAuthHandler()
            
            # Disconnect specific workspace
            success, result = oauth_handler.revoke_user_tokens('test-user-123', 'T1234567')
            
            assert success is True
            assert 'T1234567' in result['message']
            
            # Verify correct database operation
            call_args = mock_users.update_one.call_args
            assert call_args[0][0] == {"googleId": "test-user-123"}
            assert call_args[0][1]["$unset"] == {"slack_workspaces.T1234567": ""}
            assert "metadata.lastModified" in call_args[0][1]["$set"]