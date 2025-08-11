from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


def _mock_db(user_doc):
    mock_db = MagicMock()
    mock_users = MagicMock()
    mock_users.find_one.return_value = user_doc
    mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()
    return mock_db, mock_users


@patch('backend.apis.calendar_routes.fetch_google_calendar_events')
@patch('backend.services.event_bus.event_bus.publish')
@patch('backend.apis.calendar_routes.schedule_service.create_schedule_from_calendar_sync', return_value=(True, {"schedule": []}))
@patch('backend.apis.calendar_routes.get_database')
def test_webhook_valid_triggers_sync_and_publish(mock_get_db, _mock_sync, mock_publish, mock_fetch, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        # Prepare user doc with matching watch and valid credentials
        user_doc = {
            'googleId': 'u-123',
            'timezone': 'UTC',
            'calendar': {
                'connected': True,
                'credentials': {
                    'accessToken': 'at',
                    'expiresAt': datetime.now(timezone.utc)
                },
                'watch': {
                    'channelId': 'chan-1',
                    'resourceId': 'res-1',
                    'token': 'tok-1',
                    'expiration': datetime.now(timezone.utc)
                }
            }
        }
        mock_db, mock_users = _mock_db(user_doc)
        mock_get_db.return_value = mock_db

        # Mock fetch events to return an empty list (we only assert publish is called)
        mock_fetch.return_value = []

        # Send webhook request with required headers
        resp = client.post(
            '/api/calendar/webhook',
            headers={
                'X-Goog-Channel-ID': 'chan-1',
                'X-Goog-Resource-ID': 'res-1',
                'X-Goog-Channel-Token': 'tok-1',
                'Content-Type': 'application/json'
            },
            data=b''
        )

        assert resp.status_code == 200

        # Verify schedule sync called with today's date
        args, kwargs = _mock_sync.call_args
        assert args[0] == 'u-123'
        # date is today's date in UTC
        assert isinstance(args[1], str) and len(args[1]) == 10
        assert isinstance(args[2], list)

        # Verify publish called
        assert mock_publish.called
        pub_args, pub_kwargs = mock_publish.call_args
        assert pub_args[0] == 'u-123'
        assert pub_args[1]['type'] == 'schedule_updated'
        assert 'date' in pub_args[1]


@patch('backend.apis.calendar_routes.fetch_google_calendar_events')
@patch('backend.services.event_bus.event_bus.publish')
@patch('backend.apis.calendar_routes.schedule_service.create_schedule_from_calendar_sync')
@patch('backend.apis.calendar_routes.get_database')
def test_webhook_no_matching_watch_is_noop(mock_get_db, mock_sync, mock_publish, mock_fetch, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        # No user found (or watch mismatch)
        mock_db, mock_users = _mock_db(None)
        mock_get_db.return_value = mock_db

        resp = client.post(
            '/api/calendar/webhook',
            headers={
                'X-Goog-Channel-ID': 'chan-x',
                'X-Goog-Resource-ID': 'res-x',
                'X-Goog-Channel-Token': 'tok-x'
            },
            data=b''
        )

        # Still respond 200 OK quickly but no actions
        assert resp.status_code == 200
        assert not mock_sync.called
        assert not mock_publish.called

