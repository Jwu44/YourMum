# TASK-22: Debug double load on prod before synced google calendar events appear
Status: To do

## Bug
I am facing a bug where after google sso and I land on /dashboard, the dashboard page loads twice before I can see synced google calendar events for the day.

## Steps to reproduce:
1. sign in via google sso
2. provide calendar access
3. land on /dashboard
4. Bug: initial dashboard load does not show google calendar events
5. show page with loading spinner
6. Bug: after a few seconds, the next dashboard load occurs and now i can see google calendar events

## Expected behaviour: when I land on /dashboard, it should only load once and I should see the google calendar events there. in step 5, we should see @CalendarConnectionLoader.tsx

## Resources
### Console logs
Attempting to fetch calendar events for: 2025-07-29
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
site.webmanifest:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
/dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
344-ee6ec9255f51f37a.js:1 User stored in backend successfully with calendar access: false
344-ee6ec9255f51f37a.js:1 Authentication completed successfully
page-855490b9106aa606.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
344-ee6ec9255f51f37a.js:1 User stored in backend successfully with calendar access: true
344-ee6ec9255f51f37a.js:1 Starting calendar connection process...
344-ee6ec9255f51f37a.js:1 Waiting for auth state to stabilize before connecting to Google Calendar...
344-ee6ec9255f51f37a.js:1 Connecting to Google Calendar...
344-ee6ec9255f51f37a.js:1 Connected to Google Calendar successfully
page-855490b9106aa606.js:1 Calendar events fetched successfully: 3 events
page-855490b9106aa606.js:1 ⚠️ Rendering legacy structure
Navigated to https://yourdai.app/dashboard
344-ee6ec9255f51f37a.js:1 Setting up auth state listener
344-ee6ec9255f51f37a.js:1 Checking redirect result...
dashboard:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
344-ee6ec9255f51f37a.js:1 Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
344-ee6ec9255f51f37a.js:1 OAuth in progress: false
344-ee6ec9255f51f37a.js:1 Storing user from auth state change (non-OAuth)
344-ee6ec9255f51f37a.js:1 Redirect result: null
344-ee6ec9255f51f37a.js:1 No redirect result found
page-855490b9106aa606.js:1 Setting currentDate: Tue Jul 29 2025 15:52:53 GMT+1000 (Australian Eastern Standard Time)
page-855490b9106aa606.js:1 Attempting to fetch calendar events for: 2025-07-29
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
344-ee6ec9255f51f37a.js:1 Got fresh ID token for backend storage
344-ee6ec9255f51f37a.js:1 Calendar access status: false
344-ee6ec9255f51f37a.js:1 API Base URL: https://yourdai-production.up.railway.app
page-855490b9106aa606.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
344-ee6ec9255f51f37a.js:1 User stored in backend successfully with calendar access: false
344-ee6ec9255f51f37a.js:1 Authentication completed successfully
page-855490b9106aa606.js:1 Calendar events fetched successfully: 3 events
page-855490b9106aa606.js:1 ⚠️ Rendering legacy structure

### Server logs
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.

 * Running on all addresses (0.0.0.0)

 * Running on http://127.0.0.1:8000

 * Running on http://10.250.18.159:8000

Press CTRL+C to quit

100.64.0.2 - - [29/Jul/2025 05:22:17] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:17] "OPTIONS /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:17] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:17] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:17] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:17] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:18] "GET /api/calendar/events?date=2025-07-29&timezone=Australia/Sydney HTTP/1.1" 400 -

100.64.0.2 - - [29/Jul/2025 05:22:18] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:18] "OPTIONS /api/schedules/2025-07-29 HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:19] "GET /api/schedules/2025-07-29 HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:19] "OPTIONS /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [29/Jul/2025 05:22:20] "POST /api/calendar/connect HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 05:22:23] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.3 - - [29/Jul/2025 05:22:23] "POST /api/auth/user HTTP/1.1" 200 -