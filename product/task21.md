# TASK-21: Debug Google Calendar events not syncing
Status: In Progress

## Bug
I am facing a bug where the user's Google Calendar events are not syncing to the dashboard after google sso.

## Steps to reproduce:
1. Click "Get started" on home page
2. Complete google sso
3. arrive on dashboard
4. Bug: google calendar events for today aren't synced


## Expected behaviour:
After google sso and enabling calendar access, google calendar events should be synced and displayed on the dashboard.

## Resources
### Console logs
Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
344-916f81d0f437d897.js:1 OAuth in progress: false
344-916f81d0f437d897.js:1 Storing user from auth state change (non-OAuth)
344-916f81d0f437d897.js:1 Sign in successful: Justin Wu (justin.wu4444@gmail.com)
page-38c6dd705d95bb07.js:1 Authenticated user detected on home page, redirecting to dashboard
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/', isPublicPath: true, inAuthFlow: false, …}
344-916f81d0f437d897.js:1 Has calendar access: true
344-916f81d0f437d897.js:1 Storing user with calendar access flag: true
page-1f7bfc3fb567ad04.js:1 Setting currentDate: Tue Jul 29 2025 13:06:54 GMT+1000 (Australian Eastern Standard Time)
page-1f7bfc3fb567ad04.js:1 Attempting to fetch calendar events for: 2025-07-29
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
344-916f81d0f437d897.js:1 Got fresh ID token for backend storage
344-916f81d0f437d897.js:1 Calendar access status: false
344-916f81d0f437d897.js:1 API Base URL: https://yourdai-production.up.railway.app
site.webmanifest:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
/dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
344-916f81d0f437d897.js:1 Got fresh ID token for backend storage
344-916f81d0f437d897.js:1 Calendar access status: true
344-916f81d0f437d897.js:1 API Base URL: https://yourdai-production.up.railway.app
923-7daa0b2fae2d1407.js:1  GET https://yourdai-production.up.railway.app/api/auth/user 401 (Unauthorized)
getCurrentUser @ 923-7daa0b2fae2d1407.js:1
await in getCurrentUser
getUserCreationDate @ 923-7daa0b2fae2d1407.js:1
117-dca654ed10df48e0.js:1 Error fetching user data: Error: Authentication failed
    at Object.getCurrentUser (923-7daa0b2fae2d1407.js:1:25210)
    at async Object.getUserCreationDate (923-7daa0b2fae2d1407.js:1:25382)
    at async page-1f7bfc3fb567ad04.js:1:20391
window.console.error @ 117-dca654ed10df48e0.js:1
getCurrentUser @ 923-7daa0b2fae2d1407.js:1
await in getCurrentUser
getUserCreationDate @ 923-7daa0b2fae2d1407.js:1
117-dca654ed10df48e0.js:1 Error getting user creation date: Error: Authentication failed
    at Object.getCurrentUser (923-7daa0b2fae2d1407.js:1:25210)
    at async Object.getUserCreationDate (923-7daa0b2fae2d1407.js:1:25382)
    at async page-1f7bfc3fb567ad04.js:1:20391
window.console.error @ 117-dca654ed10df48e0.js:1
getUserCreationDate @ 923-7daa0b2fae2d1407.js:1
await in getUserCreationDate
page-1f7bfc3fb567ad04.js:1 User creation date: Mon Jan 01 2024 11:00:00 GMT+1100 (Australian Eastern Daylight Time)
344-916f81d0f437d897.js:1 User stored in backend successfully with calendar access: true
344-916f81d0f437d897.js:1 Starting calendar connection process...
344-916f81d0f437d897.js:1 Waiting for auth state to stabilize before connecting to Google Calendar...
344-916f81d0f437d897.js:1  GET https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney 400 (Bad Request)
fetchEvents @ 344-916f81d0f437d897.js:1
await in fetchEvents
page-1f7bfc3fb567ad04.js:1 Calendar fetch failed or no calendar connected: Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.
344-916f81d0f437d897.js:1 User stored in backend successfully with calendar access: false
344-916f81d0f437d897.js:1 Authentication completed successfully
344-916f81d0f437d897.js:1 Connecting to Google Calendar...
344-916f81d0f437d897.js:1 Connected to Google Calendar
344-916f81d0f437d897.js:1 TASK-07 FIX: Calendar credentials stored, dashboard will handle event fetching
344-916f81d0f437d897.js:1 Calendar connection complete, showing completion screen
Navigated to https://yourdai.app/connecting
connecting:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
94Manifest fetch from <URL> failed, code 401
344-916f81d0f437d897.js:1 Setting up auth state listener
344-916f81d0f437d897.js:1 Checking redirect result...
344-916f81d0f437d897.js:1 Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
344-916f81d0f437d897.js:1 OAuth in progress: false
344-916f81d0f437d897.js:1 Storing user from auth state change (non-OAuth)
344-916f81d0f437d897.js:1 Redirect result: null
344-916f81d0f437d897.js:1 No redirect result found
page-6d671a308ce094b1.js:1 Connection progress on page load: complete
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/connecting', isPublicPath: false, inAuthFlow: false, …}
344-916f81d0f437d897.js:1 Got fresh ID token for backend storage
344-916f81d0f437d897.js:1 Calendar access status: false
344-916f81d0f437d897.js:1 API Base URL: https://yourdai-production.up.railway.app
page-6d671a308ce094b1.js:1 Redirecting to final destination: /dashboard
344-916f81d0f437d897.js:1 User stored in backend successfully with calendar access: false
344-916f81d0f437d897.js:1 Authentication completed successfully
page-1f7bfc3fb567ad04.js:1 Setting currentDate: Tue Jul 29 2025 13:07:00 GMT+1000 (Australian Eastern Standard Time)
page-1f7bfc3fb567ad04.js:1 Attempting to fetch calendar events for: 2025-07-29
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
site.webmanifest:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
page-1f7bfc3fb567ad04.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
344-916f81d0f437d897.js:1  GET https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney 400 (Bad Request)
fetchEvents @ 344-916f81d0f437d897.js:1
await in fetchEvents
page-1f7bfc3fb567ad04.js:1 Calendar fetch failed or no calendar connected: Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.
site.webmanifest:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
page-6d671a308ce094b1.js:1 Calendar connection timeout, redirecting to dashboard

