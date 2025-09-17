"""
Test for OAuth callback endpoint that handles initial authentication flow.

This endpoint handles the authorization code exchange for the single OAuth flow
without requiring a Firebase token (solves chicken-and-egg problem).
"""

import json
import unittest
from unittest.mock import patch, MagicMock
from flask import Flask
import sys
import os

# Ensure project root on sys.path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.apis.routes import auth_bp


class TestAuthOAuthCallback(unittest.TestCase):
    """Test cases for the /api/auth/oauth-callback endpoint."""

    def setUp(self):
        """Set up test Flask app and client."""
        self.app = Flask(__name__)
        self.app.register_blueprint(auth_bp, url_prefix='/api/auth')
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    @patch('backend.apis.routes.requests.post')
    @patch('backend.apis.routes.get_database')
    @patch('backend.apis.routes.db_create_or_update_user')
    @patch('backend.apis.routes.process_user_for_response')
    @patch('backend.apis.routes._prepare_user_data_for_storage')
    def test_oauth_callback_success(self, mock_prepare_user, mock_process_user, mock_create_user, mock_get_db, mock_requests_post):
        """Test successful OAuth callback with authorization code exchange."""
        # Mock Google OAuth response
        mock_google_response = MagicMock()
        mock_google_response.status_code = 200
        mock_google_response.json.return_value = {
            'access_token': 'mock_access_token',
            'refresh_token': 'mock_refresh_token',
            'id_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXVkIjoidGVzdF9jbGllbnRfaWQiLCJzdWIiOiJ0ZXN0X3VzZXJfaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwicGljdHVyZSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vYXZhdGFyLmpwZyIsImV4cCI6OTk5OTk5OTk5OX0.mock_signature',
            'expires_in': 3600,
            'scope': 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
        }
        mock_requests_post.return_value = mock_google_response

        # Mock database and user functions
        mock_db = MagicMock()
        mock_users_collection = MagicMock()
        mock_db.__getitem__.return_value = mock_users_collection
        mock_get_db.return_value = mock_db

        # Mock user data preparation and storage
        mock_prepare_user.return_value = {'processed': 'user_data'}
        mock_create_user.return_value = {'googleId': 'test_user_id', 'email': 'test@example.com'}
        mock_process_user.return_value = {'serialized': 'user_data'}
        mock_users_collection.find_one.return_value = None  # New user

        # Test request
        request_data = {
            'authorization_code': 'test_auth_code',
            'state': 'test_state'
        }

        response = self.client.post(
            '/api/auth/oauth-callback',
            data=json.dumps(request_data),
            content_type='application/json'
        )

        # Assertions
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'user' in response_data
        assert 'tokens' in response_data
        assert response_data['user']['serialized'] == 'user_data'
        assert response_data['tokens']['access_token'] == 'mock_access_token'
        assert response_data['tokens']['refresh_token'] == 'mock_refresh_token'

        # Verify Google OAuth was called correctly
        mock_requests_post.assert_called_once()
        call_args = mock_requests_post.call_args
        assert call_args[0][0] == 'https://oauth2.googleapis.com/token'

        # Verify user creation was called
        mock_create_user.assert_called_once()
        mock_prepare_user.assert_called_once()
        mock_process_user.assert_called_once()

    def test_oauth_callback_missing_code(self):
        """Test OAuth callback with missing authorization code."""
        request_data = {'state': 'test_state'}

        response = self.client.post(
            '/api/auth/oauth-callback',
            data=json.dumps(request_data),
            content_type='application/json'
        )

        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'authorization_code' in response_data['error']

    def test_oauth_callback_missing_state(self):
        """Test OAuth callback with missing state parameter."""
        request_data = {'authorization_code': 'test_code'}

        response = self.client.post(
            '/api/auth/oauth-callback',
            data=json.dumps(request_data),
            content_type='application/json'
        )

        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'state' in response_data['error']

    @patch('backend.apis.routes.requests.post')
    def test_oauth_callback_google_error(self, mock_requests_post):
        """Test OAuth callback when Google OAuth returns error."""
        # Mock Google OAuth error response
        mock_google_response = MagicMock()
        mock_google_response.status_code = 400
        mock_google_response.text = 'invalid_grant'
        mock_requests_post.return_value = mock_google_response

        request_data = {
            'authorization_code': 'invalid_code',
            'state': 'test_state'
        }

        response = self.client.post(
            '/api/auth/oauth-callback',
            data=json.dumps(request_data),
            content_type='application/json'
        )

        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'Google OAuth token exchange failed' in response_data['error']

    @patch('backend.apis.routes.requests.post')
    def test_oauth_callback_missing_environment_vars(self, mock_requests_post):
        """Test OAuth callback with missing environment variables."""
        with patch.dict('os.environ', {}, clear=True):
            request_data = {
                'authorization_code': 'test_code',
                'state': 'test_state'
            }

            response = self.client.post(
                '/api/auth/oauth-callback',
                data=json.dumps(request_data),
                content_type='application/json'
            )

            assert response.status_code == 500
            response_data = json.loads(response.data)
            assert response_data['success'] is False
            assert 'Google OAuth credentials not configured' in response_data['error']

    @patch('backend.apis.routes.requests.post')
    @patch('backend.apis.routes.get_database')
    def test_oauth_callback_invalid_id_token(self, mock_get_db, mock_requests_post):
        """Test OAuth callback with invalid ID token format."""
        # Mock Google OAuth response with invalid ID token
        mock_google_response = MagicMock()
        mock_google_response.status_code = 200
        mock_google_response.json.return_value = {
            'access_token': 'mock_access_token',
            'refresh_token': 'mock_refresh_token',
            'id_token': 'invalid.token.format',
            'expires_in': 3600,
            'scope': 'openid email profile'
        }
        mock_requests_post.return_value = mock_google_response

        request_data = {
            'authorization_code': 'test_code',
            'state': 'test_state'
        }

        response = self.client.post(
            '/api/auth/oauth-callback',
            data=json.dumps(request_data),
            content_type='application/json'
        )

        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'Invalid ID token' in response_data['error']


if __name__ == '__main__':
    unittest.main()