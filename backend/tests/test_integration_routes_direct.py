"""
Test module for updated integration routes using direct Slack integration.

Tests the updated integration routes that use the new SlackService implementation
with direct Slack Events API, following TDD approach from dev-guide.md.
"""

import os
import json
from unittest.mock import patch, Mock, MagicMock
import pytest
from flask import Flask
from backend.apis.integration_routes import integration_bp
from backend.models.task import Task


class TestIntegrationRoutesDirect:
    """Test cases for updated integration routes using direct Slack integration."""
    
    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        app = Flask(__name__)
        app.register_blueprint(integration_bp, url_prefix='/api/integrations')
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    @patch('backend.apis.integration_routes.get_user_from_token')
    @patch('backend.apis.integration_routes.slack_service')
    def test_connect_slack_success(self, mock_slack_service, mock_get_user, client):
        """Test successful Slack connection initiation."""
        # Mock user authentication
        mock_get_user.return_value = {
            'googleId': 'test-user-123',
            'email': 'test@example.com'
        }
        
        # Mock SlackService
        mock_slack_service.initiate_oauth_flow.return_value = (True, {
            'oauth_url': 'https://slack.com/oauth/v2/authorize?client_id=...',
            'state': 'encrypted-state-123'
        })
        
        response = client.post('/api/integrations/slack/connect', 
            headers={'Authorization': 'Bearer valid-token'},
            json={}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'oauth_url' in data
        mock_slack_service.initiate_oauth_flow.assert_called_once_with('test-user-123')

    @patch('backend.apis.integration_routes.get_user_from_token')
    @patch('backend.apis.integration_routes.slack_service')
    def test_connect_slack_service_error(self, mock_slack_service, mock_get_user, client):
        """Test Slack connection with service error."""
        # Mock user authentication
        mock_get_user.return_value = {'googleId': 'test-user-123'}
        
        # Mock SlackService error
        mock_slack_service.initiate_oauth_flow.return_value = (False, {
            'error': 'OAuth initialization failed'
        })
        
        response = client.post('/api/integrations/slack/connect',
            headers={'Authorization': 'Bearer valid-token'},
            json={}
        )
        
        assert response.status_code == 500
        data = response.get_json()
        assert data['success'] is False
        assert 'OAuth initialization failed' in data['error']

    @patch('backend.apis.integration_routes.get_user_from_token')
    @patch('backend.apis.integration_routes.slack_service')
    def test_oauth_callback_success(self, mock_slack_service, mock_get_user, client):
        """Test successful OAuth callback handling."""
        # Mock user authentication
        mock_get_user.return_value = {'googleId': 'test-user-123'}
        
        # Mock SlackService OAuth completion
        mock_slack_service.complete_oauth_flow.return_value = (True, {
            'message': 'Slack integration connected successfully',
            'team_name': 'Test Workspace'
        })
        
        response = client.post('/api/integrations/slack/oauth/callback',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'code': 'oauth-code-123',
                'state': 'encrypted-state-123'
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'connected successfully' in data['message']
        mock_slack_service.complete_oauth_flow.assert_called_once_with(
            'test-user-123', 'oauth-code-123', 'encrypted-state-123'
        )

    @patch('backend.apis.integration_routes.get_user_from_token')
    @patch('backend.apis.integration_routes.slack_service')
    def test_oauth_callback_invalid_state(self, mock_slack_service, mock_get_user, client):
        """Test OAuth callback with invalid state."""
        # Mock user authentication
        mock_get_user.return_value = {'googleId': 'test-user-123'}
        
        # Mock SlackService OAuth completion failure
        mock_slack_service.complete_oauth_flow.return_value = (False, {
            'error': 'Invalid state parameter - possible CSRF attack'
        })
        
        response = client.post('/api/integrations/slack/oauth/callback',
            headers={'Authorization': 'Bearer valid-token'},
            json={
                'code': 'oauth-code-123',
                'state': 'invalid-state'
            }
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'CSRF attack' in data['error']

    @patch('backend.apis.integration_routes.get_user_from_token')
    @patch('backend.apis.integration_routes.slack_service')
    def test_get_slack_status(self, mock_slack_service, mock_get_user, client):
        """Test getting Slack integration status."""
        # Mock user authentication
        mock_get_user.return_value = {'googleId': 'test-user-123'}
        
        # Mock SlackService status
        mock_slack_service.get_integration_status.return_value = (True, {
            'connected': True,
            'token_valid': True,
            'team_id': 'T1234567'
        })
        
        response = client.get('/api/integrations/slack/status',
            headers={'Authorization': 'Bearer valid-token'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['status']['connected'] is True
        assert data['status']['token_valid'] is True

    @patch('backend.apis.integration_routes.get_user_from_token')
    @patch('backend.apis.integration_routes.slack_service')
    def test_disconnect_slack(self, mock_slack_service, mock_get_user, client):
        """Test disconnecting Slack integration."""
        # Mock user authentication
        mock_get_user.return_value = {'googleId': 'test-user-123'}
        
        # Mock SlackService disconnect
        mock_slack_service.disconnect_integration.return_value = (True, {
            'message': 'Slack integration disconnected successfully'
        })
        
        response = client.post('/api/integrations/slack/disconnect',
            headers={'Authorization': 'Bearer valid-token'},
            json={}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'disconnected successfully' in data['message']

    def test_slack_events_url_verification(self, client):
        """Test Slack Events API URL verification challenge."""
        with patch('backend.apis.integration_routes.slack_service') as mock_slack_service:
            # Mock webhook processing for URL verification
            mock_slack_service.process_webhook_event.return_value = (True, "challenge-response-123")
            
            payload = {
                'type': 'url_verification',
                'challenge': 'challenge-response-123'
            }
            
            response = client.post('/api/integrations/slack/events',
                json=payload,
                headers={
                    'X-Slack-Request-Timestamp': '1234567890',
                    'X-Slack-Signature': 'v0=valid-signature'
                }
            )
            
            assert response.status_code == 200
            assert response.get_data(as_text=True) == 'challenge-response-123'

    @patch('backend.apis.integration_routes.schedule_service')
    def test_slack_events_app_mention(self, mock_schedule_service, client):
        """Test Slack Events API app mention processing."""
        with patch('backend.apis.integration_routes.slack_service') as mock_slack_service:
            # Mock webhook processing to return a Task
            mock_task = Task(
                text="create task for meeting",
                categories=["Work"],
                source="slack",
                completed=False
            )
            mock_slack_service.process_webhook_event.return_value = (True, mock_task)
            
            # Mock schedule service
            mock_schedule_service.get_schedule_by_date.return_value = (True, {'schedule': []})
            mock_schedule_service.update_schedule_tasks.return_value = (True, {'message': 'Updated'})
            
            payload = {
                'type': 'event_callback',
                'team_id': 'T1234567',
                'event': {
                    'type': 'app_mention',
                    'user': 'U1234567',
                    'text': '<@U0BOTUSER> create task for meeting',
                    'ts': '1234567890.123456',
                    'channel': 'C1234567'
                }
            }
            
            response = client.post('/api/integrations/slack/events',
                json=payload,
                headers={
                    'X-Slack-Request-Timestamp': '1234567890',
                    'X-Slack-Signature': 'v0=valid-signature'
                }
            )
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert 'Task created successfully' in data['message']

    def test_slack_events_invalid_signature(self, client):
        """Test Slack Events API with invalid signature."""
        with patch('backend.apis.integration_routes.slack_service') as mock_slack_service:
            # Mock webhook processing to return invalid signature error
            mock_slack_service.process_webhook_event.return_value = (False, {
                'error': 'Invalid signature - unauthorized request'
            })
            
            payload = {
                'type': 'event_callback',
                'event': {'type': 'app_mention'}
            }
            
            response = client.post('/api/integrations/slack/events',
                json=payload,
                headers={
                    'X-Slack-Request-Timestamp': '1234567890',
                    'X-Slack-Signature': 'v0=invalid-signature'
                }
            )
            
            assert response.status_code == 401
            data = response.get_json()
            assert data['success'] is False
            assert 'unauthorized' in data['error'].lower()

    def test_slack_events_missing_headers(self, client):
        """Test Slack Events API with missing required headers."""
        payload = {
            'type': 'event_callback',
            'event': {'type': 'app_mention'}
        }
        
        # Test missing timestamp header
        response = client.post('/api/integrations/slack/events',
            json=payload,
            headers={'X-Slack-Signature': 'v0=signature'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'Missing required headers' in data['error']

    def test_slack_events_rate_limited(self, client):
        """Test Slack Events API with rate limiting."""
        with patch('backend.apis.integration_routes.slack_service') as mock_slack_service:
            # Mock webhook processing to return rate limit error
            mock_slack_service.process_webhook_event.return_value = (False, {
                'error': 'Rate limit exceeded for user'
            })
            
            payload = {
                'type': 'event_callback',
                'event': {
                    'type': 'app_mention',
                    'user': 'U1234567'
                }
            }
            
            response = client.post('/api/integrations/slack/events',
                json=payload,
                headers={
                    'X-Slack-Request-Timestamp': '1234567890',
                    'X-Slack-Signature': 'v0=valid-signature'
                }
            )
            
            assert response.status_code == 429
            data = response.get_json()
            assert data['success'] is False
            assert 'Rate limit exceeded' in data['error']

    @patch('backend.apis.integration_routes.schedule_service')
    def test_slack_events_schedule_creation_failure(self, mock_schedule_service, client):
        """Test Slack Events API when schedule creation fails."""
        with patch('backend.apis.integration_routes.slack_service') as mock_slack_service:
            # Mock webhook processing to return a Task
            mock_task = Task(
                text="create task for meeting",
                categories=["Work"],
                source="slack",
                completed=False
            )
            mock_slack_service.process_webhook_event.return_value = (True, mock_task)
            
            # Mock schedule service failure
            mock_schedule_service.get_schedule_by_date.return_value = (False, {'error': 'No schedule found'})
            mock_schedule_service.create_empty_schedule.return_value = (False, {
                'error': 'Failed to create schedule'
            })
            
            payload = {
                'type': 'event_callback',
                'team_id': 'T1234567',
                'event': {
                    'type': 'app_mention',
                    'user': 'U1234567',
                    'text': '<@U0BOTUSER> create task',
                    'ts': '1234567890.123456'
                }
            }
            
            response = client.post('/api/integrations/slack/events',
                json=payload,
                headers={
                    'X-Slack-Request-Timestamp': '1234567890',
                    'X-Slack-Signature': 'v0=valid-signature'
                }
            )
            
            assert response.status_code == 500
            data = response.get_json()
            assert data['success'] is False
            assert 'Failed to create schedule' in data['error']

    def test_slack_events_duplicate_message(self, client):
        """Test Slack Events API with duplicate message."""
        with patch('backend.apis.integration_routes.slack_service') as mock_slack_service:
            # Mock webhook processing to return duplicate error
            mock_slack_service.process_webhook_event.return_value = (False, {
                'error': 'Duplicate message already processed'
            })
            
            payload = {
                'type': 'event_callback',
                'team_id': 'T1234567',
                'event': {
                    'type': 'app_mention',
                    'user': 'U1234567',
                    'text': '<@U0BOTUSER> duplicate message',
                    'ts': '1234567890.123456'
                }
            }
            
            response = client.post('/api/integrations/slack/events',
                json=payload,
                headers={
                    'X-Slack-Request-Timestamp': '1234567890',
                    'X-Slack-Signature': 'v0=valid-signature'
                }
            )
            
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert 'already processed' in data['message']

    def test_slack_events_options_cors(self, client):
        """Test CORS OPTIONS request for Slack events endpoint."""
        response = client.options('/api/integrations/slack/events')
        
        assert response.status_code == 200
        data = response.get_json()
        if data:  # Only check if JSON data was returned
            assert data['status'] == 'ok'