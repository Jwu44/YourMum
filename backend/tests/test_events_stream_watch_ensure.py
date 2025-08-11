from unittest.mock import patch


@patch('backend.apis.calendar_routes.ensure_calendar_watch_for_user', return_value=(True, {}))
@patch('backend.apis.routes.get_user_from_token', return_value={'googleId': 'u-777'})
def test_sse_stream_ensures_watch(_mock_user, mock_ensure, client=None):
    import application as app
    with app.create_app(testing=True).test_client() as client:
        # Hit SSE endpoint (it will return a streaming response)
        resp = client.get('/api/events/stream?token=any')

        # Should still return 200 and have attempted to ensure the watch
        assert resp.status_code == 200
        assert mock_ensure.called
        args, _ = mock_ensure.call_args
        assert args[0] == 'u-777'

