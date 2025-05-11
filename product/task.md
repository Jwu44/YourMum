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
- analyse this error log:
" May 11 04:52:03 ip-172-31-3-5 web[55430]: Sec-Fetch-Site: cross-site
May 11 04:52:03 ip-172-31-3-5 web[55430]: Sec-Fetch-Mode: cors
May 11 04:52:03 ip-172-31-3-5 web[55430]: Sec-Fetch-Dest: empty
May 11 04:52:03 ip-172-31-3-5 web[55430]: Referer: https://yourdai.app/
May 11 04:52:03 ip-172-31-3-5 web[55430]: Accept-Encoding: gzip, deflate, br, zstd
May 11 04:52:03 ip-172-31-3-5 web[55430]: Priority: u=1, i
May 11 04:52:03 ip-172-31-3-5 web[55430]: #015
May 11 04:52:03 ip-172-31-3-5 web[55430]: Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': True}
May 11 04:52:03 ip-172-31-3-5 web[55430]: Error verifying token: Your default credentials were not found. To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc for more information.
May 11 05:24:04 ip-172-31-3-5 web[55430]: Received authentication request. Headers: [2025-05-11 05:24:04 +0000] [55430] [INFO] Worker exiting (pid: 55430)
May 11 05:24:04 ip-172-31-3-5 web[55430]: Connection: upgrade
May 11 05:24:04 ip-172-31-3-5 web[55430]: Host: yourdai.be
May 11 05:24:04 ip-172-31-3-5 web[55430]: X-Real-Ip: 172.31.65.177
May 11 05:24:04 ip-172-31-3-5 web[55430]: X-Forwarded-For: 1.40.161.22, 172.31.65.177
May 11 05:24:04 ip-172-31-3-5 web[55430]: Content-Length: 242
May 11 05:24:04 ip-172-31-3-5 web[55430]: X-Forwarded-Proto: https
May 11 05:24:04 ip-172-31-3-5 web[55430]: X-Forwarded-Port: 443
May 11 05:24:04 ip-172-31-3-5 web[55430]: X-Amzn-Trace-Id: Root=1-68202cf3-29aa9b623a00fb882813ca4e
May 11 05:24:04 ip-172-31-3-5 web[55430]: Sec-Ch-Ua-Platform: "Android"
May 11 05:24:04 ip-172-31-3-5 web[55430]: Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjU5MWYxNWRlZTg0OTUzNjZjOTgyZTA1MTMzYmNhOGYyNDg5ZWFjNzIiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDY5MzkxMjAsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0NjkzOTEyMCwiZXhwIjoxNzQ2OTQyNzIwLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.WOpZNkzZLovHl0U1728vo8ygAAfZE8a1deHgQaPhOQ-Tbnkc9ReaGVYmHcQ1vSrvkC86SrzPw04B9d6gAf6iAECEOG5wAaFolMTtCtio9TXMNGJtZftqy6K-TVmzpg6OEYrZbcpWV2zI3BzXxVFwlmW5btCaoxSFKqkPpk8wiGvZ2HYZBx9d49XgAUDK5UGuzei5WBR2VYyAnkIUOk4u3foONPcNBBzUk77Igd-FCoJQWiq8bq6DAyevNf9KcoZJxawseczAP5OsqyPGldjyN89lJD2IHZIfJ3DAU-GuMrdRth-HVtVjX0UrcNQ6aQ8E07-JRsZvgvCQSseWgQwLWA"

## Acceptance Criteria
- after a user signs in via google sso, ask for access to google calendar
- if they allow, then create a connection to google calendar mcp server
  - gather all events and tasks the user has for the current day
      - create them as task objects
      - create a schedule using these task objects
      - store the schedule in mongodb against the user for the current day
- if user clicks 'don't allow', then user should also see their dashboard page with an empty schedule
- instead of continuing to the current onboarding flow, take user directly to the dashboard page 
