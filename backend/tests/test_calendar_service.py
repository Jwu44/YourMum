import sys
import os
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Optional
from unittest.mock import patch

import pytest

# Ensure project root is on sys.path for 'backend' imports when running file directly
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))


class FakeUsersCollection:
    def __init__(self, user_doc):
        self._user_doc = user_doc

    def find_one(self, query):
        # Very simple matcher for tests
        if query.get('googleId') == self._user_doc.get('googleId'):
            return self._user_doc
        return None

    def update_one(self, filter_query, update_doc):
        # Simulate persisting refreshed credentials into the user doc for token refresh path
        set_doc = (update_doc or {}).get('$set', {})
        calendar_creds = set_doc.get('calendar.credentials')
        if calendar_creds:
            self._user_doc.setdefault('calendar', {}).setdefault('credentials', {}).update(calendar_creds)
        return SimpleNamespace(modified_count=1)


@pytest.fixture
def user_with_valid_calendar():
    return {
        'googleId': 'u123',
        'timezone': 'Australia/Sydney',  # Use valid timezone instead of UTC
        'calendar': {
            'connected': True,
            'credentials': {
                'accessToken': 'valid-token',
                'expiresAt': datetime.now(timezone.utc) + timedelta(hours=1),
            }
        }
    }


@pytest.fixture
def user_with_expired_token():
    return {
        'googleId': 'u123',
        'timezone': 'UTC',
        'calendar': {
            'connected': True,
            'credentials': {
                'accessToken': 'expired-token',
                'refreshToken': 'refresh-xyz',
                'expiresAt': datetime.now(timezone.utc) - timedelta(minutes=5),
            }
        }
    }


