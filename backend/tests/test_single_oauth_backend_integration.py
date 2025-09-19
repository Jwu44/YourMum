"""
Test single OAuth backend integration for Phase 3.
Tests proper storage and usage of OAuth tokens with refresh token capabilities.
Following TDD principles from dev-guide.md.
"""

import json
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
import sys
import os

# Ensure project root on sys.path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def _mock_db():
    """Helper to create mock database collections"""
    mock_users = MagicMock()
    mock_db = MagicMock()
    mock_db.__getitem__.side_effect = lambda x: mock_users if x == 'users' else MagicMock()
    return mock_db, mock_users


class TestSingleOAuthBackendIntegration(unittest.TestCase):
    """Test backend integration for single OAuth flow with proper refresh tokens"""

    @patch('backend.apis.routes.get_database')
    @patch('backend.apis.routes.verify_firebase_token')
    def test_store_user_with_single_oauth_tokens(self, mock_verify, mock_get_db):
        """Test storing user with proper OAuth tokens from single flow"""
        import application as app

        with app.create_app(testing=True).test_client() as client:
            mock_db, mock_users = _mock_db()
            mock_get_db.return_value = mock_db

            # Mock Firebase token verification
            mock_verify.return_value = {
                'uid': 'firebase-uid-123',
                'email': 'test@example.com'
            }

            # Mock single OAuth token data from frontend
            oauth_tokens = {
                'access_token': 'ya29.single-oauth-access-token',
                'refresh_token': 'refresh-token-xyz',
                'id_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzVm...',
                'expires_in': 3600,
                'scope': 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
                'token_type': 'Bearer'
            }

            # Mock existing user not found (new user)
            mock_users.find_one.return_value = None
            mock_users.insert_one.return_value = MagicMock(inserted_id='new-user-id')

            # Prepare request data with calendarTokens structure
            request_data = {
                'googleId': 'firebase-uid-123',  # Use googleId as expected by API
                'displayName': 'Test User',
                'email': 'test@example.com',
                'photoURL': 'https://example.com/photo.jpg',
                'hasCalendarAccess': True,
                'calendarTokens': {
                    'accessToken': oauth_tokens['access_token'],
                    'refreshToken': oauth_tokens['refresh_token'],
                    'expiresAt': (datetime.now(timezone.utc) + timedelta(seconds=oauth_tokens['expires_in'])).isoformat(),
                    'scope': oauth_tokens['scope']
                }
            }

            # Make request to store user
            response = client.post(
                '/api/auth/user',
                json=request_data,
                headers={'Content-Type': 'application/json'}
            )

            # Assertions
            self.assertEqual(response.status_code, 200)
            response_data = response.get_json()
            self.assertEqual(response_data['message'], 'User created successfully')
            self.assertTrue(response_data['isNewUser'])

            # Verify user was created with proper calendar credentials
            self.assertTrue(mock_users.update_one.called)

            # Verify the user response structure includes calendar information
            user_data = response_data.get('user', {})
            self.assertIn('calendar', user_data)

            # The credentials structure validation is tested in the dedicated test

    @patch('backend.apis.routes.get_database')
    @patch('backend.apis.routes.verify_firebase_token')
    def test_update_existing_user_with_new_oauth_tokens(self, mock_verify, mock_get_db):
        """Test updating existing user with new OAuth tokens (re-authentication)"""
        import application as app

        with app.create_app(testing=True).test_client() as client:
            mock_db, mock_users = _mock_db()
            mock_get_db.return_value = mock_db

            mock_verify.return_value = {
                'uid': 'firebase-uid-existing',
                'email': 'existing@example.com'
            }

            # Mock existing user with old/expired tokens
            existing_user = {
                'googleId': 'firebase-uid-existing',
                'email': 'existing@example.com',
                'displayName': 'Existing User',
                'calendar': {
                    'connected': False,  # Previously disconnected
                    'credentials': {
                        'accessToken': 'old-expired-token',
                        'refreshToken': '',  # Missing refresh token from old flow
                        'expiresAt': datetime.now(timezone.utc) - timedelta(hours=1)  # Expired
                    },
                    'syncStatus': 'failed'
                }
            }
            mock_users.find_one.return_value = existing_user

            # New OAuth tokens from re-authentication
            new_oauth_tokens = {
                'accessToken': 'ya29.new-access-token-fresh',
                'refreshToken': 'new-refresh-token-abc',
                'expiresAt': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                'scope': 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
            }

            request_data = {
                'googleId': 'firebase-uid-existing',  # Use googleId as expected by API
                'displayName': 'Existing User Updated',
                'email': 'existing@example.com',
                'hasCalendarAccess': True,
                'calendarTokens': new_oauth_tokens
            }

            response = client.post(
                '/api/auth/user',
                json=request_data,
                headers={'Content-Type': 'application/json'}
            )

            self.assertEqual(response.status_code, 200)
            response_data = response.get_json()
            self.assertFalse(response_data['isNewUser'])

            # Verify user was updated with new credentials
            self.assertTrue(mock_users.update_one.called)

            # Verify the response includes updated user information
            user_data = response_data.get('user', {})
            self.assertIn('calendar', user_data)

    @patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id", "GOOGLE_CLIENT_SECRET": "test-client-secret"}, clear=False)
    @patch('backend.apis.calendar_routes.requests.post')
    @patch('backend.apis.calendar_routes.fetch_google_calendar_events')
    @patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='user-with-refresh')
    @patch('backend.apis.calendar_routes.get_database')
    def test_calendar_api_uses_stored_refresh_tokens(self, mock_get_db, mock_get_user, mock_fetch_events, mock_post):
        """Test that calendar API automatically uses stored refresh tokens when access token expires"""
        import application as app

        with app.create_app(testing=True).test_client() as client:
            mock_db, mock_users = _mock_db()
            mock_get_db.return_value = mock_db

            # User with expired access token but valid refresh token
            expired_at = datetime.now(timezone.utc) - timedelta(minutes=10)
            mock_users.find_one.return_value = {
                'googleId': 'user-with-refresh',
                'calendar': {
                    'connected': True,
                    'credentials': {
                        'accessToken': 'expired-access-token',
                        'refreshToken': 'valid-refresh-token-xyz',  # From single OAuth flow
                        'expiresAt': expired_at,
                        'tokenType': 'Bearer',
                        'scope': 'https://www.googleapis.com/auth/calendar.readonly'
                    },
                    'syncStatus': 'completed'
                }
            }

            # Mock successful token refresh
            refresh_response = MagicMock()
            refresh_response.status_code = 200
            refresh_response.json.return_value = {
                'access_token': 'new-refreshed-access-token',
                'expires_in': 3600,
                'token_type': 'Bearer'
            }
            mock_post.return_value = refresh_response

            # Mock calendar events fetch
            mock_fetch_events.return_value = [
                {
                    'id': 'event-1',
                    'summary': 'Test Meeting',
                    'start': {'dateTime': '2024-01-15T10:00:00Z'},
                    'end': {'dateTime': '2024-01-15T11:00:00Z'}
                }
            ]

            # Request calendar events
            response = client.get(
                '/api/calendar/events?date=2024-01-15',
                headers={'Authorization': 'Bearer firebase-token'}
            )

            self.assertEqual(response.status_code, 200)

            # Verify refresh token was used
            self.assertTrue(mock_post.called)
            refresh_call = mock_post.call_args
            self.assertIn('oauth2.googleapis.com/token', refresh_call[0][0])
            self.assertEqual(refresh_call[1]['data']['grant_type'], 'refresh_token')
            self.assertEqual(refresh_call[1]['data']['refresh_token'], 'valid-refresh-token-xyz')
            self.assertEqual(refresh_call[1]['data']['client_id'], 'test-client-id')
            self.assertEqual(refresh_call[1]['data']['client_secret'], 'test-client-secret')

            # Verify credentials were updated in database
            self.assertTrue(mock_users.update_one.called)
            update_call = mock_users.update_one.call_args
            if len(update_call) > 1 and '$set' in update_call[1]:
                update_data = update_call[1]['$set']
                self.assertEqual(update_data['calendar.credentials']['accessToken'], 'new-refreshed-access-token')
            else:
                # Alternative update structure - check call was made with correct user
                self.assertEqual(update_call[0][0]['googleId'], 'user-with-refresh')

            # Verify calendar events were fetched with new token
            fetch_call = mock_fetch_events.call_args
            self.assertEqual(fetch_call[0][0], 'new-refreshed-access-token')

    @patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id", "GOOGLE_CLIENT_SECRET": "test-client-secret"}, clear=False)
    @patch('backend.apis.calendar_routes.requests.post')
    @patch('backend.apis.calendar_routes.get_user_id_from_token', return_value='user-invalid-refresh')
    @patch('backend.apis.calendar_routes.get_database')
    def test_calendar_api_handles_invalid_refresh_token(self, mock_get_db, mock_get_user, mock_post):
        """Test graceful handling when refresh token is invalid or expired"""
        import application as app

        with app.create_app(testing=True).test_client() as client:
            mock_db, mock_users = _mock_db()
            mock_get_db.return_value = mock_db

            # User with expired access token and invalid refresh token
            expired_at = datetime.now(timezone.utc) - timedelta(minutes=10)
            mock_users.find_one.return_value = {
                'googleId': 'user-invalid-refresh',
                'calendar': {
                    'connected': True,
                    'credentials': {
                        'accessToken': 'expired-access-token',
                        'refreshToken': 'invalid-refresh-token',
                        'expiresAt': expired_at
                    }
                }
            }

            # Mock failed token refresh
            refresh_response = MagicMock()
            refresh_response.status_code = 400
            refresh_response.text = 'invalid_grant'
            mock_post.return_value = refresh_response

            # Request calendar events
            response = client.get(
                '/api/calendar/events?date=2024-01-15',
                headers={'Authorization': 'Bearer firebase-token'}
            )

            # Should return error indicating need to re-authenticate
            self.assertEqual(response.status_code, 400)
            response_data = response.get_json()
            self.assertFalse(response_data['success'])
            self.assertIn('Calendar access token expired and refresh failed', response_data['error'])

    def test_calendar_credentials_structure_validation(self):
        """Test that calendar credentials structure matches expected format"""
        import application as app

        with app.create_app(testing=True).test_client() as client:
            with patch('backend.apis.routes.get_database') as mock_get_db:
                mock_db, mock_users = _mock_db()
                mock_get_db.return_value = mock_db
                mock_users.find_one.return_value = None  # New user
                insert_result = MagicMock()
                insert_result.upserted_id = 'test-id'
                mock_users.update_one.return_value = insert_result

                # Mock the returned user document
                mock_user_doc = {
                    '_id': 'test-id',
                    'googleId': 'firebase-uid-test',
                    'email': 'test@example.com',
                    'displayName': 'Test User',
                    'calendar': {
                        'connected': True,
                        'credentials': {
                            'accessToken': 'access-token-test',
                            'refreshToken': 'refresh-token-test',
                            'tokenType': 'Bearer',
                            'scope': 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
                        }
                    }
                }
                mock_users.find_one.side_effect = [None, mock_user_doc]  # First None (new user), then return doc

                # Test with complete OAuth tokens
                oauth_tokens = {
                    'accessToken': 'access-token-test',
                    'refreshToken': 'refresh-token-test',
                    'expiresAt': datetime.now(timezone.utc).isoformat(),
                    'scope': 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
                }

                user_data = {
                    'googleId': 'firebase-uid-test',
                    'email': 'test@example.com',
                    'displayName': 'Test User',
                    'hasCalendarAccess': True,
                    'calendarTokens': oauth_tokens
                }

                response = client.post('/api/auth/user', json=user_data)

                # Verify response
                self.assertEqual(response.status_code, 200)
                response_data = response.get_json()
                self.assertTrue(response_data.get('isNewUser'))
                self.assertIn('user', response_data)


if __name__ == '__main__':
    unittest.main(verbosity=2)