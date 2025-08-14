import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Ensure project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import application  # noqa: F401
from backend.services.schedule_service import schedule_service


@pytest.fixture(autouse=True)
def _reset_mock_collection():
    mock_collection = MagicMock()
    schedule_service.schedules_collection = mock_collection
    yield mock_collection


def _make_schedule_doc(user_id: str, date: str, tasks, inputs=None):
    return {
        "userId": user_id,
        "date": date,
        "schedule": tasks,
        "metadata": {
            "created_at": "2025-01-01T00:00:00",
            "last_modified": "2025-01-01T00:00:00",
            "source": "test"
        },
        "inputs": inputs or {}
    }


@patch('backend.services.schedule_service.calendar_service.get_calendar_tasks_for_user_date')
def test_autogenerate_today_preserves_existing_calendar_positions(mock_get_calendar, _reset_mock_collection: MagicMock):
    user_id = 'u1'
    date = '2025-08-14'

    # Existing schedule (yesterday) with sections and one calendar event in Morning
    yesterday = '2025-08-13'
    source_tasks = [
        {"id": "sec-m", "text": "Morning", "is_section": True, "type": "section"},
        {"id": "ev-a", "text": "cold reach", "from_gcal": True, "gcal_event_id": "gA", "type": "task", "section": "Morning"},
        {"id": "sec-a", "text": "Afternoon", "is_section": True, "type": "section"}
    ]

    # Most recent schedule with inputs
    _reset_mock_collection.find_one.side_effect = [
        None,  # get_schedule_by_date returns no schedule for target date
        _make_schedule_doc(user_id, yesterday, source_tasks, inputs={ 'layout_preference': { 'layout': 'todolist-structured' }})
    ]

    # Calendar api returns existing event (gA updated) plus a new one (gB)
    mock_get_calendar.return_value = [
        {"id": "tmp-a", "text": "cold reach", "gcal_event_id": "gA", "type": "task", "start_time": "12:00", "end_time": "13:00"},
        {"id": "tmp-b", "text": "another event", "gcal_event_id": "gB", "type": "task", "start_time": "17:30", "end_time": "18:30"},
    ]

    class FakeCollection:
        def __init__(self, first_doc, today: str, yesterday: str):
            self._first = first_doc
            self._today_fmt = f"{today}T00:00:00"
            self._yesterday_fmt = f"{yesterday}T00:00:00"
        def find_one(self, query):
            qdate = query.get('date')
            if qdate == self._today_fmt:
                return None
            if qdate == self._yesterday_fmt:
                return self._first
            return None
        def replace_one(self, *args, **kwargs):
            return MagicMock(upserted_id='xyz')
    schedule_service.schedules_collection = FakeCollection(
        _make_schedule_doc(user_id, yesterday, source_tasks, inputs={ 'layout_preference': { 'layout': 'todolist-structured' }}),
        today=date,
        yesterday=yesterday
    )

    ok, result = schedule_service.autogenerate_schedule(user_id, date)
    assert ok
    tasks = result['schedule']

    # Morning section remains first
    assert tasks[0].get('is_section') is True and tasks[0].get('text') == 'Morning'
    # cold reach remains next
    assert tasks[1].get('from_gcal') is True and tasks[1].get('gcal_event_id') == 'gA'
    # new event follows before Afternoon
    idx_new = next(i for i, t in enumerate(tasks) if t.get('gcal_event_id') == 'gB')
    idx_afternoon = next(i for i, t in enumerate(tasks) if t.get('is_section') and t.get('text') == 'Afternoon')
    assert idx_new < idx_afternoon
    assert tasks[idx_new].get('section') == 'Morning'


