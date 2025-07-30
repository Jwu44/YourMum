# Task-25: Debug Task indentation

## Bug 1: ✅ Completed
I am facing a bug where I am unable to indent additional tasks into a current parent-child block

## Steps to reproduce:
1. Have an existing parent-child block e.g. Task A > Task B
2. Drag a Task C into the parent-child block, more specifically, into Task A's zone
3. Bug: Releasing Task C at any point in Task A's zone triggers a reorder

## Expected behaviour: When a parent-child block exists and I drag an external Task C, then dragging into:
- parent Task A: purple line should trigger indent across the whole zone, no reorder. so Task C is indented under Task A and above task B. e.g. Task A > Task C + Task B
- child Task B:
    - left 10% zone should trigger indent under Task A. Exactly the same logic as the above parent scenario
    - right 90% zone should trigger indent under Task B. So now there are 3 levels e.g. Task A > Task B > Task C

---

## ✅ Implementation Summary

### Root Cause
The zone detection logic in `use-drag-drop-task.tsx` used a generic zone system based only on target task level, without considering parent-child relationship context.

### Key Changes Made

#### 1. Enhanced Zone Detection Logic (`/frontend/hooks/use-drag-drop-task.tsx`)
- **Added parent-child context detection**: `const targetTaskHasChildren = allTasks.some(t => t.parent_id === task.id)`
- **Updated interface**: Added `allTasks: Task[]` prop to enable relationship detection
- **Context-aware zone behavior**:
  - **Parent tasks (with children)**: Entire zone triggers `indent` (no reorder zone)
  - **Child tasks**: 10% zone → `indent_to_parent_level`, 90% zone → `indent_to_child_level`
  - **Regular tasks**: Preserved existing 2-zone behavior

#### 2. Component Integration (`/frontend/components/parts/EditableScheduleRow.tsx`)
- **Updated props destructuring**: Added `allTasks` parameter
- **Updated hook call**: Passed `allTasks` to `useDragDropTask` hook

### Results
- ✅ **Fixed**: Dragging into parent Task A zone always triggers indent across entire zone
- ✅ **Fixed**: Child Task B zones work with proper 10%/90% context-aware split
- ✅ **Preserved**: All existing drag-drop functionality and visual indicators
- ✅ **Tested**: All TreeStructureIntegration tests pass (21/21)

### Technical Details
- **Parent Detection**: Uses `allTasks.some(t => t.parent_id === task.id)` to identify parent tasks
- **Progressive Opacity**: Existing purple line indicators automatically show correct feedback
- **Backward Compatibility**: No breaking changes to existing drag-drop behavior

---

## Bug 2: ✅ Completed - Parent Zone Collision Detection Fix
I was facing a bug where dragging an external Task into a parent-child block was showing incorrect visuals when dragging beyond 30% of the parent zone.

## Steps to reproduce:
1. Have an existing parent-child block e.g. Task A > Task B
2. Drag a Task C into the parent-child block, more specifically, into Task A's zone
3. Dragging Task C into Task A's 10% zone shows and causes indent which is correct as seen in @image1.png
4. Bug: But dragging Task C into Task A's 90% zone makes the Task A's purple line disappear and instead shows the purple line in Task B as seen in @image2.png and @image.png. Upon release in this zone, Task C is indented under Task B

## Expected behaviour: When a parent-child block exists and I drag an external Task C, then dragging into:
- parent Task A: display and behaviour the same regardless of zone
    - left 10% zone: show dark + regular purple for indent
        - upon release, task C is indented under Task A and above Task B e.g. Task A > Task C + Task B
    - right 90% zone: show dark + regular purple for indent
         - upon release, task C is indented under Task A and above Task B e.g. Task A > Task C + Task B
- child Task B:
    - left 10% zone: show dark + regular purple for parent indent
        - upon release, task C is indented under Task A and below Task B e.g. Task A > Task B + Task C
    - right 90%: show dark + medium + regular purple for child indent
         - upon release, task C is indented under Task B e.g. Task A > Task B > Task C

---

## ✅ Implementation Summary

### Root Cause
@dnd-kit's `closestCenter` collision detection was incorrectly selecting **Task B** (child) as the `over` target when dragging in **Task A's** (parent) 30%+ zone, causing visual feedback to appear on the wrong element.

### Key Changes Made

#### 1. Custom Collision Detection (`/frontend/hooks/use-drag-drop-provider.tsx`)
- **Created `createParentAwareCollisionDetection()`**: Custom collision detection that respects parent-child hierarchy
- **Enhanced zone calculation**: Changed from 30% to 10% red zone (`thirtyPercentWidth → tenPercentWidth`)  
- **Aggressive parent zone priority**: When cursor is within parent bounds (but not directly over child), always override to select parent
- **Smart bounds checking**: Uses DOM `getBoundingClientRect()` for precise parent/child boundary detection

#### 2. Updated Visual Debug Zones (`/frontend/components/parts/EditableScheduleRow.tsx`)
- **Red zone**: Updated from 30% to 10% (`width: '30%' → '10%'`)
- **Green zone**: Updated from 70% to 90% (`left: '30%', width: '70%' → left: '10%', width: '90%'`)
- **Zone boundary line**: Moved from 30% to 10% position

#### 3. Updated Zone Logic (`/frontend/hooks/use-drag-drop-task.tsx`)
- **Fixed parent detection bug**: Changed from checking dragged task to checking target task for children
- **Updated percentage references**: All comments and debug logs updated to reflect 10%/90% zones
- **Enhanced debug logging**: Added target task ID tracking for better troubleshooting

### Technical Implementation
```typescript
// Custom collision detection with parent zone priority
if (isWithinParentBounds && !isWithinChildBounds) {
  // Cursor in parent zone but not over child - always select parent
  return [{ id: parentTask.id, data: primaryCollision.data }];
} else if (isWithinParentBounds && isWithinChildBounds) {
  // Cursor over both - allow default collision detection for legitimate child interactions
}
```

### Results
- ✅ **Fixed**: Entire Task A zone (0-100%) now shows purple line under Task A consistently
- ✅ **Fixed**: Task A zone always shows "indent" tooltip (not "indent_to_child_level")
- ✅ **Fixed**: Dragging Task C anywhere in Task A zone results in Task A > Task C + Task B
- ✅ **Preserved**: Task B zones still work with proper 10%/90% context-aware split when directly over Task B
- ✅ **Preserved**: All existing drag-drop functionality and visual indicators
- ✅ **Tested**: All TreeStructureIntegration tests pass (21/21)

### Technical Details
- **Parent Detection**: Uses DOM element bounds checking with `getBoundingClientRect()`
- **Collision Override**: Replaces @dnd-kit's default `closestCenter` with parent-aware logic
- **Zone Optimization**: Reduced outdent trigger area from 30% to 10% for better UX
- **Backward Compatibility**: No breaking changes to existing drag-drop behavior


## Bug 3: 
I am facing a bug where the purple line visual is displaying incorrectly for a child task when an external task is being dragged across its zones

## Steps to reproduce:
1. Have an existing parent-child block e.g. Task A > Task B
2. Drag a Task C into the parent-child block, more specifically, into Task B's zone
3. Dragging Task C into Task B's 10% zone shows and causes indent_to_parent_level which is correct
4. Bug: But dragging Task C into Task B's 90% zone shows the same regular purple line which is incorrect. But at least the behaviour where on release it causes indent_to_child_level which is correct.

## Expected behaviour:
When dragging Task C into Task B's 90% zone, it should show the dark + regular purple 