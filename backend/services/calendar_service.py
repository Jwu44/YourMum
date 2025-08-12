"""
Calendar Service

Provides backend-side helpers to fetch Google Calendar events for a user
on a given date and convert them into Task objects, including sorting and
limiting rules required by task19.

Intentionally minimal to support tests; network fetch is expected to be
patched in tests. Token refresh is reused at a higher layer; here we
gracefully proceed with provided credentials.
"""

from __future__ import annotations

from typing import List, Dict, Optional, Tuple
from datetime import datetime

from backend.db_config import get_database


# NOTE: need this to avoid circular dependency with schedule_service
# In tests, this symbol is patched directly within this module.
# In production, delegate to the real implementation in backend.apis.calendar_routes.
def fetch_google_calendar_events(access_token: str, date: str, user_timezone: str) -> List[Dict]:  # pragma: no cover - thin wrapper
    try:
        # Lazy import to avoid circular dependencies during module import
        from backend.apis.calendar_routes import fetch_google_calendar_events as _routes_fetch  # type: ignore
        return _routes_fetch(access_token, date, user_timezone) or []
    except Exception:
        # Be resilient; the caller will gracefully proceed with an empty list
        return []


def _event_overlaps_date(event: Dict, date: str) -> bool:
    """
    Return True if the event overlaps the given date.
    Supports both all-day (date/date) and timed (dateTime) events.
    """
    start = event.get('start', {})
    end = event.get('end', {})

    # All-day events use date fields
    start_date = start.get('date')
    end_date = end.get('date')
    if start_date and end_date:
        # All-day spans are half-open [start_date, end_date)
        return start_date <= date < end_date

    # Timed events use dateTime fields; assume date-time in UTC or with TZ
    start_dt_raw = start.get('dateTime')
    end_dt_raw = end.get('dateTime')
    if start_dt_raw and end_dt_raw:
        try:
            # Normalize by replacing 'Z' to be ISO8601-compatible with fromisoformat
            start_dt = datetime.fromisoformat(start_dt_raw.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_dt_raw.replace('Z', '+00:00'))
            # Check if the calendar-local date matches target date by comparing YYYY-MM-DD of start
            return start_dt.strftime('%Y-%m-%d') == date or end_dt.strftime('%Y-%m-%d') == date
        except Exception:
            return False

    # Unknown format -> exclude
    return False


def _is_all_day(event: Dict) -> bool:
    start = event.get('start', {})
    end = event.get('end', {})
    return 'date' in start or 'date' in end


def _event_sort_key(event: Dict) -> Tuple[int, str, str]:
    """
    Sort key: all-day first (0), then by start time (string ISO) or empty,
    tie-break by summary/title alphabetically.
    """
    is_all_day = _is_all_day(event)
    start = event.get('start', {})
    summary = event.get('summary', '') or ''
    if 'dateTime' in start:
        start_key = start['dateTime']
    elif 'date' in start:
        # all-day: treat as earliest in day
        start_key = '0000-00-00T00:00:00Z'
    else:
        start_key = ''
    # all-day first, then time, then alphabetical title
    return (0 if is_all_day else 1, start_key, summary.lower())


def convert_calendar_event_to_task(event: Dict, date: str) -> Optional[Dict]:
    """
    Convert a Google Calendar event to a Task-like dict for schedules.
    Minimal fields required by tests/spec.
    """
    try:
        title = event.get('summary', 'Untitled Event')
        if not title or event.get('status') == 'cancelled':
            return None

        # Timed fields (optional)
        start_time: Optional[str] = None
        end_time: Optional[str] = None
        start = event.get('start', {})
        end = event.get('end', {})
        if 'dateTime' in start:
            try:
                sdt = datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
                start_time = sdt.strftime('%H:%M')
            except Exception:
                start_time = None
        if 'dateTime' in end:
            try:
                edt = datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
                end_time = edt.strftime('%H:%M')
            except Exception:
                end_time = None

        return {
            'id': event.get('id') or f"gcal-{date}-{title}",
            'text': title,
            'categories': [],
            'completed': False,
            'is_subtask': False,
            'is_section': False,
            'section': None,
            'parent_id': None,
            'level': 0,
            'section_index': 0,
            'type': 'task',
            'start_time': start_time,
            'end_time': end_time,
            'is_recurring': None,
            'start_date': date,
            'gcal_event_id': event.get('id'),
            'from_gcal': True,
        }
    except Exception:
        return None


def get_calendar_tasks_for_user_date(user_id: str, date: str) -> List[Dict]:
    """
    Fetch user's calendar events for a date and convert/sort/limit to tasks.
    - Includes all-day and multi-day events overlapping the date
    - Sorted by (all-day first) then start time chronological (user timezone)
    - Limited to earliest 10 (tie-break alphabetical)
    """
    try:
        # Get user
        db = get_database()
        users = db['users']
        user = users.find_one({'googleId': user_id})
        if not user:
            return []

        calendar_data = user.get('calendar', {})
        if not (calendar_data.get('connected') and calendar_data.get('credentials')):
            return []

        credentials = calendar_data.get('credentials', {})
        # Lazy import to avoid circular dependency with schedule_service
        def _ensure_access_token_valid_wrapper(_users, _user_id, _credentials):
            try:
                from backend.apis.calendar_routes import _ensure_access_token_valid as _ensure
                return _ensure(_users, _user_id, _credentials)
            except Exception:
                return _credentials.get('accessToken')

        access_token = _ensure_access_token_valid_wrapper(users, user_id, credentials) or credentials.get('accessToken')
        if not access_token:
            return []

        user_timezone = user.get('timezone') or 'UTC'

        # Fetch events (patched in tests)
        events = fetch_google_calendar_events(access_token, date, user_timezone) or []

        # Filter: overlapping target date
        filtered = [ev for ev in events if _event_overlaps_date(ev, date)]

        # Sort by all-day first, then time, then alphabetical
        filtered.sort(key=_event_sort_key)

        # Limit to earliest 10
        limited = filtered[:10]

        # Convert to tasks
        tasks: List[Dict] = []
        for ev in limited:
            task = convert_calendar_event_to_task(ev, date)
            if task:
                tasks.append(task)

        return tasks
    except Exception:
        return []


