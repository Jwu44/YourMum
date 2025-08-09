"""
Lightweight in-memory event bus for server-side publish/subscribe.

This module provides a simple pub/sub mechanism used by the SSE endpoint to
push realtime updates to connected clients. It is intentionally minimal and
process-local. For multi-process or multi-instance deployments, replace the
implementation with a shared broker (e.g., Redis Pub/Sub).
"""

from __future__ import annotations

from collections import defaultdict
from queue import Queue
from threading import Lock
from typing import Dict, List, Any


class EventBus:
    """A simple publish/subscribe event bus.

    Subscribers are keyed by `user_id`. Each subscriber is represented by a
    `Queue` that receives event payloads. Publishers push events to all queues
    registered under the given `user_id`.
    """

    def __init__(self) -> None:
        # Map of user_id to list of subscriber queues
        self._subscribers: Dict[str, List[Queue]] = defaultdict(list)
        self._lock = Lock()

    def subscribe(self, user_id: str) -> Queue:
        """Register a new subscriber for a user and return its queue."""
        subscriber_queue: Queue = Queue()
        with self._lock:
            self._subscribers[user_id].append(subscriber_queue)
        return subscriber_queue

    def unsubscribe(self, user_id: str, subscriber_queue: Queue) -> None:
        """Remove a subscriber queue for a user if present."""
        with self._lock:
            queues = self._subscribers.get(user_id)
            if not queues:
                return
            try:
                queues.remove(subscriber_queue)
            except ValueError:
                # Already removed
                pass
            if not queues:
                # Clean up empty list to avoid memory growth
                self._subscribers.pop(user_id, None)

    def publish(self, user_id: str, event: Dict[str, Any]) -> None:
        """Publish an event to all subscribers of a user.

        If a queue refuses the event, it will be removed to prevent leaks.
        """
        with self._lock:
            for q in list(self._subscribers.get(user_id, [])):
                try:
                    q.put_nowait(event)
                except Exception:
                    # Drop stuck or closed subscriber
                    try:
                        self._subscribers[user_id].remove(q)
                    except ValueError:
                        pass
            if user_id in self._subscribers and not self._subscribers[user_id]:
                self._subscribers.pop(user_id, None)


# Shared singleton instance for application use
event_bus = EventBus()


