# TASK-05: Implement create next day schedule
Status: In Progress (75% complete)

## Problem
When viewing the schedule for the current day, users don't have the ability to click the right arrow to create a schedule for the next day automatically

## Requirements
- given user is viewing schedule for any day, then clicks the right arrow ">" in the dashboard header, this should check if a schedule exists for the next day:
    - if yes simply simply load the cached schedule
    = if no, but the next day schedule is in the past, then don't create a new schedule  and show frontend empty state
    - if no but the next day schedule is in the feature, then create a new schedule object following the below:
- the next day schedule object must contain:
    - any incomplete tasks from the current day
    - same format as the current day by rolling over any tasks with is_section=true if they exist, these sections should be preserved if they exist in the current day
    - detect if in the next day, there are any recurring tasks for that date
- if the user clicks on right arrow ">" again after creating the next day schedule, then reuse the same logic 
- ensure if any inputs config has been provided for the current date, it is preserved and will be carried over to the next day and stored against the schedule.inptus
- the next day schedule should NEVER replace/override an existing schedule if navigating from previous schedules

## Implementation Progress

### ✅ Completed (Steps 1-3)
**Backend API Enhancements:**
1. **Fixed `get_schedule_by_date`** (`backend/services/schedule_service.py`)
   - Added `"inputs": schedule_doc.get('inputs', {})` to return payload
   - Now returns schedule + metadata + inputs config (was missing inputs)

2. **Enhanced POST `/api/schedules`** (`backend/apis/routes.py`, `backend/services/schedule_service.py`)
   - Updated `create_empty_schedule()` method to accept optional `inputs` parameter
   - Modified API endpoint to extract, validate, and pass inputs from request body
   - Added proper TypeScript type definitions and error handling

**Frontend API Integration:**
3. **Enhanced `createSchedule`** (`frontend/lib/ScheduleHelper.tsx`)
   - Added optional `inputs?: Record<string, any>` parameter
   - Includes inputs in API request payload when provided
   - Maintained backward compatibility (existing calls still work)

### 🔄 Remaining (Step 4)
**Dashboard Next-Day Logic:**
4. **Implement `handleNextDay` enhancement** (`frontend/app/dashboard/page.tsx`)
   - Create `filterTasksForNextDay()` function with logic:
     - Preserve all sections (`is_section: true`)
     - Include incomplete non-recurring tasks  
     - Include recurring tasks that should appear on next day (reset to `completed: false`)
     - Use existing `shouldTaskRecurOnDate()` for recurrence checking
   - Update `handleNextDay()` workflow:
     - Get current schedule + inputs via `loadSchedule(currentDate)`
     - Filter tasks using new filtering logic
     - Create next-day schedule via `createSchedule(nextDate, filteredTasks, inputs)`
     - Navigate to next day regardless of success/failure
     - Show appropriate success/error toast

### Technical Details
- **Recurring Task Logic**: Completed recurring tasks reset to incomplete on next day if they should recur
- **Inputs Preservation**: ALL inputs config fields carried over to next day
- **Error Handling**: Navigate with error toast + empty schedule if creation fails
- **Existing Functionality**: Cached navigation (when next day already loaded) remains unchanged

## Acceptance Criteria
### Scenario A: User is viewing current day (unstructured) and clicks right arrow
- if i am viewing the current day schedule for July 16th with the following tasks:
    - gym: complete
    - meeting: incomplete
- and i click on the right arrow,
- then i should see a schedule for tomorrow on July 17th containing only:
    - meeting: incomplete

### Scenario B: User is viewing current day (structured) and clicks right arrow
- if i am viewing the current day schedule for July 16th with the following tasks:
    - morning
    - gym: complete
    - meeting: incomplete
    - afternoon
    - will 1 on 1: incomplete
    - evening
    - reading: complete
- and i click on the right arrow,
- then i should see a schedule for tomorrow on July 17th containing:
    - morning
    - meeting: incomplete
    - afternoon
    - will 1 on 1: incomplete
    - evening


### Scenario C: User is viewing current day (structured) and has recurring tasks and clicks right arrow
- if i am viewing the current day schedule for July 16th with the following tasks:
    - morning
    - gym: complete (daily recurring)
    - meeting: incomplete
    - afternoon
    - will 1 on 1: incomplete
    - evening
    - reading: complete (weekly recurring)
- and i click on the right arrow,
- then i should see a schedule for tomorrow on July 17th containing:
    - morning
    - gym: incomplete (daily recurring)
    - meeting: incomplete
    - afternoon
    - will 1 on 1: incomplete
    - evening