import json
from unittest.mock import patch, MagicMock
import sys
import os

# Ensure project root on sys.path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@patch('backend.apis.routes.get_database')
@patch('backend.apis.routes.get_user_from_token')
def test_update_timezone_success(mock_get_user_from_token, mock_get_db, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        # Arrange user and DB
        mock_get_user_from_token.return_value = { 'googleId': 'u-777' }
        mock_users = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda k: mock_users if k == 'users' else MagicMock()
        mock_get_db.return_value = mock_db

        mock_users.update_one.return_value = MagicMock(modified_count=1)

        payload = { 'timezone': 'Australia/Sydney' }
        resp = client.put(
            '/api/user/timezone',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('success') is True
        # Confirm DB update
        assert mock_users.update_one.called
        args, kwargs = mock_users.update_one.call_args
        # Filter by googleId
        assert args[0] == { 'googleId': 'u-777' }
        # $set contains timezone
        assert '$set' in args[1]
        assert args[1]['$set'].get('timezone') == 'Australia/Sydney'


@patch('backend.apis.routes.get_database')
@patch('backend.apis.routes.get_user_from_token')
def test_update_timezone_invalid_tz_returns_400(mock_get_user_from_token, mock_get_db, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_get_user_from_token.return_value = { 'googleId': 'u-888' }
        mock_users = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda k: mock_users if k == 'users' else MagicMock()
        mock_get_db.return_value = mock_db

        payload = { 'timezone': 'Not/A_Timezone' }
        resp = client.put(
            '/api/user/timezone',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer token'}
        )

        assert resp.status_code == 400
        body = resp.get_json()
        assert body.get('success') is False
        assert 'Invalid timezone' in (body.get('error') or '')


