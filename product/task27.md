Status: Partially Fixed - Red zone working, Green zone issue persists

## Bug
I am facing a bug where dragging a task into a parent's red zone causes outdent while dragging into a parent's green zone causes indentation in it's child task.

## Steps
1. Set up a parent child relationship e.g. Task A > Task B
2. Drag a Task C into parent Task A's red zone
    - ✅ FIXED: Now correctly shows reorder and positions as siblings
3. Drag a Task C into parent A's green zone (less than ~30% task width) shows indent which is correct as seen in @image2.png
4. Drag a Task C into parent A's green zone (beyond 30% task width)
    - ❌ STILL BROKEN: Shows indent under child Task B as seen in @image3.png

## Progress Made
### ✅ Fixed Issues:
1. **Red Zone Reorder Logic**: Fixed in `EditableSchedule.tsx` - now positions task after entire parent block
2. **Parent Detection String Conversion**: Added `String()` conversion for ID comparisons
3. **Zone Logic**: Corrected red zone to trigger `reorder` instead of `outdent`
4. **Legacy Code Cleanup**: Removed 30%/60% threshold variables

### ❌ Remaining Issue:
**Root Cause**: Parent detection logic still failing for green zone
- Console shows: `draggedTaskIsOverItsParent: false`, `targetTaskHasChildren: false`
- Should show: `draggedTaskIsOverItsParent: true`, `targetTaskHasChildren: true`

## Technical Analysis

### Files Modified:
1. `frontend/hooks/use-drag-drop-task.tsx` - Zone detection logic
2. `frontend/components/parts/EditableSchedule.tsx` - Reorder positioning logic

### Key Functions:
- `updateCursorPosition()` - Zone detection and parent relationship logic
- `moveTask()` - Task positioning on drag end

### Current Logic Flow:
```
Task C dragged over Task A (parent with children)
├── Extract targetTaskId from DOM ✅
├── Check targetTaskHasChildren ❌ (returns false, should be true)
├── Check draggedTaskIsOverItsParent ❌ (returns false, should be true)  
└── Falls back to "standard 2-zone" ❌ (should use parent-child logic)
```

### Debugging Evidence:
```javascript
// Console output when dragging Task C over Task A's green zone:
CONDITION ANALYSIS: {
  draggedTaskIsOverItsParent: false,  // ❌ Should be true
  targetTaskHasChildren: false,       // ❌ Should be true  
  targetLevel === 3: false,
  willExecute: "standard 2-zone"      // ❌ Should be parent-child logic
}
```

## Next Steps for Investigation:

### 1. Debug `targetTaskHasChildren` Detection
- **Issue**: `allTasks.some(t => String(t.parent_id) === String(targetTaskId))` returning false
- **Check**: Task relationship data structure, ID format consistency
- **Files**: `use-drag-drop-task.tsx:134-147`

### 2. Debug DOM Element Detection  
- **Issue**: `targetElement.getAttribute('data-sortable-id')` might not match task IDs
- **Check**: HTML data attributes vs task.id format
- **Files**: DOM inspection, task rendering components

### 3. Debug Task Array Context
- **Issue**: `allTasks` array might not contain current task relationships
- **Check**: Task array state management and updates
- **Files**: Parent component passing tasks to drag hooks

### 4. Alternative Approach
- **Consider**: Use collision detection from `use-drag-drop-provider.tsx` instead of DOM attributes
- **Files**: `frontend/hooks/use-drag-drop-provider.tsx:87-88`

## Expected behaviour
- Dragging Task C into Task A's red zone should trigger reorder ✅ FIXED
    - Upon release, Task C is positioned after Task A's block ✅ FIXED
    - E.g. (Task A > Task B) + Task C as siblings ✅ WORKING
- Dragging Task C into Task A's green zone should always trigger indentation under the parent A ❌ BROKEN
    - Upon release, Task C is indented under Task A as the first child ❌ BROKEN
    - E.g. Task A > (Task C + Task B) ❌ NOT WORKING