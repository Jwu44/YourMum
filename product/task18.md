# User Story: Auto-trigger Daily Schedule Creation on First Dashboard Visit

## Story
**As a** user  
**I want** my daily schedule to be automatically created when I first visit the dashboard each day  
**So that** I don't have to manually trigger schedule creation and can immediately see my tasks for today

## Background
Currently, users visiting `/yourdai/dashboard` for the first time on a new day see an empty schedule and must manually trigger task creation. This creates unnecessary friction in the daily workflow.

## Acceptance Criteria

### 1. First Visit Detection
- **GIVEN** I am a logged-in user
- **WHEN** I navigate to `/yourdai/dashboard` 
- **THEN** the system checks if a schedule exists for today's date (using browser timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone` with UTC fallback)

### 2. Auto-Generation Trigger
- **GIVEN** no schedule exists for today's date
- **WHEN** I visit the dashboard for the first time today
- **THEN** the system triggers centralized backend autogeneration for today (no frontend filtering duplication).

### 3. Loading Experience
- **GIVEN** the auto-generation has been triggered
- **WHEN** the schedule is being created
- **THEN** I see an animated skeleton loader of the dashboard layout
- **AND** the loading state persists for maximum 10 seconds

### 4. Task Filtering Logic
- **GIVEN** the auto-generation is running
- **WHEN** filtering tasks for today
- **THEN** the system:
  - Finds the most recent schedule within 30 days that has at least 1 non-section task; schedules containing only Google
  - Calendar events count as “having tasks.”
  - Includes all sections (preserves structure).
  - Includes incomplete non-recurring tasks (start_date updated to today).
  - Includes recurring tasks due today (reset to incomplete).
  - Updates all included tasks’ start_date to today.
  - Generates new task IDs for copied tasks.

### 5. Existing Schedule Loading
- **GIVEN** a schedule already exists for today
- **WHEN** I visit the dashboard (any visit, including first)
- **THEN** the existing schedule loads immediately without triggering generation

### 6. Empty State Handling
- **GIVEN** no previous schedule with tasks exists within 30 days
- **WHEN** the system attempts auto-generation
- **THEN** immediately display the empty dashboard state (no loading skeleton)

### 7. Midnight Refresh
- **GIVEN** I have the dashboard open when the date changes (midnight)
- **WHEN** the clock strikes midnight in my timezone
- **THEN** the page automatically refreshes to trigger next day's schedule creation

## Technical Implementation Notes

### Frontend (React/TypeScript)
- Detect timezone via Intl.DateTimeFormat().resolvedOptions().timeZone with UTC fallback; compute today as YYYY-MM-DD.
- On first visit: if today’s schedule exists, load it; otherwise call POST /api/schedules/autogenerate.
- Show skeleton only while autogeneration is in-flight; timeout at 10s, then show empty state. If a late success arrives after timeout, render the created schedule and show a toast.
- Retry once on failure; if still failing, show a toast and empty state.
- Add midnight detection to refresh and re-run first-visit logic.

### Backend (Python/Flask)
- Add GET /api/schedules/recent-with-tasks?before=YYYY-MM-DD&days=30: Returns the most recent schedule with ≥1 non-section task; schedules with only Google Calendar events count as having tasks.
- Add POST /api/schedules/autogenerate:
    - If a schedule for date exists, no-op.
    - Else: fetch recent-with-tasks; if none, return “no source,” and frontend shows empty state immediately.
    - Build today’s tasks per filtering rules above; generate new task IDs; reuse inputs from the most recent schedule with inputs; persist and return schedule.
- Keep existing endpoints backward compatible; centralize “create next day” behavior here to avoid duplication with frontend logic. Calendar inclusion is a future enhancement..

### Database
- Utilize existing schedule_schema
- Query optimization for schedule existence check
- Ensure efficient indexed queries for date and user; optimize “recent-with-tasks” lookup.

## Definition of Done
[ ] Auto-generation triggers on first daily visit via backend endpoint.
[ ] Loading skeleton displays only during autogeneration (max 10s), with one retry then toast on failure.
[ ] Existing schedules load without re-generation.
[ ] Empty state shows immediately when no source schedule exists.
[ ] Late response after timeout updates the view to the created schedule and shows a toast.
[ ] Midnight refresh implemented.
[ ] Manual testing confirms all scenarios work as expected.