## Network requests
- https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney
- https://yourdai-production.up.railway.app/api/auth/user
- https://yourdai-production.up.railway.app/api/auth/user: {
    "message": "User successfully created/updated",
    "user": {
        "_id": "67c43aa2748088a1d7d9b585",
        "age": null,
        "calendar": {
            "connected": false,
            "error": null,
            "lastSyncTime": null,
            "selectedCalendars": [],
            "settings": {
                "autoSync": true,
                "defaultReminders": true,
                "syncFrequency": 15
            },
            "syncStatus": "never"
        },
        "calendarSynced": false,
        "createdAt": "2025-03-02T11:01:54.766000",
        "displayName": "Justin Wu",
        "email": "justin.wu4444@gmail.com",
        "googleId": "Si3NryNNjSMbW8q1t0niKX8sYng1",
        "jobTitle": null,
        "lastLogin": "2025-07-29T03:07:00.092000",
        "metadata": {
            "lastModified": "2025-07-29T03:07:00.092000"
        },
        "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c",
        "role": "free",
        "slack": {
            "connected": true,
            "connectedAt": "Fri, 11 Jul 2025 03:11:07 GMT",
            "instanceId": "5dd87456-c0bc-4f4a-aa3f-75ffe8631e09",
            "lastSyncTime": "Fri, 11 Jul 2025 03:11:07 GMT",
            "oauthUrl": "https://api.klavis.ai/oauth/slack/authorize?instance_id=5dd87456-c0bc-4f4a-aa3f-75ffe8631e09",
            "serverUrl": "https://slack-mcp-server.klavis.ai/mcp/?instance_id=5dd87456-c0bc-4f4a-aa3f-75ffe8631e09"
        },
        "timezone": "UTC"
    }
}

https://yourdai-production.up.railway.app/api/calendar/events?date=2025-07-29&timezone=Australia%2FSydney: {
    "error": "Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.",
    "success": false,
    "tasks": []
}

## backend server logs
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.

 * Running on all addresses (0.0.0.0)

 * Running on http://127.0.0.1:8000

 * Running on http://10.250.18.27:8000

Press CTRL+C to quit

100.64.0.2 - - [29/Jul/2025 03:06:55] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:55] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:55] "OPTIONS /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:55] "OPTIONS /api/auth/user HTTP/1.1" 200 -

Traceback (most recent call last):

  File "/app/backend/apis/routes.py", line 89, in verify_firebase_token

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

100.64.0.2 - - [29/Jul/2025 03:06:55] "GET /api/auth/user HTTP/1.1" 401 -

100.64.0.2 - - [29/Jul/2025 03:06:55] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:56] "GET /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 400 -

100.64.0.2 - - [29/Jul/2025 03:06:56] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:56] "OPTIONS /api/schedules/2025-07-29 HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:57] "GET /api/schedules/2025-07-29 HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:57] "OPTIONS /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 03:06:57] "POST /api/calendar/connect HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 03:07:00] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 03:07:01] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 03:07:01] "OPTIONS /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 03:07:01] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 03:07:01] "GET /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 400 -

100.64.0.3 - - [29/Jul/2025 03:07:02] "OPTIONS /api/schedules/2025-07-29 HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 03:07:02] "GET /api/schedules/2025-07-29 HTTP/1.1" 200 