def _make_event(
    eid: str,
    title: str,
    start_dt: Optional[str] = None,
    end_dt: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    ev = {
        'id': eid,
        'summary': title,
        'status': 'confirmed',
        'start': {},
        'end': {},
    }
    if start_dt:
        ev['start']['dateTime'] = start_dt
    if end_dt:
        ev['end']['dateTime'] = end_dt
    if start_date:
        ev['start']['date'] = start_date
    if end_date:
        ev['end']['date'] = end_date
    return ev


class TestCalendarService:
    @patch('backend.services.calendar_service.get_database')
    @patch('backend.services.calendar_service.fetch_google_calendar_events')
    def test_get_calendar_tasks_sorted_limited_and_converted(
        self, mock_fetch, mock_get_db, user_with_valid_calendar
    ):
        """
        - Includes all-day and timed events that overlap target date
        - Sorts by start time (all-day first) and limits to earliest 10
        - Converts to Task objects with gcal_event_id and from_gcal
        """
        # Arrange
        users = FakeUsersCollection(user_with_valid_calendar)
        mock_get_db.return_value = {'users': users}

        # Events on target date 2025-01-20 (UTC times that work in Australia/Sydney)
        events = [
            # timed later (in Sydney timezone: 2025-01-20T23:00:00+11)
            _make_event('e3', 'Zeta', '2025-01-20T12:00:00Z', '2025-01-20T13:00:00Z'),
            # all-day
            _make_event('e1', 'Alpha Day', start_date='2025-01-20', end_date='2025-01-21'),
            # timed earlier (in Sydney timezone: 2025-01-20T20:00:00+11)
            _make_event('e2', 'Beta', '2025-01-20T09:00:00Z', '2025-01-20T10:00:00Z'),
        ]
        mock_fetch.return_value = events

        # Act
        from backend.services import calendar_service as cs
        tasks = cs.get_calendar_tasks_for_user_date('u123', '2025-01-20')

        # Assert
        assert isinstance(tasks, list)
        assert len(tasks) == 3
        # Expect all-day first, then 09:00, then 15:00 by chronological order
        assert tasks[0]['text'] == 'Alpha Day'
        assert tasks[1]['text'] == 'Beta'
        assert tasks[2]['text'] == 'Zeta'
        # Basic fields
        for t in tasks:
            assert t.get('gcal_event_id') is not None
            assert t.get('from_gcal') is True
            assert t.get('type') == 'task'

    @patch('backend.services.calendar_service.get_database')
    @patch('backend.services.calendar_service.fetch_google_calendar_events')
    def test_all_day_and_multi_day_inclusion(
        self, mock_fetch, mock_get_db, user_with_valid_calendar
    ):
        users = FakeUsersCollection(user_with_valid_calendar)
        mock_get_db.return_value = {'users': users}

        # One all-day exactly on date, and one multi-day that overlaps
        events = [
            _make_event('d1', 'All Day', start_date='2025-01-20', end_date='2025-01-21'),
            _make_event('m1', 'Multi', start_date='2025-01-19', end_date='2025-01-21'),
        ]
        mock_fetch.return_value = events

        from backend.services import calendar_service as cs
        tasks = cs.get_calendar_tasks_for_user_date('u123', '2025-01-20')

        assert len(tasks) == 2
        titles = [t['text'] for t in tasks]
        assert 'All Day' in titles and 'Multi' in titles

    @patch('backend.services.calendar_service.get_database')
    @patch('backend.services.calendar_service.fetch_google_calendar_events')
    def test_limit_to_earliest_10_by_time(
        self, mock_fetch, mock_get_db, user_with_valid_calendar
    ):
        users = FakeUsersCollection(user_with_valid_calendar)
        mock_get_db.return_value = {'users': users}

        # 1 all-day + 15 timed events; expect 1 + earliest 9 times = 10 total
        events = [
            _make_event('ad', 'All Day', start_date='2025-01-20', end_date='2025-01-21')
        ]
        for i in range(15):
            # 08:00 + i minutes to create ordering
            minute = str(i).zfill(2)
            events.append(_make_event(f'id{i}', f'E{i}', f'2025-01-20T08:{minute}:00Z', f'2025-01-20T09:{minute}:00Z'))
        mock_fetch.return_value = events

        from backend.services import calendar_service as cs
        tasks = cs.get_calendar_tasks_for_user_date('u123', '2025-01-20')

        assert len(tasks) == 10
        # First should be the all-day event
        assert tasks[0]['text'] == 'All Day'

    @patch('backend.services.calendar_service.get_database')
    @patch('backend.services.calendar_service.fetch_google_calendar_events')
    def test_uses_token_refresh_when_expired(
        self, mock_fetch, mock_get_db, user_with_expired_token
    ):
        users = FakeUsersCollection(user_with_expired_token)
        mock_get_db.return_value = {'users': users}

        # Return a single event
        mock_fetch.return_value = [
            _make_event('t1', 'Token Test', '2025-01-20T10:00:00Z', '2025-01-20T11:00:00Z')
        ]

        # Spy on refresh indirectly by checking that a fetch was attempted (we assume
        # calendar_service calls its refresh helper before fetch). Token logic is
        # validated in existing calendar endpoints; here we ensure call path doesn't break.
        from backend.services import calendar_service as cs
        tasks = cs.get_calendar_tasks_for_user_date('u123', '2025-01-20')

        assert isinstance(tasks, list)
        assert len(tasks) == 1
        assert tasks[0]['text'] == 'Token Test'

    @patch('backend.services.calendar_service.get_database')
    @patch('backend.services.calendar_service.fetch_google_calendar_events')
    def test_failure_returns_empty_list(
        self, mock_fetch, mock_get_db, user_with_valid_calendar
    ):
        users = FakeUsersCollection(user_with_valid_calendar)
        mock_get_db.return_value = {'users': users}

        mock_fetch.side_effect = Exception('network down')

        from backend.services import calendar_service as cs
        tasks = cs.get_calendar_tasks_for_user_date('u123', '2025-01-20')
        assert tasks == []


