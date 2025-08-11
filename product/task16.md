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
- I also see today's google calendar events synced if I just hard refresh /dashboard 
- Perhaps this means there's an issue in loading the initial schedule? e.g. race condition?

# Resources
## Backend server logs
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ4OTExMzEsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDg5MTE1MiwiZXhwIjoxNzU0ODk0NzUyLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.kMUuSV_iiHuhfjiqcf8mjp8JRlT58C8hIfRjcuDlu7usUzEymJA_rMd51Wvg628oj3sKwoD1xjLWWVdKno992R0poSwk8yI3PuREySWIHSCyCMsvOjBC4pJm3tCMNGanaWO6W3YH9wMOAllbj8zmDYEr0mkkRODbG1L5-kwn6maTol1ytO4l49DeIWZzipuc9ChwxPs4ScoMqM_BkjFrP5U43GYkdkV1j-aSynyE-fIqgXNtFgVb9mFwms-hlDf2rUZmPK5aUMUqxgclPHuOhMKoHzvmNLBYBPo-Rvcti_46lpKzem23feB5aX3dH5DhVHGyLYnjeuwJ5tSUVZjUxg

Content-Type: application/json

Sec-Ch-Ua-Mobile: ?1

Origin: https://yourdai.app

Priority: u=1, i

Sec-Ch-Ua-Platform: "Android"

Referer: https://yourdai.app/

Sec-Fetch-Dest: empty

Sec-Ch-Ua: "Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"

Sec-Fetch-Mode: cors

Sec-Ch-Ua-Mobile: ?1

Sec-Ch-Ua-Platform: "Android"

Sec-Fetch-Site: cross-site

Sec-Fetch-Dest: empty

Sec-Fetch-Mode: cors

Sec-Gpc: 1

Sec-Fetch-Site: cross-site

X-Forwarded-For: 1.129.111.94

Sec-Gpc: 1

X-Forwarded-Host: yourdai-production.up.railway.app

X-Forwarded-Proto: https

X-Forwarded-For: 1.129.111.94

X-Railway-Edge: railway/us-west2

X-Forwarded-Host: yourdai-production.up.railway.app

X-Railway-Request-Id: b4N5_ImsSeyJxnNQxtoGcA

X-Forwarded-Proto: https

X-Real-Ip: 1.129.111.94

X-Railway-Edge: railway/us-west2

X-Request-Start: 1754891133722


X-Railway-Request-Id: LfGC2en-Rc2_CSVHxtoGcA

 

X-Real-Ip: 1.129.111.94

Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c';, 'hasCalendarAccess': True}

DEBUG: Setting new calendar state for user Si3NryNNjSMbW8q1t0niKX8sYng1: True

X-Request-Start: 1754891153544

DEBUG - Token verification successful. User ID: Si3NryNNjSMbW8q1t0niKX8sYng1


DEBUG: Connecting calendar for user Si3NryNNjSMbW8q1t0niKX8sYng1

100.64.0.2 - - [11/Aug/2025 05:45:54] "GET /api/auth/user HTTP/1.1" 200 -

DEBUG: Calendar credentials provided: True

100.64.0.2 - - [11/Aug/2025 05:45:54] "POST /api/auth/user HTTP/1.1" 200 -

DEBUG: Calendar connection update result - modified count: 1

100.64.0.2 - - [11/Aug/2025 05:45:56] "GET /api/calendar/events?date=2025-08-11&timezone=Australia/Sydney HTTP/1.1" 200 -

