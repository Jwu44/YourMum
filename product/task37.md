Status: To do
I am facing a bug where loading today's dashboard for the first time does not trigger autogenerate() to create the schedule

# Preconditions before reproducing:
- user is already logged in
- user does not have a schedule created for today
- user has an existing google calendar connection

# Steps to reproduce:
1. go to /dashboard for the first time today
2. load
3. Bug: observe empty schedule for today
4. refresh page
5. Bug: google calendar events are pulled and acts as today's schedule

# Expected behaviour:
- when the user goes to /dashboard for the first time today, we should be calling autogenerate() to create today's schedule
- just like with the postoauth sign in flow, while autogenerate() is processing, display the loading page until the schedule has fully rendered

# Console logs (before page refresh):
🚀 Dashboard: Conditions met, loading initial schedule...
page-2f1f94df383c920d.js:1 📋 Dashboard: Starting simplified loadInitialSchedule...
page-2f1f94df383c920d.js:1 📅 Dashboard: Attempting to load existing schedule for: 2025-09-05
layout-09f29adf2c957b14.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
564-5eeb1019870bb3ff.js:1 Got fresh ID token for backend storage
564-5eeb1019870bb3ff.js:1 Calendar access status: false
564-5eeb1019870bb3ff.js:1 API Base URL: https://yourmum-production.up.railway.app
564-5eeb1019870bb3ff.js:1  GET https://yourmum-production.up.railway.app/api/schedules/2025-09-05 404 (Not Found)
u @ 564-5eeb1019870bb3ff.js:1
await in u
t @ page-2f1f94df383c920d.js:1
e @ page-2f1f94df383c920d.js:1
aW @ fd9d1056-d01e9804f4c81514.js:1
oe @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
or @ fd9d1056-d01e9804f4c81514.js:1
ol @ fd9d1056-d01e9804f4c81514.js:1
id @ fd9d1056-d01e9804f4c81514.js:1
nb @ fd9d1056-d01e9804f4c81514.js:1
(anonymous) @ fd9d1056-d01e9804f4c81514.js:1
is @ fd9d1056-d01e9804f4c81514.js:1
o1 @ fd9d1056-d01e9804f4c81514.js:1
oZ @ fd9d1056-d01e9804f4c81514.js:1
T @ 117-a2e30b74bbda5457.js:1
page-2f1f94df383c920d.js:1 📝 Dashboard: No existing schedule found, showing empty state
564-5eeb1019870bb3ff.js:1 User stored in backend successfully with calendar access: false
564-5eeb1019870bb3ff.js:1 Authentication completed successfully
page-2f1f94df383c920d.js:1 User creation date: Thu Aug 28 2025 06:56:25 GMT+1000 (Australian Eastern Standard Time)
page-2f1f94df383c920d.js:1 Calendar API working fine, no re-auth needed

Console logs (after page refresh):
🚀 Dashboard: Conditions met, loading initial schedule...
page-2f1f94df383c920d.js:1 📋 Dashboard: Starting simplified loadInitialSchedule...
page-2f1f94df383c920d.js:1 📅 Dashboard: Attempting to load existing schedule for: 2025-09-05
layout-09f29adf2c957b14.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
564-5eeb1019870bb3ff.js:1 Got fresh ID token for backend storage
564-5eeb1019870bb3ff.js:1 Calendar access status: false
564-5eeb1019870bb3ff.js:1 API Base URL: https://yourmum-production.up.railway.app
page-2f1f94df383c920d.js:1 ✅ Dashboard: Found existing schedule with 2 tasks
page-2f1f94df383c920d.js:1 ⚠️ Rendering legacy structure
564-5eeb1019870bb3ff.js:1 User stored in backend successfully with calendar access: false
564-5eeb1019870bb3ff.js:1 Authentication completed successfully
page-2f1f94df383c920d.js:1 User creation date: Thu Aug 28 2025 06:56:25 GMT+1000 (Australian Eastern Standard Time)
page-2f1f94df383c920d.js:1 Calendar API working fine, no re-auth needed
