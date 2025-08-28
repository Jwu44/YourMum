import json
from unittest.mock import patch, MagicMock
import os

import pytest

# Ensure app import
import sys
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
import application as app  # noqa: F401


@pytest.fixture
def client():
    with app.create_app(testing=True).test_client() as client:
        yield client


@patch.dict(os.environ, {
    'GOOGLE_CLIENT_ID': 'cid-123',
    'GOOGLE_CALENDAR_REDIRECT_URI': 'https://yourmum.app/api/calendar/oauth/callback'
}, clear=False)
@patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='u-123')
def test_oauth_start_builds_offline_access_url(mock_get_uid, client):
    resp = client.get('/api/calendar/oauth/start', headers={'Authorization': 'Bearer token'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    url = data['url']
    # Basic assertions about URL parameters
    assert 'client_id=cid-123' in url
    assert 'response_type=code' in url
    assert 'access_type=offline' in url
    assert 'prompt=consent' in url
    assert 'scope=' in url
    assert 'state=u-123' in url
    assert 'redirect_uri=' in url


@patch.dict(os.environ, {
    'GOOGLE_CLIENT_ID': 'cid-123',
    'GOOGLE_CLIENT_SECRET': 'csecret-xyz',
    'GOOGLE_CALENDAR_REDIRECT_URI': 'https://yourmum.app/api/calendar/oauth/callback'
}, clear=False)
@patch('backend.apis.calendar_routes.requests.post')
@patch('backend.apis.calendar_routes.ensure_calendar_watch_for_user', return_value=(True, {}))
@patch('backend.apis.calendar_routes.get_database')
def test_oauth_callback_exchanges_code_and_stores_tokens(mock_get_db, _mock_watch, mock_post, client):
    # Mock DB
    mock_users = MagicMock()
    mock_db = MagicMock()
    mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()
    mock_get_db.return_value = mock_db

    # Mock token exchange
    token_resp = MagicMock()
    token_resp.status_code = 200
    token_resp.json.return_value = {
        'access_token': 'at-new',
        'refresh_token': 'rt-new',
        'expires_in': 3600,
        'scope': 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly'
    }
    mock_post.return_value = token_resp

    resp = client.get('/api/calendar/oauth/callback?code=authcode&state=u-123')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True

    # Stored into users collection
    assert mock_users.update_one.called
    _, kwargs = mock_users.update_one.call_args
    update_doc = kwargs.get('$set') or kwargs.get('update', {}).get('$set')
    # Flexible extraction
    if update_doc is None:
        update_doc = kwargs['update']['$set'] if 'update' in kwargs else kwargs['$set']
    creds = update_doc['calendar.credentials']
    assert creds['accessToken'] == 'at-new'
    assert creds['refreshToken'] == 'rt-new'
    assert 'expiresAt' in creds


