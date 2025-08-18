import sys
import os
from types import SimpleNamespace

import pytest

# Ensure project root on sys.path for imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import application  # noqa: F401


class _FakeCollection:
    def __init__(self, docs_by_date):
        self._docs_by_date = docs_by_date

    def find_one(self, query):
        # Expecting query contains userId and date
        date = query.get("date")
        return self._docs_by_date.get(date)


def _doc(user_id: str, date: str, last_modified: str):
    return {
        "userId": user_id,
        "date": date,
        "schedule": [],
        "metadata": {
            "created_at": "2025-01-01T00:00:00",
            "last_modified": last_modified,
            "source": "test"
        },
        "inputs": {}
    }


@pytest.mark.parametrize("initial,last,next_lm,should_emit", [
    (None, "2025-08-14T00:00:00", "2025-08-14T00:00:00", False),  # initial set only
    ("2025-08-14T00:00:00", "2025-08-14T00:00:00", "2025-08-14T01:00:00", True),  # change triggers emit
])
def test_poll_helper_detects_change(monkeypatch, initial, last, next_lm, should_emit):
    user_id = "u1"
    tz = "Australia/Sydney"
    date = "2025-08-14"

    # Prepare fake collection docs across two reads
    docs = {
        date: _doc(user_id, date, last)
    }
    fake_collection = _FakeCollection(docs)

    # Patch get_user_schedules_collection to our fake
    from backend.apis import routes as routes_mod

    def _get_user_schedules_collection():
        return fake_collection

    monkeypatch.setattr(routes_mod, 'get_user_schedules_collection', _get_user_schedules_collection)

    # Call helper first time
    payload, new_seen = routes_mod._poll_schedule_update(user_id, tz, initial, date_override=date)
    assert (payload is not None) == False
    assert new_seen == last

    # Update doc with new last_modified
    docs[date] = _doc(user_id, date, next_lm)

    payload2, new_seen2 = routes_mod._poll_schedule_update(user_id, tz, new_seen, date_override=date)
    assert (payload2 is not None) == should_emit
    if should_emit:
        assert payload2.get('type') == 'schedule_updated'
        assert payload2.get('date') == date
    assert new_seen2 == next_lm


