# USER-002: Google calendar integration via mcp server
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
- understand and debug the following issue: Frontend correctly sends Firebase ID token in Authorization header, but backend returns 401 Unauthorized
- details:
  - Calendar connect API returning 401 Unauthorized despite Firebase authentication appearing successful
  - Frontend logs show authentication completing but calendar API calls immediately failing with 401
  - Token timing issue suspected - API calls might be made before auth state is fully ready

## Acceptance Criteria
- after a user signs in via google sso, ask for access to google calendar
- if they allow, then create a connection to google calendar mcp server
  - gather all events and tasks the user has for the current day
      - create them as task objects
      - create a schedule using these task objects
      - store the schedule in mongodb against the user for the current day
- if user clicks 'don't allow', then user should also see their dashboard page with an empty schedule
- instead of continuing to the current onboarding flow, take user directly to the dashboard page 
