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

# New bug post fix applied
# Status: To Do
I am facing a bug where I am stuck indefinitely on the loading page after google sso and providing google calendar access

# Steps to reproduce:
1. Either sign in through the home page or load the dashboard as an existing user after 1 hour
2. Bug: stuck on "Conencting to google calendar" load page


# Expected behaviour:
- if user is signing in for the first time today and doesn't have a schedule for today, autogneerate() should be called, then user should proceed to /dashboard
- if user is signing in for the first time today and has a schedule already, then user should proceed to /dashboard with existing schedule simply loaded
- if user has already signed in today and doesn't have an existing schedule for today, then visitng /dashboard should call autogenerate() and user should see rendered schedule
- if user has already signed in today and does have an existing schedule for today, then visiting /dashboard should show simply load existing schedule 

# Resources
## Console logs
📱 Dashboard: PostOAuthHandler is active, showing LoadingPage
page-e2433a7720ee9f51.js:1 Setting currentDate: Fri Sep 12 2025 13:56:37 GMT+1000 (Australian Eastern Standard Time)
page-e2433a7720ee9f51.js:1 🔍 Dashboard: Starting calendar health validation...
page-e2433a7720ee9f51.js:1 ⏭️ Dashboard: Skipping load - already loaded or in OAuth flow
layout-f5d1f7f21e9d5fa9.js:1 RouteGuard State: Object
page-e2433a7720ee9f51.js:1 📱 Dashboard: PostOAuthHandler is active, showing LoadingPage
page-e2433a7720ee9f51.js:1 ⏭️ Calendar validation skipped: oauth_in_progress
259-6f312bd8cb6f1bda.js:1 Has calendar access: true
259-6f312bd8cb6f1bda.js:1 Storing user with calendar access flag: true
259-6f312bd8cb6f1bda.js:1 Storing user in backend with calendar access: true
259-6f312bd8cb6f1bda.js:1 ✅ Firebase ID token refreshed successfully
page-e2433a7720ee9f51.js:1 User creation date: Thu Aug 28 2025 06:56:25 GMT+1000 (Australian Eastern Standard Time)
page-e2433a7720ee9f51.js:1 📱 Dashboard: PostOAuthHandler is active, showing LoadingPage
259-6f312bd8cb6f1bda.js:1 ✅ User stored in backend successfully with calendar access: false
259-6f312bd8cb6f1bda.js:1 Authentication completed successfully
259-6f312bd8cb6f1bda.js:1 ✅ User stored in backend successfully with calendar access: true
259-6f312bd8cb6f1bda.js:1 ✅ Calendar access granted - redirecting to proper OAuth flow for refresh tokens
259-6f312bd8cb6f1bda.js:1 Starting direct Google OAuth calendar reconnection
117-a2e30b74bbda5457.js:1 Calendar reconnection error: Error: User must be authenticated to reconnect calendar
    at _ (259-6f312bd8cb6f1bda.js:1:6797)
    at C (259-6f312bd8cb6f1bda.js:1:2736)
    at async j (259-6f312bd8cb6f1bda.js:1:6168)
    at async g (page-1797035c6a1e80ec.js:1:532)
(anonymous) @ 117-a2e30b74bbda5457.js:1
117-a2e30b74bbda5457.js:1 Error in processCalendarAccess: Error: User must be authenticated to reconnect calendar
    at _ (259-6f312bd8cb6f1bda.js:1:7812)
    at C (259-6f312bd8cb6f1bda.js:1:2736)
    at async j (259-6f312bd8cb6f1bda.js:1:6168)
    at async g (page-1797035c6a1e80ec.js:1:532)
(anonymous) @ 117-a2e30b74bbda5457.js:1
117-a2e30b74bbda5457.js:1 📅 Calendar connection error in processCalendarAccess: User must be authenticated to reconnect calendar
(anonymous) @ 117-a2e30b74bbda5457.js:1
page-e2433a7720ee9f51.js:1 📱 Dashboard: PostOAuthHandler is active, showing LoadingPage
259-6f312bd8cb6f1bda.js:1 🌍 Timezone sync needed: UTC → Australia/Sydney
259-6f312bd8cb6f1bda.js:1 ✅ Timezone updated successfully to: Australia/Sydney