## Edge Cases Handled
- Multiple visits same day: only first triggers autogeneration (based on schedule existence).
- No previous schedules within 30 days: immediate empty state (no skeleton).
- Dashboard open across midnight: auto-refresh and re-run first-visit logic.
- Generation failure: retry once, then empty state + toast.
- 10-second timeout on loading, with late-response rendering when it arrives.

## Status (2025-08-12)
- Completed
  - Backend endpoints implemented: `GET /api/schedules/recent-with-tasks`, `POST /api/schedules/autogenerate` (auth + validation).
  - Backend service logic: `get_most_recent_schedule_with_tasks`, `autogenerate_schedule` (new IDs, filtering rules, inputs reuse).
  - Tests: backend route tests added; frontend helper `autogenerateTodaySchedule` added; FE tests scaffolded for first-visit autogeneration and next-day behavior.
- In Progress
  - Dashboard wired to use backend autogeneration on first visit to today; uses `components/ui/skeleton.tsx`; calendar fetch skipped. One-retry + 10s timeout + toast behavior integrated. Needs final test cleanup (lint fixes) and validation.
  - Midnight refresh and final timezone check.
  - Frontend tests covering timeout/late-success/empty-state paths: added; fix linter issues and stabilize mocks.
- Next Steps
  - Integrate `autogenerateTodaySchedule` inside `frontend/app/dashboard/page.tsx` initial load.
  - Implement skeleton gating + retry/timeout/toast behavior and midnight refresh.
  - Expand frontend test coverage; run full FE/BE test suites and fix regressions.

---

## Decisions and Constraints (finalized)
- Skip calendar fetch on first-visit autogeneration path; do not call `calendarApi.fetchEvents` during initial load.
- Use `components/ui/skeleton.tsx` for loading UI.
- Keep current empty-state copy.
- One retry only; maximum 10 seconds total skeleton period.
  - Show a toast immediately after the first autogeneration failure.
- Scope of autogeneration:
  - Trigger only for first visit to today’s date.
  - Do not autogenerate when navigating to a previous date with no schedule; show empty state instead.
- Refresh: implement the simplest viable midnight refresh.
- Date basis: local browser date is acceptable.
- Tests: add/adjust tests to cover all above behaviors.

## Backend contract (concise)
- POST `/api/schedules/autogenerate` body `{ date: 'YYYY-MM-DD' }` → `{ success, existed, created, sourceFound, date, schedule, metadata? }`
  - Centralized logic ensures: copy sections, carry over incomplete non-recurring (exclude gcal), include recurring due today, set `start_date=today`, assign new IDs, reuse inputs from most-recent-with-inputs.
- GET `/api/schedules/recent-with-tasks?before=YYYY-MM-DD&days=30` → `{ success: true, found: boolean, date?, schedule? }`.

## Frontend behavior (concise)
- First visit (today): `loadSchedule(today)`; if not found, call `autogenerateTodaySchedule(today)`.
  - Show skeleton (max 10s). On first failure: toast + retry once. After timeout: show empty state; if late success arrives, render it and show a toast.
- Navigation to previous dates with no schedule: no autogen; show empty state.
- Calendar fetch is skipped for this flow.
- Uses local date via `Intl.DateTimeFormat().resolvedOptions().timeZone` (with UTC fallback if needed).

## Implementation snapshot (files touched)
- Backend: `backend/apis/routes.py` (new endpoints), `backend/services/schedule_service.py` (autogeneration + helpers).
- Frontend helper: `frontend/lib/ScheduleHelper.tsx` (`autogenerateTodaySchedule`).
- Dashboard: `frontend/app/dashboard/page.tsx` (first-visit wiring, skeleton, retry/timeout/toast, no calendar fetch).
- Tests:
  - Backend: `backend/tests/test_autogenerate_schedule.py` (auth, validation, created/no-op/no-source cases).
  - Frontend: `frontend/tests/AutoTriggerDailySchedule.test.tsx` (existing schedule path; autogen success; no-source empty state; retry + timeout + late success + toast; skip calendar fetch).
  - Frontend: `frontend/tests/CreateNextDaySchedule.test.tsx` updated for centralization scenarios.

## Open items / TODOs
- [ ] Implement and verify midnight refresh (simplest approach acceptable).
- [ ] Ensure no autogeneration is triggered for past-date navigation empty states.
- [ ] Resolve FE test linter issues (duplicate mocks, env vars) and stabilize mocks.
- [ ] Run full FE/BE test suites; fix regressions.