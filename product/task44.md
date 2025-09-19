# Status: Resolved
I am facing a bug where after google sso and providing gcal access and seeing "connecting to google calendar", the dashboard loads briefly, but them i am taken back to the google oauth page

# Preconditions 
- First time user
- Has completed google sso and given gcal access 

# Steps to reproduce:
1. Go through auth flow and grant gcal access
2. See the loading page "Connecting to google calendar..."
3. Sees dashboard
4. Bug: get taken back to google oauth page saying to "choose an account"

# Expected behaviour:
- Once google sso and gcal access have been provided, do not direct user back to google oauth page
- user should proceed to /dashboard and see the schedule rendered

# Console logs
# Backend logs


# Attempted fix no 1
## Root Cause Analysis
1. **Primary Issue**: OAuth redirect loop caused by `await reconnectCalendar()` call in AuthContext.tsx:112
   - After successful OAuth + calendar access, code immediately redirected back to Google OAuth instead of proceeding to dashboard
   - Backend logs showed `hasCalendarAccess: False` mismatch indicating calendar credentials weren't being stored

2. **Secondary Issue**: Python datetime scoping error in backend
   - `UnboundLocalError: cannot access local variable 'datetime'` preventing user creation
   - Caused by conflicting global and local datetime imports

## Fixes Applied

### Frontend Fix (AuthContext.tsx)
- **Removed problematic redirect**: Eliminated `await reconnectCalendar()` call that caused OAuth loop
- **Direct PostOAuthHandler flow**: When `hasCalendarAccess: true`, proceed directly to schedule generation
- **Enhanced storeUserInBackend()**: Added support for `calendarAccessToken` parameter

### Backend Fix (routes.py)
- **DateTime scoping fix**:
  - Added single global import: `from datetime import datetime, timezone, timedelta`
  - Removed all local datetime imports from individual functions
  - Replaced `dt.strptime()` with `datetime.strptime()` throughout file
- **Enhanced user creation**: Added calendar credential storage when `calendarAccessToken` provided

## Files Modified
- `frontend/auth/AuthContext.tsx` - OAuth flow fix
- `backend/apis/routes.py` - DateTime scoping and user creation fix

## Testing Status
After applying fixes, console logs show:
- ✅ OAuth redirect loop eliminated
- ✅ User reaches dashboard without redirect back to OAuth
- ❌ Backend 500 error still occurring during user creation (datetime fix needs verification)
- ❌ Calendar API 400 error after reaching dashboard (separate issue)

# Attempted fix no 2
## Root Cause Analysis
1. **Calendar Health Error Classification**: 400 Bad Request errors incorrectly treated as auth failures
   - Calendar health service triggered `reconnectCalendar()` on 400 errors (missing credentials)
   - Should only trigger reauth on 401 Unauthorized (expired tokens)

2. **Race Condition in User Storage**: Auth state changes overwriting OAuth calendar setup
   - OAuth flow: `storeUserInBackend(user, true, token)` → sets calendar.connected: true
   - Auth state change: `storeUserInBackend(user, false)` → overwrites calendar.connected: false
   - Race condition caused calendar credentials to be lost

3. **MongoDB Schema Validation**: refreshToken null values causing 500 errors
   - Schema required refreshToken as string, but code set to null/None
   - Prevented successful user creation during OAuth flows

## Fixes Applied

### Calendar Health Service Fix (calendar-health.ts)
- **Error Classification**: Split 400/401 handling logic
  - 401 Unauthorized → `needsReauth: true` (token expired)
  - 400 Bad Request → `needsReauth: false` (missing credentials/API error)
- **Enhanced Logging**: Added specific error type logging for better debugging

### Race Condition Fix (db_config.py)
- **Backend Merge Logic**: Preserve calendar state when not explicitly updating
  - Check for `hasCalendarAccess` field presence to determine intent
  - OAuth calls (with field) → update calendar state
  - Auth state calls (without field) → preserve existing calendar state
- **Eliminates Race Conditions**: Server-side logic prevents overwrites

### MongoDB Schema Fix (routes.py, calendar_routes.py)
- **RefreshToken Handling**: Changed `null` → `""` to satisfy schema validation
  - Firebase OAuth: `refreshToken: ""` (empty string)
  - Direct OAuth: `refreshToken: token || ""` (fallback to empty string)

## Files Modified
- `frontend/lib/services/calendar-health.ts` - Error classification fix
- `backend/db_config.py` - Calendar state preservation logic
- `backend/apis/routes.py` - MongoDB schema compliance
- `backend/apis/calendar_routes.py` - RefreshToken null fix
- `frontend/auth/AuthContext.tsx` - Added timing logs for debugging

## Testing Status
- ✅ OAuth redirect loop eliminated (calendar health fix)
- ✅ Users created with calendar.connected: true (race condition fix)
- ✅ No MongoDB validation errors (schema fix)
- ✅ 400 errors no longer trigger unnecessary reauth
- ✅ Calendar credentials preserved across auth state changes
