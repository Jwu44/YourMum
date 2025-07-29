# TASK-21: Debug Google Calendar events not syncing
Status: Completed

## Bug
I am facing a bug where Google Calendar events are not syncing and displaying on the dashboard.

## Context
Root Cause Analysis
The Problem: Race Condition Between Calendar Connection and Status Check
From the logs, I can see this sequence:
1. ✅ "Has calendar access: true" - OAuth scopes are correct
2. ✅ "Connecting to Google Calendar..." - Connection process starts
3. ✅ "Connected to Google Calendar" - Connection appears successful
4. ❌ "Calendar connection status: false" - But status check returns false immediately after
The issue is that the dashboard's loadInitialSchedule runs immediately after page load and checks calendar status before the processCalendarAccess function has completed storing the credentials in the backend.

## Steps to reproduce:
1. Click "Get started" on home page
2. Complete google sso
3. arrive on dashboard
4. Bug: google calendar events for today aren't synced


## Expected behaviour: after google sso and enabling calendar access, google calendar events should be synced and displayed

## Solution Implemented

**Root Cause**: Race condition where dashboard's `loadInitialSchedule` ran before `processCalendarAccess` finished storing credentials in the backend.

**Fix Applied**:
1. **Modified `processCalendarAccess` in AuthContext.tsx**:
   - Added proper waiting for calendar connection with verification
   - Implemented timeout handling (10 seconds)
   - Added retry mechanism for credential verification (5 attempts)
   - Added progress tracking via localStorage

2. **Created transition loading screen**:
   - New `CalendarConnectionLoader` component with progress indicators
   - New `/connecting` page that shows during credential storage
   - Real-time progress updates (connecting → verifying → complete)
   - Fallback timeout after 15 seconds

3. **Enhanced dashboard error handling**:
   - Added error toast display for connection failures
   - Simplified `loadInitialSchedule` logic (race condition eliminated)
   - Direct calendar event fetching without redundant status checks

4. **Added comprehensive tests**:
   - Test coverage for race condition fix
   - Timeout and error handling validation
   - Integration tests for dashboard loading

**Result**: Users now see a single coherent loading state during calendar connection, and calendar events are reliably synced and displayed on the dashboard after authentication.

## Resources
### Console logs
"GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
 Has calendar access: true
 Waiting for auth state to stabilize before connecting to Google Calendar...
 Calendar connection status: false
 Calendar not connected, skipping calendar sync
 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
 User stored in backend successfully
 Authentication completed successfully
 Connecting to Google Calendar...
 Connected to Google Calendar
 TASK-07 FIX: Calendar credentials stored, dashboard will handle event fetching
 Navigating to: /dashboard
Navigated to https://yourdai.app/dashboard
344-3f5f0caf49cfd0a9.js:1 Setting up auth state listener
344-3f5f0caf49cfd0a9.js:1 Checking redirect result...
dashboard:1  GET https://yourdai.app/site.webmanifest 401 (Unauthorized)
dashboard:1 Manifest fetch from https://yourdai.app/site.webmanifest failed, code 401
344-3f5f0caf49cfd0a9.js:1 Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
344-3f5f0caf49cfd0a9.js:1 Got ID token for backend storage
344-3f5f0caf49cfd0a9.js:1 API Base URL: https://yourdai-production.up.railway.app
344-3f5f0caf49cfd0a9.js:1 Redirect result: null
344-3f5f0caf49cfd0a9.js:1 No redirect result found
page-6df4d2389b7b37af.js:1 Setting currentDate: Tue Jul 29 2025 11:41:48 GMT+1000 (Australian Eastern Standard Time)
page-6df4d2389b7b37af.js:1 Checking calendar connection for user: Si3NryNNjSMbW8q1t0niKX8sYng1
layout-893795dc592b02d1.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
page-6df4d2389b7b37af.js:1 Calendar connection status: false
page-6df4d2389b7b37af.js:1 Calendar not connected, skipping calendar sync
page-6df4d2389b7b37af.js:1 User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
344-3f5f0caf49cfd0a9.js:1 User stored in backend successfully
344-3f5f0caf49cfd0a9.js:1 Authentication completed successfully
