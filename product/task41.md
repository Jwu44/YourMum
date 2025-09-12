# Status: To do
I am facing a bug where I am asked forced to re sign in via google sso to reconnect my google calendar every hour

# Context
**Root Cause**: PostOAuthHandler was storing calendar credentials without refresh tokens during every sign-in, causing hourly re-authentication when access tokens expired.

**Key Issue**: Two competing OAuth flows existed:
1. PostOAuthHandler (Firebase OAuth) - No refresh tokens, runs on every sign-in
2. reconnectCalendar() (Direct Google OAuth) - Proper refresh tokens, but never used in normal flow

**Evidence from logs**: `DEBUG: Access token expired but no refresh token available for user VlCf1isTbDM2lSlj1rJkNMQlORN2`

# Steps to reproduce:
1. As an existing user, have a google calendar connection and schedule for the day
2. Wait more than an hour
3. Come back to /dashboard and see the toast "title: 'Calendar Connection Issue',
              description: 'Please reconnect your Google Calendar in the Integrations page.',"
4. Force prompted to re sign in


# Expected behaviour:
- Once google sso and calendar access have been provided they should last indefinitely via refresh tokens
- User should only re sign in when they have explicitly logged out or deleted their account
- User should only re provide calendar access if they have previously disconnected google calendar

# Browser logs
🚀 API Client initialized with automatic token refresh
259-0d051d46af7fd466.js:1 🚀 AuthProvider: Initializing centralized API client
259-0d051d46af7fd466.js:1 🚀 API Client initialized with automatic token refresh
259-0d051d46af7fd466.js:1 Setting up auth state listener
259-0d051d46af7fd466.js:1 Checking redirect result...
259-0d051d46af7fd466.js:1 Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
259-0d051d46af7fd466.js:1 OAuth in progress: false
259-0d051d46af7fd466.js:1 Storing user from auth state change (non-OAuth)
259-0d051d46af7fd466.js:1 Storing user in backend with calendar access: false
259-0d051d46af7fd466.js:1 Redirect result: null
259-0d051d46af7fd466.js:1 No redirect result found
page-e2433a7720ee9f51.js:1 Setting currentDate: Fri Sep 12 2025 11:45:58 GMT+1000 (Australian Eastern Standard Time)
page-e2433a7720ee9f51.js:1 🔍 Dashboard: Starting calendar health validation...
page-e2433a7720ee9f51.js:1 🚀 Dashboard: Conditions met, loading initial schedule...
page-e2433a7720ee9f51.js:1 📋 Dashboard: Starting simplified loadInitialSchedule...
page-e2433a7720ee9f51.js:1 📅 Dashboard: Attempting to load existing schedule for: 2025-09-12
layout-f5d1f7f21e9d5fa9.js:1 RouteGuard State: {user: 'Justin Wu (justin.wu4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
259-0d051d46af7fd466.js:1  GET https://yourmum-production.up.railway.app/api/calendar/events?date=2025-09-12 400 (Bad Request)  
page-e2433a7720ee9f51.js:1 Calendar API failed with auth error, needs re-authentication
page-e2433a7720ee9f51.js:1 ⚠️ Calendar health issue: calendar_auth_failed
page-e2433a7720ee9f51.js:1 🔄 Attempting calendar credential refresh...
259-0d051d46af7fd466.js:1 Starting direct Google OAuth calendar reconnection
117-a2e30b74bbda5457.js:1 Calendar reconnection error: Error: Google Client ID not configured
117-a2e30b74bbda5457.js:1 ❌ Failed to refresh calendar credentials: Error: Google Client ID not configured
page-e2433a7720ee9f51.js:1 User creation date: Thu Aug 28 2025 06:56:25 GMT+1000 (Australian Eastern Standard Time)
page-e2433a7720ee9f51.js:1 ✅ Dashboard: Found existing schedule with 11 tasks
page-e2433a7720ee9f51.js:1 ✅ Rendering optimized backend structure
259-0d051d46af7fd466.js:1 ✅ User stored in backend successfully with calendar access: false
259-0d051d46af7fd466.js:1 Authentication completed successfully

# Fix Applied

**Solution**: Implemented single source of truth for calendar OAuth by simplifying PostOAuthHandler and enforcing direct Google OAuth flow.

## Changes Made

### 1. Simplified PostOAuthHandler (`/auth/PostOAuthHandler.tsx`)
- **Removed**: Calendar connection logic (lines 89-115) that stored credentials without refresh tokens
- **Kept**: Schedule generation and navigation orchestration only
- **Result**: No more broken OAuth flow storing access-token-only credentials

### 2. Modified AuthContext (`/auth/AuthContext.tsx`) 
- **Updated**: `processCalendarAccess()` to redirect to proper OAuth flow when calendar access detected
- **Enforced**: Single source of truth - all calendar OAuth goes through `reconnectCalendar()`
- **Flow**: Sign-in with calendar → Direct Google OAuth → `/oauth-exchange` → Refresh tokens stored

### 3. Added Tests (`/tests/SimplifiedPostOAuthHandler.test.tsx`)
- Created comprehensive test suite following TDD principles
- Verified simplified PostOAuthHandler functionality
- Ensured no regressions in schedule orchestration

## Technical Details
- **Backend OAuth exchange**: Already functional at `/api/calendar/oauth-exchange` 
- **Refresh token storage**: Backend properly handles token refresh via existing logic
- **OAuth parameters**: `access_type: 'offline'` and `prompt: 'consent'` ensure refresh tokens

## Expected Result
- Users authenticate once with proper refresh tokens
- No more hourly re-authentication prompts
- Backend automatically refreshes tokens when needed
- Clean separation: Firebase for user auth, Direct Google OAuth for calendar