# TASK-04: Debug view previous day schedules 
Status: To do
## Bug
I am facing a bug where at first, navigating to a previous schedule (whether structured or unstructured) does not render when loading to that date initially.

## Steps to reproduce:
1. Let's say I start by viewing today's schedule on July 16th
2. Click left arrow to go to July 15th
3. Bug: I see empty state: No schedule found for selected date
4. Click left arrow to go to July 14th
5. CLick right arrow to go back to July 15th and now the schedule appears

## Expected behaviour: Given a schedule exists for any date, whether it has a structured or unstructured format, always render it at first

# Previous Bug - now resolved ✅
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
