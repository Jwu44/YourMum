## Task 22 — Reliable Calendar Merge on First Load (User Story)

### Summary
As a signed‑in user, when I visit `/dashboard` for the first time today, I want my schedule to reliably include today’s Google Calendar events alongside my manual carry‑over tasks and recurring tasks, without losing completion state or deleting items, and without any extra re‑login prompts.

### Requirements
- **First load should include**: 
  - Incomplete manual tasks carried over from the most recent schedule
  - Recurring tasks due today
  - Today’s Google Calendar events
- **Non‑destructive merges**:
  - Never delete previously synced GCal tasks when new events arrive (SSE/webhook or manual fetch)
  - Never overwrite completion state of existing GCal tasks
  - Merge/upsert by `gcal_event_id`, preserving `id` and `completed`
- **Silent auth**:
  - No extra popup: obtain and store a real Google `refresh_token` via a one‑time background OAuth redirect if missing
  - Automatically refresh the access token and retry once on 401
- **Timezone**:
  - Use the browser IANA timezone for autogenerate and event fetch boundaries

### Findings
- The user’s `calendar.credentials` lacked a `refreshToken`, so the access token could be expired on first load → calendar fetch returns empty
- Manual sync path replaced calendar tasks and could reset completion, while webhook path preserved; this caused perceived “overwrite” after reconnect
- First load uses autogenerate (not `/events`), so an expired token plus no refresh led to missing GCal events

### Implementation (done)
- Backend
  - `schedule_service.create_schedule_from_calendar_sync(...)`: switch to a preservation‑first merge
    - Upsert by `gcal_event_id`, preserve existing `id` and `completed`, update Google‑sourced fields (`text`, `start_time`, `end_time`, `start_date`)
    - Keep manual tasks intact; keep existing calendar tasks not present in the fetched set
  - `calendar_routes.fetch_google_calendar_events(...)`: timezone‑aware day window; raise `PermissionError` on 401
  - `/api/calendar/events`: catch 401, refresh via `_ensure_access_token_valid(...)`, retry once; return clear error if refresh fails
  - OAuth endpoints:
    - `GET /api/calendar/oauth/start` → builds Google OAuth URL (`access_type=offline`, `prompt=consent`)
    - `GET /api/calendar/oauth/callback` → exchanges code, persists `accessToken`, `refreshToken`, `expiresAt`, and ensures a watch
- Frontend
  - `autogenerateTodaySchedule(...)` sends browser timezone to backend
  - `/dashboard`: on first load, if calendar is connected but `refreshToken` missing, perform a one‑time background redirect using `/api/calendar/oauth/start`, show the loader, then continue; no user click required

### Environment/config
- Set the following on the backend:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_CALENDAR_REDIRECT_URI`:
    - Production: `https://yourdai-production.up.railway.app/api/calendar/oauth/callback`
    - Local dev (optional): `http://localhost:8000/api/calendar/oauth/callback`
  - `GOOGLE_CALENDAR_WEBHOOK_URL` (already present)
- Add the same redirect URI in Google Cloud Console → OAuth client (Authorized redirect URIs)

### Acceptance criteria
- Visiting `/dashboard` on a new day shows manual carry‑over + recurring + today’s GCal events
- Reconnects and SSE/webhook updates do not delete tasks or reset completion
- No popup re‑login; one‑time background redirect only if `refreshToken` is missing
- Tomorrow’s autogenerate includes tomorrow’s GCal events (timezone‑correct)

### Tests (added)
- Merge preservation for manual calendar sync (preserve `id`/`completed`, upsert by `gcal_event_id`)
- OAuth offline flow start/callback stores `refreshToken`
- `/api/calendar/events` retries once on 401 after refresh

### Rollout & verification
- Configure env vars and deploy
- Verify logs for: OAuth start URL, callback exchange success, refresh retries on 401, and absence of destructive merges


