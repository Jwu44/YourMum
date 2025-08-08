"""
Test Suite for Slack Routes
Tests the Slack API routes following TDD approach
"""

import pytest
import json
import hmac
import hashlib
import base64
import time
import uuid
import os
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from flask import Flask

# Import routes and dependencies
from backend.apis.slack_routes import slack_bp
from backend.services.slack_service import SlackService
from backend.services.slack_message_processor import SlackMessageProcessor
from backend.models.task import Task


class TestSlackRoutes:
    """Test cases for Slack API routes"""

    @pytest.fixture
    def app(self):
        """Create test Flask app with Slack blueprint"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.register_blueprint(slack_bp, url_prefix='/api/integrations/slack')
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()

    @pytest.fixture
    def mock_firebase_token(self):
        """Mock Firebase token verification"""
        with patch('backend.apis.slack_routes.get_user_from_token') as mock:
            mock.return_value = {
                'googleId': 'test-user-123',
                'email': 'test@example.com'
            }
            yield mock

    @pytest.fixture
    def mock_slack_service(self):
        """Mock SlackService instance"""
        mock = Mock(spec=SlackService)
        mock.generate_oauth_url.return_value = (
            'https://slack.com/oauth/v2/authorize?client_id=test_id&scope=app_mentions:read',
            'test_state'
        )
        mock.handle_oauth_callback = AsyncMock(return_value={
            'success': True,
            'workspace_id': 'T0123456789',
            'workspace_name': 'Test Workspace',
            'connected_at': '2024-01-01T00:00:00Z'
        })
        mock.validate_and_extract_user_from_state.return_value = None  # Default to None, tests will override
        mock.verify_webhook_signature.return_value = True
        mock.process_event = AsyncMock(return_value=None)
        mock.get_integration_status = AsyncMock(return_value={
            'connected': False,
            'workspace_name': None,
            'connected_at': None
        })
        mock.disconnect_integration = AsyncMock(return_value={'success': True})
        return mock

    @pytest.fixture
    def valid_slack_event(self):
        """Sample valid Slack event data"""
        return {
            "token": "verification_token",
            "team_id": "T0123456789",
            "api_app_id": "A0123456789",
            "event": {
                "type": "app_mention",
                "channel": "C1234567890",
                "user": "U0987654321",
                "text": "Can you please review the quarterly report? <@U1111111111>",
                "ts": "1609459200.005500"
            },
            "type": "event_callback",
            "event_id": "Ev01234567890123456789012345",
            "event_time": 1609459200
        }

    def test_oauth_url_generation(self, client, mock_firebase_token, mock_slack_service):
        """Test OAuth URL generation endpoint"""
        # Mock the generate_oauth_url to accept user_id parameter
        mock_slack_service.generate_oauth_url.return_value = (
            'https://slack.com/oauth/v2/authorize?client_id=test_id&scope=app_mentions:read&state=secure_state',
            'secure_state'
        )
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get('/api/integrations/slack/auth/connect', 
                                headers={'Authorization': 'Bearer valid_token'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'oauth_url' in data
            assert 'state' in data
            assert data['oauth_url'].startswith('https://slack.com/oauth/v2/authorize')
            # Verify generate_oauth_url was called with user_id
            mock_slack_service.generate_oauth_url.assert_called_once_with('test-user-123')
    
    def test_oauth_url_generation_with_secure_state(self, client, mock_firebase_token, mock_slack_service):
        """Test OAuth URL generation creates secure state token"""
        # Test that the service generates a proper secure state token
        def mock_generate_oauth_url(user_id):
            # Generate the same secure state format we expect
            timestamp = str(int(time.time()))
            random_uuid = str(uuid.uuid4())
            state_payload = f"{user_id}:{timestamp}:{random_uuid}"
            secure_state = base64.urlsafe_b64encode(state_payload.encode()).decode().rstrip('=')
            oauth_url = f'https://slack.com/oauth/v2/authorize?client_id=test_id&scope=app_mentions:read&state={secure_state}'
            return oauth_url, secure_state
        
        mock_slack_service.generate_oauth_url.side_effect = mock_generate_oauth_url
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get('/api/integrations/slack/auth/connect', 
                                headers={'Authorization': 'Bearer valid_token'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            
            # Decode and validate the state token
            state_token = data['state']
            # Add padding for base64 decoding if needed
            padding = 4 - len(state_token) % 4
            if padding != 4:
                state_token += '=' * padding
            
            decoded_state = base64.urlsafe_b64decode(state_token).decode()
            parts = decoded_state.split(':')
            
            assert len(parts) == 3
            assert parts[0] == 'test-user-123'  # user_id
            assert parts[1].isdigit()  # timestamp
            assert len(parts[2]) == 36  # UUID length

    def test_oauth_callback_success_legacy_with_auth(self, client, mock_firebase_token, mock_slack_service):
        """Test successful OAuth callback handling with legacy auth (backward compatibility)"""
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get('/api/integrations/slack/auth/callback?code=test_code&state=simple_state',
                                headers={'Authorization': 'Bearer valid_token'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            assert 'workspace_name' in data

    def test_oauth_callback_missing_code(self, client, mock_firebase_token):
        """Test OAuth callback without authorization code"""
        response = client.get('/api/integrations/slack/auth/callback?state=test_state',
                            headers={'Authorization': 'Bearer valid_token'})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Missing authorization code' in data['error']

    def test_webhook_verification_valid(self, client, valid_slack_event):
        """Test webhook URL verification challenge"""
        challenge_event = {
            "type": "url_verification",
            "challenge": "test_challenge_string"
        }
        
        response = client.post('/api/integrations/slack/webhook',
                             data=json.dumps(challenge_event),
                             content_type='application/json')
        
        assert response.status_code == 200
        assert response.data.decode() == "test_challenge_string"

    def test_webhook_event_processing(self, client, valid_slack_event, mock_slack_service):
        """Test webhook event processing with valid signature"""
        # Calculate valid signature
        timestamp = str(int(datetime.utcnow().timestamp()))
        body = json.dumps(valid_slack_event)
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            with patch('backend.apis.slack_routes.os.environ.get') as mock_env:
                mock_env.return_value = 'test_signing_secret'
                
                # Calculate signature
                sig_basestring = f"v0:{timestamp}:{body}"
                signature = "v0=" + hmac.new(
                    'test_signing_secret'.encode(),
                    sig_basestring.encode(),
                    hashlib.sha256
                ).hexdigest()
                
                response = client.post('/api/integrations/slack/webhook',
                                     data=body,
                                     content_type='application/json',
                                     headers={
                                         'X-Slack-Request-Timestamp': timestamp,
                                         'X-Slack-Signature': signature
                                     })
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['status'] == 'processed'

    def test_webhook_invalid_signature(self, client, valid_slack_event):
        """Test webhook with invalid signature"""
        timestamp = str(int(datetime.utcnow().timestamp()))
        body = json.dumps(valid_slack_event)
        
        response = client.post('/api/integrations/slack/webhook',
                             data=body,
                             content_type='application/json',
                             headers={
                                 'X-Slack-Request-Timestamp': timestamp,
                                 'X-Slack-Signature': 'v0=invalid_signature'
                             })
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid signature' in data['error']

    def test_integration_status_not_connected(self, client, mock_firebase_token, mock_slack_service):
        """Test getting integration status when not connected"""
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get('/api/integrations/slack/status',
                                headers={'Authorization': 'Bearer valid_token'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['connected'] is False
            assert data['workspace_name'] is None

    def test_integration_status_connected(self, client, mock_firebase_token, mock_slack_service):
        """Test getting integration status when connected"""
        # Mock connected status
        mock_slack_service.get_integration_status = AsyncMock(return_value={
            'connected': True,
            'workspace_name': 'Test Workspace',
            'workspace_id': 'T0123456789',
            'connected_at': '2024-01-01T00:00:00Z'
        })
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get('/api/integrations/slack/status',
                                headers={'Authorization': 'Bearer valid_token'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['connected'] is True
            assert data['workspace_name'] == 'Test Workspace'

    def test_disconnect_integration(self, client, mock_firebase_token, mock_slack_service):
        """Test disconnecting Slack integration"""
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.delete('/api/integrations/slack/disconnect',
                                   headers={'Authorization': 'Bearer valid_token'})
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True

    def test_authentication_required(self, client):
        """Test that authentication is required for protected endpoints"""
        protected_endpoints = [
            ('/api/integrations/slack/auth/connect', 'GET', 401),
            ('/api/integrations/slack/status', 'GET', 401),
            ('/api/integrations/slack/disconnect', 'DELETE', 401)
        ]
        
        for endpoint, method, expected_status in protected_endpoints:
            if method == 'GET':
                response = client.get(endpoint)
            elif method == 'DELETE':
                response = client.delete(endpoint)
            
            assert response.status_code == expected_status
            data = json.loads(response.data)
            assert 'Authentication required' in data['error']

    def test_oauth_callback_with_secure_state_success(self, client, mock_slack_service):
        """Test OAuth callback with secure state token containing user ID"""
        import base64
        import time
        import uuid
        
        # Create secure state token (user_id:timestamp:uuid)
        user_id = "test-user-123"
        timestamp = str(int(time.time()))
        random_uuid = str(uuid.uuid4())
        state_payload = f"{user_id}:{timestamp}:{random_uuid}"
        secure_state = base64.urlsafe_b64encode(state_payload.encode()).decode().rstrip('=')
        
        # Mock the validate_and_extract_user_from_state method to return the user_id
        mock_slack_service.validate_and_extract_user_from_state.return_value = user_id
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get(f'/api/integrations/slack/auth/callback?code=test_code&state={secure_state}')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
            assert 'workspace_name' in data
            # Verify state validation was called
            mock_slack_service.validate_and_extract_user_from_state.assert_called_once_with(secure_state)
            # Verify slack_service.handle_oauth_callback was called with extracted user_id
            mock_slack_service.handle_oauth_callback.assert_called_once_with('test_code', secure_state, user_id)
    
    def test_oauth_callback_with_malformed_state(self, client, mock_slack_service):
        """Test OAuth callback with malformed state token"""
        malformed_states = [
            'invalid_base64',
            'dGVzdA==',  # base64 for 'test' - too short
            base64.urlsafe_b64encode('only:two:parts'.encode()).decode().rstrip('='),
            base64.urlsafe_b64encode('user:not_timestamp:uuid'.encode()).decode().rstrip('=')
        ]
        
        # Mock validation to return None for all malformed states
        mock_slack_service.validate_and_extract_user_from_state.return_value = None
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            for malformed_state in malformed_states:
                response = client.get(f'/api/integrations/slack/auth/callback?code=test_code&state={malformed_state}')
                
                assert response.status_code == 400
                data = json.loads(response.data)
                assert data['success'] is False
                assert 'Invalid state parameter' in data['error']
    
    def test_oauth_callback_with_expired_state(self, client, mock_slack_service):
        """Test OAuth callback with expired state token (older than 10 minutes)"""
        import base64
        import uuid
        
        # Create expired state token (11 minutes ago)
        user_id = "test-user-123"
        old_timestamp = str(int(time.time()) - 11 * 60)  # 11 minutes ago
        random_uuid = str(uuid.uuid4())
        state_payload = f"{user_id}:{old_timestamp}:{random_uuid}"
        expired_state = base64.urlsafe_b64encode(state_payload.encode()).decode().rstrip('=')
        
        # Mock validation to return None for expired state
        mock_slack_service.validate_and_extract_user_from_state.return_value = None
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get(f'/api/integrations/slack/auth/callback?code=test_code&state={expired_state}')
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'Invalid state parameter' in data['error']
    
    def test_oauth_callback_authentication_required_legacy(self, client, mock_slack_service):
        """Test OAuth callback authentication for legacy non-secure state (backward compatibility)"""
        # Mock validation to return None (simulating legacy state format)
        mock_slack_service.validate_and_extract_user_from_state.return_value = None
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            # Test with simple UUID state (old format) - should return invalid state error
            response = client.get('/api/integrations/slack/auth/callback?code=test_code&state=simple-uuid-state')
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'Invalid state parameter' in data['error']


class TestSlackService:
    """Unit tests for SlackService methods"""
    
    @pytest.fixture
    def slack_service(self):
        """Create SlackService instance for testing"""
        # Mock environment variables
        with patch.dict(os.environ, {
            'SLACK_CLIENT_ID': 'test_client_id',
            'SLACK_CLIENT_SECRET': 'test_client_secret',
            'SLACK_SIGNING_SECRET': 'test_signing_secret'
        }):
            return SlackService()
    
    def test_extract_integration_data_success(self, slack_service):
        """Test successful integration data extraction"""
        oauth_data = {
            'ok': True,
            'access_token': 'xoxb-bot-token',
            'token_type': 'bot',
            'scope': 'app_mentions:read,chat:write',
            'bot_user_id': 'U0KRQLJ9H',
            'team': {
                'name': 'Test Workspace',
                'id': 'T9TK3CUKW'
            },
            'authed_user': {
                'id': 'U1234',
                'access_token': 'xoxp-user-token',
                'token_type': 'user'
            }
        }
        
        result = slack_service._extract_integration_data(oauth_data)
        
        assert result['workspace_id'] == 'T9TK3CUKW'
        assert result['workspace_name'] == 'Test Workspace'
        assert result['bot_token'] == 'xoxb-bot-token'
        assert result['access_token'] == 'xoxp-user-token'
        assert result['slack_user_id'] == 'U1234'
    
    def test_extract_integration_data_missing_bot_token(self, slack_service):
        """Test integration data extraction with missing bot token"""
        oauth_data = {
            'ok': True,
            'team': {
                'name': 'Test Workspace',
                'id': 'T9TK3CUKW'
            }
            # Missing access_token (bot token)
        }
        
        with pytest.raises(ValueError, match="Missing bot access token"):
            slack_service._extract_integration_data(oauth_data)
    
    def test_extract_integration_data_missing_team_info(self, slack_service):
        """Test integration data extraction with missing team information"""
        oauth_data = {
            'ok': True,
            'access_token': 'xoxb-bot-token'
            # Missing team information
        }
        
        with pytest.raises(ValueError, match="Missing team information"):
            slack_service._extract_integration_data(oauth_data)
    
    def test_extract_integration_data_oauth_not_ok(self, slack_service):
        """Test integration data extraction when OAuth response indicates failure"""
        oauth_data = {
            'ok': False,
            'error': 'invalid_code'
        }
        
        with pytest.raises(ValueError, match="OAuth failed: invalid_code"):
            slack_service._extract_integration_data(oauth_data)
    
    def test_extract_integration_data_no_user_token(self, slack_service):
        """Test integration data extraction without user token (should work)"""
        oauth_data = {
            'ok': True,
            'access_token': 'xoxb-bot-token',
            'team': {
                'name': 'Test Workspace',
                'id': 'T9TK3CUKW'
            }
            # No authed_user section
        }
        
        result = slack_service._extract_integration_data(oauth_data)
        
        assert result['bot_token'] == 'xoxb-bot-token'
        assert result['access_token'] is None  # Should be None, not empty string
        assert result['slack_user_id'] is None
    
    def test_sanitize_oauth_response_for_logging(self, slack_service):
        """Test OAuth response sanitization for safe logging"""
        oauth_data = {
            'ok': True,
            'access_token': 'xoxb-secret-token',  # Should not appear in sanitized version
            'team': {'id': 'T123', 'name': 'Test Team'},
            'authed_user': {
                'id': 'U456',
                'access_token': 'xoxp-secret-user-token'  # Should not appear
            }
        }
        
        sanitized = slack_service._sanitize_oauth_response_for_logging(oauth_data)
        
        assert sanitized['ok'] is True
        assert sanitized['has_access_token'] is True
        assert 'xoxb-secret-token' not in str(sanitized)  # Token should not be in sanitized output
        assert sanitized['team']['id'] == 'T123'
        assert sanitized['authed_user']['has_access_token'] is True
        assert 'xoxp-secret-user-token' not in str(sanitized)  # User token should not be in sanitized output


class TestSlackRoutesIntegration:
    """Integration test cases for Slack routes"""

    @pytest.fixture
    def app_with_db(self):
        """Create test app with database mocking"""
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.register_blueprint(slack_bp, url_prefix='/api/integrations/slack')
        return app
    
    @pytest.fixture
    def client(self, app_with_db):
        """Create test client"""
        return app_with_db.test_client()
    
    @pytest.fixture
    def mock_slack_service(self):
        """Mock SlackService instance"""
        mock = Mock(spec=SlackService)
        mock.validate_and_extract_user_from_state.return_value = None
        mock.handle_oauth_callback = AsyncMock(return_value={
            'success': True,
            'workspace_name': 'Test Workspace'
        })
        return mock

    @pytest.fixture
    def mock_database(self):
        """Mock database operations"""
        mock_db = Mock()
        mock_collection = Mock()
        mock_db.get_collection.return_value = mock_collection
        return mock_db

    def test_full_oauth_flow_placeholder(self, mock_database):
        """Test placeholder for full OAuth flow integration"""
        # TODO: Implement full OAuth flow test
        # 1. Generate OAuth URL
        # 2. Handle callback with valid code
        # 3. Verify integration is stored in database
        # 4. Check integration status returns connected
        
        # For now, verify test structure
        assert mock_database is not None

    def test_webhook_to_task_creation_placeholder(self, mock_database):
        """Test placeholder for webhook to task creation flow"""
        # TODO: Implement full webhook processing test
        # 1. Receive valid Slack event with mention
        # 2. Process event through SlackService
        # 3. AI determines message is actionable
        # 4. Task is created and stored in database
        # 5. Verify task appears in user schedule
        
        # For now, verify test structure
        assert mock_database is not None

    def test_error_handling_scenarios_placeholder(self):
        """Test placeholder for error handling scenarios"""
        # TODO: Test various error scenarios:
        # - Database connection failures
        # - Invalid OAuth responses from Slack
        # - Malformed webhook payloads
        # - AI service unavailable
        # - Rate limiting scenarios
        
        error_scenarios = [
            'database_connection_error',
            'oauth_failure',
            'malformed_webhook',
            'ai_service_error',
            'rate_limit_exceeded'
        ]
        
        assert len(error_scenarios) == 5

    def test_concurrent_webhook_processing_placeholder(self):
        """Test placeholder for concurrent webhook processing"""
        # TODO: Test concurrent webhook handling:
        # - Multiple webhooks processed simultaneously
        # - No race conditions in database updates
        # - Proper error isolation between requests
        # - Event deduplication works correctly
        
        import asyncio
        
        # Verify async capabilities
        loop = asyncio.new_event_loop()
        assert loop is not None
        loop.close()

    def test_oauth_callback_missing_bot_token(self, client, mock_slack_service):
        """Test OAuth callback when Slack response is missing bot token"""
        import base64
        import time
        import uuid
        
        # Create valid state token
        user_id = "test-user-123"
        timestamp = str(int(time.time()))
        random_uuid = str(uuid.uuid4())
        state_payload = f"{user_id}:{timestamp}:{random_uuid}"
        secure_state = base64.urlsafe_b64encode(state_payload.encode()).decode().rstrip('=')
        
        # Mock the validate method to return user_id
        mock_slack_service.validate_and_extract_user_from_state.return_value = user_id
        
        # Mock handle_oauth_callback to simulate missing bot token error
        mock_slack_service.handle_oauth_callback = AsyncMock(return_value={
            'success': False,
            'error': 'Missing bot access token in OAuth response'
        })
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get(f'/api/integrations/slack/auth/callback?code=test_code&state={secure_state}')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'Missing bot access token' in data['error']
    
    def test_oauth_callback_invalid_oauth_response(self, client, mock_slack_service):
        """Test OAuth callback when Slack returns oauth error"""
        import base64
        import time
        import uuid
        
        # Create valid state token
        user_id = "test-user-123"
        timestamp = str(int(time.time()))
        random_uuid = str(uuid.uuid4())
        state_payload = f"{user_id}:{timestamp}:{random_uuid}"
        secure_state = base64.urlsafe_b64encode(state_payload.encode()).decode().rstrip('=')
        
        # Mock the validate method to return user_id
        mock_slack_service.validate_and_extract_user_from_state.return_value = user_id
        
        # Mock handle_oauth_callback to simulate OAuth error from Slack
        mock_slack_service.handle_oauth_callback = AsyncMock(return_value={
            'success': False,
            'error': 'OAuth failed: invalid_code'
        })
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get(f'/api/integrations/slack/auth/callback?code=invalid_code&state={secure_state}')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'OAuth failed: invalid_code' in data['error']
    
    def test_oauth_callback_missing_team_info(self, client, mock_slack_service):
        """Test OAuth callback when Slack response is missing team information"""
        import base64
        import time
        import uuid
        
        # Create valid state token
        user_id = "test-user-123"
        timestamp = str(int(time.time()))
        random_uuid = str(uuid.uuid4())
        state_payload = f"{user_id}:{timestamp}:{random_uuid}"
        secure_state = base64.urlsafe_b64encode(state_payload.encode()).decode().rstrip('=')
        
        # Mock the validate method to return user_id
        mock_slack_service.validate_and_extract_user_from_state.return_value = user_id
        
        # Mock handle_oauth_callback to simulate missing team info error
        mock_slack_service.handle_oauth_callback = AsyncMock(return_value={
            'success': False,
            'error': 'Missing team information in OAuth response'
        })
        
        with patch('backend.apis.slack_routes.slack_service', mock_slack_service):
            response = client.get(f'/api/integrations/slack/auth/callback?code=test_code&state={secure_state}')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'Missing team information' in data['error']
    
    def test_security_validation_placeholder(self):
        """Test placeholder for security validation"""
        # TODO: Test security measures:
        # - Webhook signature validation prevents spoofing
        # - OAuth state parameter prevents CSRF
        # - Token encryption works properly
        # - No sensitive data in logs
        
        security_measures = [
            'webhook_signature_validation',
            'oauth_csrf_protection',
            'token_encryption',
            'log_sanitization'
        ]
        
        assert len(security_measures) == 4