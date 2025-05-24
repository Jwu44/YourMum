# TASK-01: Google calendar integration via mcp server
Status: In Progress

## Current Progress
- Backend API routes have been created in backend/apis/calendar_routes.py:
  - `/api/calendar/connect` (POST): Connect user to Google Calendar after authorization
  - `/api/calendar/events` (GET): Fetch user's calendar events for a specific date
- MCP server configuration exists in mcp.json with the server URL
- Frontend implementation:
  - Fixed import for GoogleAuthProvider in AuthContext.tsx
  - Updated calendar.ts to correctly import auth from '@/auth/firebase'
  - Refactored dashboard.tsx to use calendarApi.fetchEvents() which automatically handles auth
  - Modified fetchEvents to use a simplified API signature with just date parameter


## Requirements

## Acceptance Criteria
- After a user signs in via Google SSO, ask for access to Google Calendar
- If they allow, then create a connection to Google Calendar MCP server
  - Gather all events and tasks the user has for the current day
      - Create them as task objects
      - Create a schedule using these task objects
      - Store the schedule in MongoDB against the user for the current day
- If user clicks 'don't allow', then user should also see their dashboard page with an empty schedule
- Instead of continuing to the current onboarding flow, take user directly to the dashboard page