from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
import json


def _mock_db():
    mock_db = MagicMock()
    mock_users = MagicMock()
    mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()
    return mock_db, mock_users


@patch('backend.apis.calendar_routes.ensure_calendar_watch_for_user', return_value=(True, {"watch": {"channelId": "chan-xyz"}}))
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-999')
@patch('backend.apis.calendar_routes.get_database')
def test_connect_calendar_triggers_watch_ensure(mock_get_db, _mock_uid, mock_ensure_watch, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        # Simulate successful user update and verification read
        mock_users.update_one.return_value = MagicMock(modified_count=1)
        mock_users.find_one.return_value = {
            'googleId': 'u-999',
            'calendar': {
                'connected': True,
                'credentials': {
                    'accessToken': 'at',
                    'expiresAt': datetime.now(timezone.utc)
                }
            }
        }

        payload = {
            'credentials': {
                'accessToken': 'at',
                'expiresAt': int(datetime.now(timezone.utc).timestamp() * 1000),
                'scopes': []
            },
            'timezone': 'UTC'
        }

        resp = client.post(
            '/api/calendar/connect',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': 'Bearer any-token'}
        )

        assert resp.status_code == 200
        # Ensure watch was requested for this user
        assert mock_ensure_watch.called
        args, _ = mock_ensure_watch.call_args
        assert args[0] == 'u-999'

