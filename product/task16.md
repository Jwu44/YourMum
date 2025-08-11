# Status: To Do
I am facing a bug where after google sso and approving google calendar connection, I do not see my google calendar events appear in my current day schedule

# Steps to reproduce:
1. Start on / home page and click one of the CTAs to trigger signup/login
2. Go through google sso and approve google calendar connection
3. See google calendar connection load page
4. Bug: arrive on /dashboard, google calendar events are not shown in today's schedule


# Expected behaviour:
- When I signup/login and approve google calendar connection, I should see today's google calendar events synced to my /dashboard schedule

# Notes:
- I do see today's google calendar events synced if I go to /integrations > disconnect > reconnect
- Perhaps this means there's an issue in loading the initial schedule?

# Resources
## Backend server logs
DEBUG - Token verification successful. User ID: Si3NryNNjSMbW8q1t0niKX8sYng1

DEBUG: Setting new calendar state for user Si3NryNNjSMbW8q1t0niKX8sYng1: False

DEBUG - Token verification successful. User ID: Si3NryNNjSMbW8q1t0niKX8sYng1

Received authentication request. Headers: Host: yourdai-production.up.railway.app

User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36

Content-Length: 243

Accept: */*

Accept-Encoding: gzip, deflate, br, zstd

Accept-Language: en-GB,en;q=0.5

Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ4NzUwMzYsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDg3Nzk5NCwiZXhwIjoxNzU0ODgxNTk0LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.CFnPtNpOb7gNwyOU1QwwzQA3tLe3hM2Y6GBvfJGqCXzT8H1GE0BnjiXN0XVhyLfEWxdZq-b1eefe7u5IQgXIeEX81THCJ3QpUZYBphWoERHw5vqJrwxb1EAt0fDcYiRmPb-acPVgameGjiZMywREksVxFCb7qDzmnmzA7WT_naKZqzKWw4jCZAiX1Ht5EdoAkec0F0OUUpTYKrHQs35Mec0gHMlmAs0R66Tt56vEFRm8yCTy1k9XjoI-cmQxXyVuhhdUWWdVngJMOVn2ybUpgEuwsOtWz74Wr2D7O9QrF6gYT1kfM5rEfgCiP3XovF3IomatQIxhF3zfPOOSjwtMZg

Content-Type: application/json

Origin: https://yourdai.app

Priority: u=1, i

Referer: https://yourdai.app/

Sec-Ch-Ua: "Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"

Sec-Ch-Ua-Mobile: ?0

Sec-Ch-Ua-Platform: "macOS"

Sec-Fetch-Dest: empty

Sec-Fetch-Mode: cors

Sec-Fetch-Site: cross-site

Sec-Gpc: 1

X-Forwarded-For: 1.129.106.102

X-Forwarded-Host: yourdai-production.up.railway.app

X-Forwarded-Proto: https

X-Railway-Edge: railway/us-west2

X-Railway-Request-Id: I3XFGEb6RJiyCOMGn6XIxQ

X-Real-Ip: 1.129.106.102

X-Request-Start: 1754877995640


100.64.0.3 - - [11/Aug/2025 02:06:36] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:06:36] "GET /api/calendar/events?date=2025-08-11&timezone=Australia/Sydney HTTP/1.1" 400 -

100.64.0.3 - - [11/Aug/2025 02:06:36] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:06:38] "OPTIONS /api/schedules/2025-08-11 HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:06:39] "GET /api/schedules/2025-08-11 HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:06:41] "OPTIONS /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:06:41] "GET /api/calendar/status/Si3NryNNjSMbW8q1t0niKX8sYng1 HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:06:42] "GET /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:07:11] "OPTIONS /api/calendar/connect HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:07:12] "POST /api/calendar/connect HTTP/1.1" 200 -

100.64.0.3 - - [11/Aug/2025 02:07:13] "GET /api/calendar/status/Si3NryNNjSMbW8q1t0niKX8sYng1 HTTP/1.1" 200 -


## Console logs
User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
581-cd4432544f76df4d.js:1 User stored in backend successfully with calendar access: false
581-cd4432544f76df4d.js:1 Authentication completed successfully
581-cd4432544f76df4d.js:1 User stored in backend successfully with calendar access: true
581-cd4432544f76df4d.js:1 Starting calendar connection process...
581-cd4432544f76df4d.js:1 Waiting for auth state to stabilize before connecting to Google Calendar...
581-cd4432544f76df4d.js:1 Connecting to Google Calendar...
581-cd4432544f76df4d.js:1 Connected to Google Calendar successfully
page-8b1fab9d9b13598c.js:1 ⚠️ Rendering legacy structure