from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
import json
import os


def _mock_db():
    mock_db = MagicMock()
    mock_users = MagicMock()
    mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()
    return mock_db, mock_users


@patch.dict(os.environ, {
    "GOOGLE_CLIENT_ID": "cid",
    "GOOGLE_CLIENT_SECRET": "csecret",
    "GOOGLE_CALENDAR_WEBHOOK_URL": "https://yourdai-production.up.railway.app/api/calendar/webhook"
}, clear=False)
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-123')
@patch('backend.apis.calendar_routes.get_database')
def test_ensure_watch_creates_channel_when_missing(mock_get_db, _mock_uid, mock_post, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        # User with connected calendar, valid access token, no existing watch
        future = datetime.now(timezone.utc) + timedelta(hours=1)
        mock_users.find_one.return_value = {
            'googleId': 'u-123',
            'timezone': 'UTC',
            'calendar': {
                'connected': True,
                'credentials': {
                    'accessToken': 'at',
                    'expiresAt': future
                }
            }
        }

        # Mock Google watch response
        watch_resp = MagicMock()
        watch_resp.status_code = 200
        # Google returns expiration in ms as string sometimes
        expiration_ms = int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp() * 1000)
        watch_resp.json.return_value = {
            'id': 'chan-123',
            'resourceId': 'res-456',
            'expiration': str(expiration_ms)
        }
        mock_post.return_value = watch_resp

        resp = client.post(
            '/api/calendar/watch/ensure',
            headers={'Authorization': 'Bearer any-token'}
        )

        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        assert body['watch']['channelId'] == 'chan-123'
        assert body['watch']['resourceId'] == 'res-456'

        # Ensure Google events.watch called
        assert mock_post.called
        url, kwargs = mock_post.call_args
        assert 'calendar/v3/calendars/primary/events/watch' in url[0]
        assert kwargs['headers']['Authorization'].startswith('Bearer ')
        assert kwargs['json']['type'] == 'web_hook'
        assert kwargs['json']['address'].startswith('https://')

        # Ensure user document updated with watch info
        assert mock_users.update_one.called
        call_args, call_kwargs = mock_users.update_one.call_args
        update_doc = call_kwargs if call_kwargs else call_args[1]
        set_doc = update_doc['$set']
        assert set_doc['calendar.watch']['channelId'] == 'chan-123'
        assert set_doc['calendar.watch']['resourceId'] == 'res-456'
        assert 'expiration' in set_doc['calendar.watch']
        assert 'token' in set_doc['calendar.watch']


@patch.dict(os.environ, {
    "GOOGLE_CALENDAR_WEBHOOK_URL": "https://yourdai-production.up.railway.app/api/calendar/webhook"
}, clear=False)
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-234')
@patch('backend.apis.calendar_routes.get_database')
def test_ensure_watch_noop_when_valid_watch_exists(mock_get_db, _mock_uid, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        future = datetime.now(timezone.utc) + timedelta(hours=2)
        mock_users.find_one.return_value = {
            'googleId': 'u-234',
            'calendar': {
                'connected': True,
                'credentials': {
                    'accessToken': 'at',
                    'expiresAt': future
                },
                'watch': {
                    'channelId': 'chan-ok',
                    'resourceId': 'res-ok',
                    'expiration': future,
                    'token': 'secret'
                }
            }
        }

        resp = client.post(
            '/api/calendar/watch/ensure',
            headers={'Authorization': 'Bearer any-token'}
        )

        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        assert body['watch']['channelId'] == 'chan-ok'
        # No DB update expected
        assert not mock_users.update_one.called


@patch.dict(os.environ, {
    "GOOGLE_CLIENT_ID": "cid",
    "GOOGLE_CLIENT_SECRET": "csecret",
    "GOOGLE_CALENDAR_WEBHOOK_URL": "https://yourdai-production.up.railway.app/api/calendar/webhook"
}, clear=False)
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-345')
@patch('backend.apis.calendar_routes.get_database')
def test_ensure_watch_refreshes_when_expired(mock_get_db, _mock_uid, mock_post, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        mock_db, mock_users = _mock_db()
        mock_get_db.return_value = mock_db

        past = datetime.now(timezone.utc) - timedelta(minutes=5)
        mock_users.find_one.return_value = {
            'googleId': 'u-345',
            'calendar': {
                'connected': True,
                'credentials': {
                    'accessToken': 'at',
                    'expiresAt': datetime.now(timezone.utc) + timedelta(hours=1)
                },
                'watch': {
                    'channelId': 'chan-old',
                    'resourceId': 'res-old',
                    'expiration': past,
                    'token': 'secret-old'
                }
            }
        }

        # Mock Google watch response (new channel)
        watch_resp = MagicMock()
        watch_resp.status_code = 200
        expiration_ms = int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp() * 1000)
        watch_resp.json.return_value = {
            'id': 'chan-new',
            'resourceId': 'res-new',
            'expiration': str(expiration_ms)
        }
        mock_post.return_value = watch_resp

        resp = client.post(
            '/api/calendar/watch/ensure',
            headers={'Authorization': 'Bearer any-token'}
        )

        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        assert body['watch']['channelId'] == 'chan-new'
        assert mock_post.called
        assert mock_users.update_one.called


