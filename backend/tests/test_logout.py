"""
Test Suite for Logout Functionality
Tests the logout endpoint following TDD approach from dev-guide.md
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from flask import Flask

# Import the Flask app and routes
from backend.apis.routes import api_bp


class TestLogoutFunctionality:
    """Test cases for logout functionality"""

    @pytest.fixture
    def mock_app(self):
        """Create a test Flask app with the API blueprint"""
        app = Flask(__name__)
        app.register_blueprint(api_bp, url_prefix='/api')
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, mock_app):
        """Create test client"""
        return mock_app.test_client()

    @pytest.fixture
    def mock_firebase_token_valid(self):
        """Mock valid Firebase token verification"""
        mock_user = {
            'googleId': 'test_user_123',
            'email': 'test@example.com',
            'displayName': 'Test User'
        }
        return mock_user

    @patch('backend.apis.routes.get_user_from_token')
    def test_logout_success_with_cache_headers(self, mock_get_user, client, mock_firebase_token_valid):
        """Test successful logout includes proper cache control headers"""
        # Arrange
        mock_get_user.return_value = mock_firebase_token_valid
        
        headers = {
            'Authorization': 'Bearer valid_token',
            'Content-Type': 'application/json'
        }

        # Act
        response = client.delete('/api/auth/logout', headers=headers)

        # Assert
        assert response.status_code == 200
        
        # Check response body
        data = json.loads(response.data)
        assert data['message'] == 'Logged out successfully'
        
        # Check cache control headers are present and correct
        assert 'Cache-Control' in response.headers
        cache_control = response.headers['Cache-Control']
        assert 'no-store' in cache_control
        assert 'no-cache' in cache_control
        assert 'must-revalidate' in cache_control
        assert 'private' in cache_control
        
        assert response.headers.get('Pragma') == 'no-cache'
        assert response.headers.get('Expires') == '0'

    @patch('backend.apis.routes.get_user_from_token')
    def test_logout_with_invalid_token(self, mock_get_user, client):
        """Test logout with invalid token returns 401"""
        # Arrange
        mock_get_user.return_value = None
        
        headers = {
            'Authorization': 'Bearer invalid_token',
            'Content-Type': 'application/json'
        }

        # Act
        response = client.delete('/api/auth/logout', headers=headers)

        # Assert
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Authentication required' in data['error']

    def test_logout_without_auth_header(self, client):
        """Test logout without Authorization header returns 401"""
        # Act
        response = client.delete('/api/auth/logout')

        # Assert
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'Authentication required' in data['error']

    @patch('backend.apis.routes.get_user_from_token')
    def test_logout_with_malformed_auth_header(self, mock_get_user, client):
        """Test logout with malformed Authorization header returns 401"""
        # Arrange
        headers = {
            'Authorization': 'InvalidFormat',
            'Content-Type': 'application/json'
        }

        # Act
        response = client.delete('/api/auth/logout')

        # Assert
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data

    @patch('backend.apis.routes.get_user_from_token')
    def test_logout_success_message_format(self, mock_get_user, client, mock_firebase_token_valid):
        """Test logout returns proper success message format"""
        # Arrange
        mock_get_user.return_value = mock_firebase_token_valid
        
        headers = {
            'Authorization': 'Bearer valid_token',
            'Content-Type': 'application/json'
        }

        # Act
        response = client.delete('/api/auth/logout', headers=headers)

        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        assert isinstance(data['message'], str)
        assert data['message'] == 'Logged out successfully'

    @patch('backend.apis.routes.get_user_from_token')
    def test_logout_content_type_header(self, mock_get_user, client, mock_firebase_token_valid):
        """Test logout response has correct content type"""
        # Arrange
        mock_get_user.return_value = mock_firebase_token_valid
        
        headers = {
            'Authorization': 'Bearer valid_token',
            'Content-Type': 'application/json'
        }

        # Act
        response = client.delete('/api/auth/logout', headers=headers)

        # Assert
        assert response.status_code == 200
        assert response.headers.get('Content-Type') == 'application/json' 