# Fix Applied for Infinite Loading Loop

## Root Cause Analysis
The infinite loading loop was caused by a **race condition** where `processCalendarAccess()` called `reconnectCalendar()` before Firebase auth state (`auth.currentUser`) was fully established. This resulted in:
1. "User must be authenticated to reconnect calendar" error
2. PostOAuthHandler remaining active indefinitely 
3. Dashboard stuck showing LoadingPage

## Changes Made

### 1. Fixed Race Condition (`/frontend/auth/AuthContext.tsx`)
- **Added**: `waitForAuthState()` function with retry mechanism and 200ms delays
- **Updated**: `processCalendarAccess()` to wait for Firebase auth state before calling `reconnectCalendar()`
- **Result**: Eliminated "User must be authenticated" error

### 2. Improved Error Recovery (`/frontend/auth/AuthContext.tsx`)
- **Enhanced**: Error handling in `processCalendarAccess()` to trigger schedule-only flow when calendar fails
- **Added**: Fallback logic to ensure users can reach dashboard even without calendar
- **Result**: No more infinite loading loops, users proceed to dashboard with schedule functionality

### 3. Simplified PostOAuthHandler Detection (`/frontend/auth/PostOAuthHandler.tsx`)
- **Simplified**: `isPostOAuthActive()` detection logic to prevent complex localStorage/sessionStorage dependencies
- **Added**: Timeout protection with 2-minute automatic cleanup of stale OAuth indicators
- **Added**: Timestamp-based tracking to prevent infinite active states
- **Result**: PostOAuthHandler properly deactivates and doesn't get stuck

## Expected Result
- ✅ Users can sign in and reach dashboard even if calendar connection fails
- ✅ No more infinite loading loops 
- ✅ Race condition eliminated with proper timing checks
- ✅ PostOAuthHandler properly deactivates after schedule generation

# Architectural Issues Identified (Future Refactoring Needed)

## Complexity Problems

### AuthContext Monolith
The `AuthContext.tsx` has grown into a monolith managing 7+ different concerns:
- Firebase authentication state management
- Google OAuth with calendar scopes
- PostOAuthHandler orchestration  
- Calendar connection state management
- User storage with conflicting calendar flags
- Direct Google OAuth for refresh tokens
- OAuth callback handling

### State Management Chaos
- **5+ Overlapping Boolean Flags**: `isOAuthInProgress`, `calendarConnectionStage`, `showPostOAuthHandler`, `loading`, `error`
- **Race Conditions**: Multiple useEffects can modify OAuth state simultaneously
- **Inconsistent User Storage**: Backend receives conflicting calendar access flags during auth flow

### Multiple OAuth Flows
Currently implements 3 different OAuth approaches creating confusion:
1. Firebase popup/redirect with calendar scopes
2. Direct Google OAuth for refresh tokens  
3. OAuth callback exchange

## Recommended Future Improvements

### 1. Architectural Separation
- **Extract Calendar Logic**: Move calendar-specific functionality to dedicated `CalendarContext`
- **State Machine Pattern**: Replace boolean flags with proper state machine pattern
- **Single OAuth Flow**: Consolidate to one OAuth approach for clarity

### 2. State Management Simplification
```typescript
// Recommended state machine pattern
type AuthState = 
  | 'unauthenticated'
  | 'authenticating' 
  | 'authenticated'
  | 'calendar_connecting'
  | 'calendar_connected'
```

### 3. Error Boundary Implementation
- Add proper error boundaries around PostOAuthHandler
- Implement circuit breaker pattern for OAuth failures
- Add comprehensive error recovery flows

### 4. Simplified User Flow
```
signIn() → authenticated → (optional) connectCalendar() → dashboard
```

**Priority**: Medium - Current fixes resolve user-blocking issues, but architectural debt should be addressed in next major refactor cycle.
