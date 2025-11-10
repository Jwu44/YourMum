import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
import sys
import os

# Ensure project root on sys.path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@patch('backend.apis.routes.get_user_schedules_collection')
@patch('backend.apis.routes.get_user_from_token')
def test_should_show_feedback_no_schedules(mock_get_user_from_token, mock_get_schedules, client=None):
    """Test that feedback is NOT shown when user has 0 or 1 schedule."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        # User with feedbackPromptShown=False
        mock_get_user_from_token.return_value = {
            'googleId': 'u-001',
            'feedbackPromptShown': False
        }

        # Mock schedule collection with 1 schedule
        mock_schedules = MagicMock()
        mock_schedules.count_documents.return_value = 1
        mock_get_schedules.return_value = mock_schedules

        resp = client.get(
            '/api/user/should-show-feedback',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('should_show') is False


@patch('backend.apis.routes.get_user_schedules_collection')
@patch('backend.apis.routes.get_user_from_token')
def test_should_show_feedback_multiple_schedules(mock_get_user_from_token, mock_get_schedules, client=None):
    """Test that feedback IS shown when user has 2+ schedules and hasn't seen prompt."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        # User with feedbackPromptShown=False
        mock_get_user_from_token.return_value = {
            'googleId': 'u-002',
            'feedbackPromptShown': False
        }

        # Mock schedule collection with 3 schedules
        mock_schedules = MagicMock()
        mock_schedules.count_documents.return_value = 3
        mock_get_schedules.return_value = mock_schedules

        resp = client.get(
            '/api/user/should-show-feedback',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('should_show') is True


@patch('backend.apis.routes.get_user_schedules_collection')
@patch('backend.apis.routes.get_user_from_token')
def test_should_show_feedback_already_shown(mock_get_user_from_token, mock_get_schedules, client=None):
    """Test that feedback is NOT shown if user has already seen it."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        # User with feedbackPromptShown=True
        mock_get_user_from_token.return_value = {
            'googleId': 'u-003',
            'feedbackPromptShown': True
        }

        # Mock schedule collection (shouldn't be called)
        mock_schedules = MagicMock()
        mock_get_schedules.return_value = mock_schedules

        resp = client.get(
            '/api/user/should-show-feedback',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('should_show') is False
        # Verify count_documents was never called since we short-circuit
        mock_schedules.count_documents.assert_not_called()


@patch('backend.apis.routes.get_user_from_token')
def test_should_show_feedback_no_auth(mock_get_user_from_token, client=None):
    """Test that endpoint requires authentication."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        resp = client.get('/api/user/should-show-feedback')

        assert resp.status_code == 401
        data = resp.get_json()
        assert data.get('success') is False
        assert 'Authentication required' in data.get('error', '')


@patch('backend.apis.routes.get_database')
@patch('backend.apis.routes.get_user_from_token')
def test_submit_feedback_thumbs_up(mock_get_user_from_token, mock_get_db, client=None):
    """Test submitting thumbs_up feedback."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_get_user_from_token.return_value = {'googleId': 'u-004'}

        mock_users = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda k: mock_users if k == 'users' else MagicMock()
        mock_get_db.return_value = mock_db
        mock_users.update_one.return_value = MagicMock(modified_count=1)

        payload = {'response': 'thumbs_up'}
        resp = client.post(
            '/api/user/feedback',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('success') is True

        # Verify database update
        assert mock_users.update_one.called
        args, kwargs = mock_users.update_one.call_args
        assert args[0] == {'googleId': 'u-004'}
        assert '$set' in args[1]
        assert args[1]['$set']['feedbackPromptShown'] is True
        assert args[1]['$set']['feedbackResponse'] == 'thumbs_up'
        assert 'feedbackTimestamp' in args[1]['$set']


@patch('backend.apis.routes.get_database')
@patch('backend.apis.routes.get_user_from_token')
def test_submit_feedback_thumbs_down(mock_get_user_from_token, mock_get_db, client=None):
    """Test submitting thumbs_down feedback."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_get_user_from_token.return_value = {'googleId': 'u-005'}

        mock_users = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda k: mock_users if k == 'users' else MagicMock()
        mock_get_db.return_value = mock_db
        mock_users.update_one.return_value = MagicMock(modified_count=1)

        payload = {'response': 'thumbs_down'}
        resp = client.post(
            '/api/user/feedback',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('success') is True

        # Verify database update
        assert mock_users.update_one.called
        args, kwargs = mock_users.update_one.call_args
        assert args[1]['$set']['feedbackResponse'] == 'thumbs_down'


@patch('backend.apis.routes.get_database')
@patch('backend.apis.routes.get_user_from_token')
def test_submit_feedback_dismissed(mock_get_user_from_token, mock_get_db, client=None):
    """Test submitting dismissed feedback."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_get_user_from_token.return_value = {'googleId': 'u-006'}

        mock_users = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda k: mock_users if k == 'users' else MagicMock()
        mock_get_db.return_value = mock_db
        mock_users.update_one.return_value = MagicMock(modified_count=1)

        payload = {'response': 'dismissed'}
        resp = client.post(
            '/api/user/feedback',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('success') is True

        # Verify database update
        assert mock_users.update_one.called
        args, kwargs = mock_users.update_one.call_args
        assert args[1]['$set']['feedbackResponse'] == 'dismissed'


@patch('backend.apis.routes.get_database')
@patch('backend.apis.routes.get_user_from_token')
def test_submit_feedback_invalid_response(mock_get_user_from_token, mock_get_db, client=None):
    """Test submitting invalid feedback response."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_get_user_from_token.return_value = {'googleId': 'u-007'}

        mock_users = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda k: mock_users if k == 'users' else MagicMock()
        mock_get_db.return_value = mock_db

        payload = {'response': 'invalid_value'}
        resp = client.post(
            '/api/user/feedback',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 400
        data = resp.get_json()
        assert data.get('success') is False
        assert 'Invalid response value' in data.get('error', '')

        # Verify database was NOT updated
        mock_users.update_one.assert_not_called()


@patch('backend.apis.routes.get_user_from_token')
def test_submit_feedback_no_auth(mock_get_user_from_token, client=None):
    """Test that submit feedback endpoint requires authentication."""
    import application as app
    with app.create_app(testing=True).test_client() as client:
        payload = {'response': 'thumbs_up'}
        resp = client.post(
            '/api/user/feedback',
            data=json.dumps(payload),
            content_type='application/json'
        )

        assert resp.status_code == 401
        data = resp.get_json()
        assert data.get('success') is False
        assert 'Authentication required' in data.get('error', '')
