# TASK-47: Dashboard Infinite Loading Bug Investigation

**Status**: IN PROGRESS
**Type**: Critical Bug Fix
**Priority**: High
**Effort**: Investigation Phase

## Problem Statement

**Root Issue**: Dashboard stuck in infinite loading state for first-time users after OAuth completion
- Users successfully complete OAuth flow and are redirected to `/dashboard`
- Dashboard shows skeleton loading animation indefinitely
- Expected behavior: Load existing schedule OR autogenerate schedule for new users

## Investigation Summary

### Key Findings

1. **OAuth Flow Works Correctly**
   -  User creation successful in database
   -  Calendar tokens properly stored with refresh capabilities
   -  Authentication race condition fixed (task46.md)

2. **Dashboard Loading Logic Analysis** (`frontend/app/dashboard/page.tsx:1213-1268`)
   ```javascript
   loadInitialSchedule() {
     // 1. Try loadSchedule(today)
     // 2. If no schedule, try autogenerateTodaySchedule(today)
     // 3. Finally setIsLoadingSchedule(false)
   }
   ```

3. **API Request Analysis** (Browser DevTools)
   - L `GET /api/schedules/2025-09-18` request shows "(pending)" - never completes
   -  Previous requests (`/api/auth/user`, `/api/auth/oauth-callback`) work fine
   - � `autogenerateTodaySchedule()` never called because `loadSchedule()` hangs

4. **Backend HTTP Logs**
   -  Backend receives `GET /api/schedules/2025-09-18` request
   -  Returns 200 status code
   - L Response never reaches frontend

### Root cause assumption

**JSON Serialization Issue**: MongoDB `ObjectId` in schedule documents cannot be JSON serialized by Flask, causing response to hang after 200 status.

**Technical Details**:
- `schedule_service.get_schedule_by_date()` returns MongoDB document with `_id` field
- Flask `jsonify()` attempts to serialize `ObjectId` � hangs
- Frontend never receives response � infinite loading

### Changes Made

**Fix Applied** (`backend/services/schedule_service.py:63-66`):
```python
# OLD: Returns document with ObjectId _id field
schedule_doc = self.schedules_collection.find_one({
    "userId": user_id,
    "date": formatted_date
})

# NEW: Excludes _id field to prevent serialization issues
schedule_doc = self.schedules_collection.find_one({
    "userId": user_id,
    "date": formatted_date
}, {"_id": 0})
```

## Requirements

### For New Users (First-Time Flow)
- If google calendar was successful connected and synced, then create today's schedule using today's events
- Otherwise, show empty schedule 

### For Existing Users
- If existing user has no schedule for today, call `autogenerateTodaySchedule()`
- Otherwise existing user has a schedule for today which we simply load 