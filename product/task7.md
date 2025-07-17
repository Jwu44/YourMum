# TASK-07: Debug double load on prod before synced google calendar events appear
Status: Resolved ✅

## Bug
I am facing a bug where after google sso and I land on /dashboard, the dashboard page loads twice before I can see synced google calendar events for the day.

## Steps to reproduce:
1. sign in via google sso
2. provide calendar access
3. land on /dashboard
4. Bug: initial dashboard load does not show google calendar events
5. Bug: after a few seconds, the next dsahboard load occurs and now i can see google calendar events

## Expected behaviour: when I land on /dashboard, it should only load once and I should see the google calendar events there. perhaps a loading state is requried

## Resources
### Console logs
TASK-07 FIX: Auth ready, starting schedule load
layout-db35b87bef89a0bd.js:1 RouteGuard State: 
{user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
20-d085f2d3adf909b7.js:1 
 GET https://yourdai-production.up.railway.app/api/auth/user 401 (Unauthorized)
117-169eadb39a9ee5e7.js:1 Error fetching user data: Error: Authentication failed
    at Object.getCurrentUser (20-d085f2d3adf909b7.js:1:24536)
    at async Object.getUserCreationDate (20-d085f2d3adf909b7.js:1:24708)
    at async page-103a65596ba82166.js:1:29592
117-169eadb39a9ee5e7.js:1 Error getting user creation date: Error: Authentication failed
    at Object.getCurrentUser (20-d085f2d3adf909b7.js:1:24536)
    at async Object.getUserCreationDate (20-d085f2d3adf909b7.js:1:24708)
    at async page-103a65596ba82166.js:1:29592
page-103a65596ba82166.js:1 User creation date: Mon Jan 01 2024 11:00:00 GMT+1100 (Australian Eastern Daylight Time)
page-3c02ea7ff0a31daf.js:1 User stored in backend successfully
page-3c02ea7ff0a31daf.js:1 Authentication completed successfully
page-3c02ea7ff0a31daf.js:1 Connecting to Google Calendar...
page-3c02ea7ff0a31daf.js:1 Connected to Google Calendar
page-3c02ea7ff0a31daf.js:1 TASK-07 FIX: Calendar credentials stored, dashboard will handle event fetching
page-3c02ea7ff0a31daf.js:1 Navigating to: /dashboard
117-169eadb39a9ee5e7.js:1 Error fetching calendar events: TypeError: Failed to fetch
    at Object.fetchEvents (_next/static/chunks/…f0a31daf.js:1:37297)
    at async t (page-103a65596ba82166.js:1:39163)
Navigated to https://yourdai.app/dashboard
layout-db35b87bef89a0bd.js:1 Setting up auth state listener
layout-db35b87bef89a0bd.js:1 Checking redirect result...
layout-db35b87bef89a0bd.js:1 Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
layout-db35b87bef89a0bd.js:1 Got ID token for backend storage
layout-db35b87bef89a0bd.js:1 API Base URL: https://yourdai-production.up.railway.app
layout-db35b87bef89a0bd.js:1 Redirect result: null
layout-db35b87bef89a0bd.js:1 No redirect result found
page-103a65596ba82166.js:1 Setting currentDate: Thu Jul 17 2025 16:08:41 GMT+1000 (Australian Eastern Standard Time)
page-103a65596ba82166.js:1 TASK-07 FIX: Auth ready, starting schedule load
layout-db35b87bef89a0bd.js:1 RouteGuard State: 
{user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
page-103a65596ba82166.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
layout-db35b87bef89a0bd.js:1 User stored in backend successfully
layout-db35b87bef89a0bd.js:1 Authentication completed successfully
page-103a65596ba82166.js:1 ⚠️ Rendering legacy structure
﻿



### Server logs
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.

 * Running on all addresses (0.0.0.0)

 * Running on http://127.0.0.1:8000

 * Running on http://10.250.11.57:8000

Press CTRL+C to quit

100.64.0.2 - - [17/Jul/2025 05:28:55] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:28:55] "OPTIONS /api/calendar/events?date=2025-07-17 HTTP/1.1" 200 -

Traceback (most recent call last):

  File "/app/backend/apis/routes.py", line 79, in verify_firebase_token

    decoded_token = firebase_auth.verify_id_token(token)

                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/firebase_admin/auth.py", line 219, in verify_id_token

    client = _get_client(app)

             ^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/firebase_admin/auth.py", line 171, in _get_client

    return _utils.get_app_service(app, _AUTH_ATTRIBUTE, Client)

           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/firebase_admin/_utils.py", line 97, in get_app_service

    app = _get_initialized_app(app)

          ^^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/firebase_admin/_utils.py", line 82, in _get_initialized_app

    return firebase_admin.get_app()

           ^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/firebase_admin/__init__.py", line 135, in get_app

    raise ValueError(

ValueError: The default Firebase app does not exist. Make sure to initialize the SDK by calling initialize_app().

100.64.0.2 - - [17/Jul/2025 05:28:55] "GET /api/auth/user HTTP/1.1" 401 -

100.64.0.2 - - [17/Jul/2025 05:28:55] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:28:55] "OPTIONS /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:28:56] "GET /api/calendar/events?date=2025-07-17 HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:28:56] "POST /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:29:00] "GET /api/calendar/events?date=2025-07-17 HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:29:01] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:29:01] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:29:01] "OPTIONS /api/calendar/events?date=2025-07-17 HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:29:01] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:29:01] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [17/Jul/2025 05:29:05] "GET /api/calendar/events?date=2025-07-17 HTTP/1.1" 200 -