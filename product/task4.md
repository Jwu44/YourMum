# TASK-04: Debug view previous day schedules 
Status: In progress
## Bug
I am facing a bug where after navigating to previous schedules via the left arrow, then using the right arrow I try to navigate to the current day, I am unable to proceed to the today's empty schedule.

## Steps to reproduce:
1. Let's say I start by viewing today's schedule on July 16th and it's empty
2. Click left arrow to go to July 15th, click again to July 14th etc...
3. Click right arrow to go back all the way to July 15th
4. Now on the July 15th schedule, clicking the right arrow doesn't take me to today's empty schedule on July 16th


## Expected behaviour: If today's schedule hasn't been created aka, empty, then we should create an empty schedule object upon initial load

## Resources
### Console logs
ScheduleHelper.tsx:148  GET http://localhost:8000/api/schedules/2025-07-16 404 (NOT FOUND)
loadSchedule @ ScheduleHelper.tsx:148
await in loadSchedule
eval @ page.tsx:358
onClick @ DashboardHeader.tsx:96
callCallback @ react-dom.development.js:20565
invokeGuardedCallbackImpl @ react-dom.development.js:20614
invokeGuardedCallback @ react-dom.development.js:20689
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:20703
executeDispatch @ react-dom.development.js:32128
processDispatchQueueItemsInOrder @ react-dom.development.js:32160
processDispatchQueue @ react-dom.development.js:32173
dispatchEventsForPlugins @ react-dom.development.js:32184
eval @ react-dom.development.js:32374
batchedUpdates$1 @ react-dom.development.js:24953
batchedUpdates @ react-dom.development.js:28844
dispatchEventForPluginEventSystem @ react-dom.development.js:32373
dispatchEvent @ react-dom.development.js:30141
dispatchDiscreteEvent @ react-dom.development.js:30112
page.tsx:416 Error handling next day: TypeError: Cannot read properties of undefined (reading 'filter')
    at eval (page.tsx:366:48)

### Network requests
http://localhost:8000/api/schedules/2025-07-16: {
  "error": "No schedule found for this date",
  "success": false
}

## Suspected Root Cause
When I arrive on yourdai's dashboard for the first time today and the schedule is empty, this means no schedule object has been created for the day.


## Previous Bug # 1 - now resolved ✅
I am facing a bug where at first, navigating to a previous schedule (whether structured or unstructured) does not render when loading to that date initially.

## Steps to reproduce:
1. Let's say I start by viewing today's schedule on July 16th
2. Click left arrow to go to July 15th
3. Bug: I see empty state: No schedule found for selected date
4. Click left arrow to go to July 14th
5. Click right arrow to go back to July 15th and now the schedule appears

## Expected behaviour: Given a schedule exists for any date, whether it has a structured or unstructured format, always render it at first

## Root Cause Analysis
The bug was caused by an **array indexing mismatch** in the `handlePreviousDay` function:

1. **Render logic expects**: `scheduleDays[Math.abs(currentDayIndex)]` to find the data
   - For yesterday (`currentDayIndex = -1`): looks for data at `scheduleDays[1]`
   - For day before (`currentDayIndex = -2`): looks for data at `scheduleDays[2]`

2. **Previous day loading used**: `newDays.unshift(previousDaySchedule)` which placed data at index 0
   - When going from today to yesterday, data was inserted at `scheduleDays[0]`
   - But render logic expected yesterday's data at `scheduleDays[1]`
   - **Mismatch!** Data was at wrong index, causing empty state to show

## Implementation
**Files Modified:**
- `frontend/app/dashboard/page.tsx` - Fixed array indexing in `handlePreviousDay` function

**Key Changes:**

1. **Replaced complex `unshift` logic with direct index placement**:
```typescript
// Before: Complex conditional insertion
if (currentDayIndex === 0) {
  newDays.unshift(previousDaySchedule); // Wrong! Puts data at index 0
} else {
  newDays[currentDayIndex - 1] = previousDaySchedule;
}

// After: Consistent direct placement
const targetIndex = Math.abs(currentDayIndex - 1);
while (newDays.length <= targetIndex) {
  newDays.push([]);
}
newDays[targetIndex] = previousDaySchedule; // Correct! Data where render expects it
```

2. **Applied fix to all four code paths** in `handlePreviousDay`:
   - Cached schedule path
   - Successful API load path  
   - Failed API load path
   - Error handling path

**Result**: Previous day schedules now render immediately upon navigation, eliminating the need to navigate away and back to see the data.

# Previous Bug #2 - now resolved ✅
## Bug
I am facing a bug where I am able to view schedules that display in an unstructured format. But when viewing schedules with a structured format (e.g. day sections, priority, category) they don't render in the frontend dashboard when they exist in the mongodb backend.

## Steps to reproduce:
1. Click left arrow "<" to nav to a previous schedule
2. Bug: For previous sdates with an existing schedule with a structured format don't load. We see the empty state text "No schedule found for selected date" instead

## Expected behaviour: Given an existing schedule exists, always render it

## Root Cause Analysis
The bug was caused by two issues in the frontend rendering logic:

1. **Negative array index access**: `currentDayIndex` becomes negative for previous days (-1, -2, etc.), but JavaScript arrays don't support negative indexing like Python. `scheduleDays[-1]` returns `undefined`, causing the condition `scheduleDays[currentDayIndex]?.length > 0` to fail.

2. **Layout preference filtering**: `EditableSchedule.tsx` was filtering out sections (`is_section: true`) based on current user layout preference instead of preserving the original schedule structure from the API.

## Implementation
**Files Modified:**
- `frontend/app/dashboard/page.tsx` - Fixed array indexing for negative currentDayIndex values
- `frontend/components/parts/EditableSchedule.tsx` - Removed layout preference filtering to preserve original schedule structure

**Key Changes:**

1. **Fixed negative array indexing** (dashboard/page.tsx):
```typescript
// Before: scheduleDays[currentDayIndex]?.length > 0
// After: scheduleDays[Math.abs(currentDayIndex)]?.length > 0
) : scheduleDays.length > 0 && scheduleDays[Math.abs(currentDayIndex)]?.length > 0 ? (
  <div className="space-y-4">
    <EditableSchedule
      tasks={scheduleDays[Math.abs(currentDayIndex)] || []}
```

2. **Removed layout preference filtering** (EditableSchedule.tsx):
```typescript
// Before: Complex filtering based on layoutPreference
// After: Direct rendering of API data
const processedTasks = useMemo(() => {
  // Always render tasks as-is from the backend
  // This preserves the original layout structure (structured vs unstructured)
  // that was used when the schedule was first generated
  return tasks;
}, [tasks]);
```

**Result**: Each schedule now renders based on its original layout preference (structured vs unstructured) rather than current user preferences, and negative day navigation works correctly.
