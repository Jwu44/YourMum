# Status: In Progress
I am facing a bug where the event bus/sse stream permanently deletes incomplete google calendar events synced from a recent schedule using the autogenerate() function while unchecking previously complete google synced calendar events synced from today.

# Steps to reproduce:
1. Setup schedule for today using autogenerate(). E.g. in the first image, I have 7 tasks. note: sync gcal, test7, test 1 and boulder are google calendar events where the first 3 were synced from a recent schedule as they were incomplete but the task "boulder" was synced from today. notice how these tasks were marked as "complete"
2. on google calendar, create a new event for today to trigger the event bus/sse stream
3. Bug: observe /dashboard being overwritten. E.g. in the second image, now we have 5 tasks. note: sync gcal, test7 and test 1 have been deleted. but "boulder" still remains but it has now been unchekced
4. refresh the page and observe the schedule has been permanently overwritten


# Expected behaviour:
- adding new events on google calendar which triggers the event bus/sse stream should never delete any google calendar events synced from a recent schedule, even if they have been completed
- adding new events on google calendar which triggers the event bus/sse stream should never overrwrite the state of synced google calendar events, their state (complete/incomplete) should remain as is
- adding new events on google calendar should just add them as tasks on /dashboard.

---

Changes implemented
- Frontend: `autogenerateTodaySchedule` now sends `timezone` (browser IANA) to backend.
- Backend API: `POST /api/schedules/autogenerate` accepts optional `timezone` and forwards it to the service.
- Backend service: `autogenerate_schedule(..., user_timezone)` threads timezone to calendar fetch.
- Calendar service:
  - Added timezone-aware overlap: convert event times to target TZ and check overlap within local-day window.
  - `get_calendar_tasks_for_user_date(..., timezone_override)` prefers override over stored timezone.
- Sub-timeout: increased calendar fetch sub-timeout to 10.0s to match UI budget.
- Webhook merge path: introduced `apply_calendar_webhook_update(...)` with preservation-first strategy to avoid deleting/overwriting completed GCal tasks during SSE updates.

Key findings
- Root cause cluster: timezone mismatches (stored UTC vs browser AU/Sydney) and too-short sub-timeout caused autogenerate to miss GCal events; later webhook/SSE merged them, appearing “flaky.”
- Fresh reconnect (disconnect + clear site data + reauth + calendar connect) sets correct timezone and loads updated FE, which is why the flow works reliably after a clean setup.
- Event overlap previously compared raw dates; now corrected using TZ-local day boundaries.
- SSE/webhook path must preserve completion state and avoid destructive merges; new merge routine enforces this.

Next steps
- Observe logs after deployment: confirm timezone received, fetch duration, and absence of timeout.
- If needed, add lightweight debug logs around calendar fetch timing and applied timezone.
