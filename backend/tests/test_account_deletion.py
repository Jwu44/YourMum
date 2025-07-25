import pytest
import json
from unittest.mock import patch, MagicMock
from flask import Flask
from backend.apis.routes import api_bp
from backend.db_config import get_database


class TestAccountDeletion:
    """Test suite for account deletion functionality (TASK-16)"""
    
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
    def mock_user_data(self):
        """Mock user data for testing"""
        return {
            'googleId': 'test-user-123',
            'email': 'test@example.com',
            'displayName': 'Test User',
            'role': 'free'
        }
    
    @pytest.fixture
    def auth_headers(self):
        """Mock authorization headers"""
        return {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
        }

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.get_database')
    def test_successful_account_deletion(self, mock_get_db, mock_get_user, client, mock_user_data, auth_headers):
        """Test successful complete account deletion"""
        # Setup mocks
        mock_get_user.return_value = mock_user_data
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock collections
        mock_collections = {}
        collection_names = [
            'users', 'UserSchedules', 'AIsuggestions', 
            'MicrostepFeedback', 'DecompositionPatterns', 
            'calendar_events', 'Processed Slack Messages'
        ]
        
        for name in collection_names:
            mock_collection = MagicMock()
            mock_collection.delete_many.return_value = MagicMock(deleted_count=1)
            mock_collections[name] = mock_collection
            mock_db.__getitem__.return_value = mock_collection
        
        # Mock Slack service
        with patch('backend.apis.routes.slack_service') as mock_slack_service:
            mock_slack_service.disconnect_slack_integration.return_value = (True, {"message": "Disconnected"})
            
            # Make request
            response = client.delete('/api/auth/user', headers=auth_headers)
            
            # Assertions
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True
            assert 'message' in response_data
            
            # Verify database deletions were called
            assert mock_db.__getitem__.call_count >= len(collection_names)

    @patch('backend.apis.routes.get_user_from_token')
    def test_account_deletion_unauthorized(self, mock_get_user, client, auth_headers):
        """Test account deletion with invalid token"""
        mock_get_user.return_value = None
        
        response = client.delete('/api/auth/user', headers=auth_headers)
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'error' in response_data

    def test_account_deletion_missing_auth(self, client):
        """Test account deletion without authorization header"""
        response = client.delete('/api/auth/user')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'Authentication required' in response_data['error']

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.get_database')
    def test_account_deletion_with_slack_failure(self, mock_get_db, mock_get_user, client, mock_user_data, auth_headers):
        """Test account deletion continues when Slack disconnection fails"""
        # Setup mocks
        mock_get_user.return_value = mock_user_data
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock successful database operations
        mock_collection = MagicMock()
        mock_collection.delete_many.return_value = MagicMock(deleted_count=1)
        mock_db.__getitem__.return_value = mock_collection
        
        # Mock Slack service failure
        with patch('backend.apis.routes.slack_service') as mock_slack_service:
            mock_slack_service.disconnect_slack_integration.return_value = (False, {"error": "Service unavailable"})
            
            # Make request
            response = client.delete('/api/auth/user', headers=auth_headers)
            
            # Should still succeed despite Slack failure
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True

    @patch('backend.apis.routes.get_user_from_token')
    @patch('backend.apis.routes.get_database')
    def test_account_deletion_database_error(self, mock_get_db, mock_get_user, client, mock_user_data, auth_headers):
        """Test account deletion handles database errors gracefully"""
        # Setup mocks
        mock_get_user.return_value = mock_user_data
        mock_get_db.side_effect = Exception("Database connection failed")
        
        # Make request
        response = client.delete('/api/auth/user', headers=auth_headers)
        
        # Should return 500 error
        assert response.status_code == 500
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert 'error' in response_data 