## Console logs
Attempting to fetch calendar events for: 2025-08-11
layout-159ba634a3cbd382.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
581-a1632655d6d93f16.js:1 Has calendar access: true
581-a1632655d6d93f16.js:1 Storing user with calendar access flag: true
581-a1632655d6d93f16.js:1 Got fresh ID token for backend storage
581-a1632655d6d93f16.js:1 Calendar access status: false
581-a1632655d6d93f16.js:1 API Base URL: https://yourdai-production.up.railway.app
581-a1632655d6d93f16.js:1 Got fresh ID token for backend storage
581-a1632655d6d93f16.js:1 Calendar access status: true
581-a1632655d6d93f16.js:1 API Base URL: https://yourdai-production.up.railway.app
581-a1632655d6d93f16.js:1  GET https://yourdai-production.up.railway.app/api/calendar/events?date=2025-08-11&timezone=Australia%2FSydney 400 (Bad Request)
fetchEvents @ 581-a1632655d6d93f16.js:1
await in fetchEvents
page-35182c0365bf100e.js:1 Calendar not connected, loading regular schedule
581-a1632655d6d93f16.js:1 User stored in backend successfully with calendar access: false
581-a1632655d6d93f16.js:1 Authentication completed successfully
page-35182c0365bf100e.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
581-a1632655d6d93f16.js:1 User stored in backend successfully with calendar access: true
581-a1632655d6d93f16.js:1 Starting calendar connection process...
581-a1632655d6d93f16.js:1 Waiting for auth state to stabilize before connecting to Google Calendar...
site.webmanifest:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
/dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
581-a1632655d6d93f16.js:1 Connecting to Google Calendar...
581-a1632655d6d93f16.js:1 Connected to Google Calendar successfully
page-35182c0365bf100e.js:1 ⚠️ Rendering legacy structure

---

# Key Findings & Analysis

## Core Race Condition Issue
**The fundamental problem**: User arrives at `/dashboard` BEFORE the calendar connection process completes in the backend, causing a 400 "Calendar not connected" error.

## Critical Timeline Analysis
Based on console logs, the actual execution order is:

1. **Line 109**: `RouteGuard State: {user: 'Justin Wu', pathname: '/dashboard'}` - **User is already on dashboard**
2. **Line 108**: `Attempting to fetch calendar events for: 2025-08-11` - **Dashboard tries to fetch calendar events**
3. **Line 118**: `400 (Bad Request)` - **Calendar API fails because connection not ready**
4. **Line 121**: `Calendar not connected, loading regular schedule` - **Dashboard falls back to regular schedule**
5. **Line 125-131**: Calendar connection process happens **AFTER** dashboard has already loaded

## Root Cause: Double Race Condition
1. **Frontend Race**: Dashboard `useEffect` (line 1183-1250) runs **before** AuthContext calendar connection completes
2. **Backend Race**: Calendar API call happens before backend calendar connection is established

## Failed Fix Attempts & Lessons

### Attempt 1: /connecting Page Flow
- **What we tried**: Enhanced /connecting page to fetch calendar events before redirect
- **Why it failed**: RouteGuard still allowed direct access to /dashboard, bypassing /connecting entirely
- **Key insight**: Users were never reaching /connecting page - they went straight to /dashboard

### Attempt 2: RouteGuard + AuthContext Coordination
- **What we tried**: 
  - RouteGuard redirects to /connecting when `calendarConnectionProgress` flag exists
  - AuthContext sets localStorage flags instead of redirecting
- **Why it failed**: The localStorage flag is set too late - dashboard already loads and executes its `useEffect`
- **Key insight**: By the time localStorage is set, dashboard has already made the failing API call

## Technical Deep Dive

### The Timing Problem
```
Millisecond 0:    OAuth completes
Millisecond 1:    AuthContext starts calendar connection  
Millisecond 1:    RouteGuard sees authenticated user → allows /dashboard
Millisecond 2:    Dashboard loads and useEffect runs
Millisecond 3:    Dashboard calls calendar API → 400 error
Millisecond 100:  AuthContext completes calendar connection
Millisecond 101:  AuthContext sets localStorage flag (too late!)
```

### Backend State Issue
- **Line 105**: Backend shows `200 OK` for calendar events API
- **But frontend gets 400**: This suggests the backend calendar connection happens asynchronously
- **The disconnect**: Backend logs show success, frontend gets failure - timing-dependent backend state

## The Real Solution Required
The issue persists because we need to prevent dashboard's **initial calendar API call** from happening, not just prevent navigation. The dashboard `useEffect` (line 1194-1211) executes immediately when the component mounts, regardless of navigation timing.

## Proposed Next Steps
1. **Backend synchronization**: Ensure calendar connection is atomic and immediately available
2. **Frontend state coordination**: Dashboard should check for calendar connection state before attempting API calls

## Status: Requires Deeper Backend Analysis
The 200 OK in backend logs vs 400 error in frontend suggests the issue may be in the backend calendar connection timing or token/credentials propagation delay.