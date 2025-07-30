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
    - left 30% zone should trigger indent under Task A. Exactly the same logic as the above parent scenario
    - right 70% zone should trigger indent under Task B. So now there are 3 levels e.g. Task A > Task B > Task C

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
  - **Child tasks**: 30% zone → `indent_to_parent_level`, 70% zone → `indent_to_child_level`
  - **Regular tasks**: Preserved existing 2-zone behavior

#### 2. Component Integration (`/frontend/components/parts/EditableScheduleRow.tsx`)
- **Updated props destructuring**: Added `allTasks` parameter
- **Updated hook call**: Passed `allTasks` to `useDragDropTask` hook

### Results
- ✅ **Fixed**: Dragging into parent Task A zone always triggers indent across entire zone
- ✅ **Fixed**: Child Task B zones work with proper 30%/70% context-aware split
- ✅ **Preserved**: All existing drag-drop functionality and visual indicators
- ✅ **Tested**: All TreeStructureIntegration tests pass (21/21)

### Technical Details
- **Parent Detection**: Uses `allTasks.some(t => t.parent_id === task.id)` to identify parent tasks
- **Progressive Opacity**: Existing purple line indicators automatically show correct feedback
- **Backward Compatibility**: No breaking changes to existing drag-drop behavior

---

## Bug 2: To do
I am facing a bug where I am unable to indent additional tasks into a current parent-child block

## Steps to reproduce:
1. Have an existing parent-child block e.g. Task A > Task B
2. Drag a Task C into the parent-child block, more specifically, into Task A's zone
3. Bug: Releasing Task C at any point in Task A's zone triggers a reorder

## Expected behaviour: When a parent-child block exists and I drag an external Task C, then dragging into:
- parent Task A: purple line should trigger indent across the whole zone, no reorder. so Task C is indented under Task A and above task B. e.g. Task A > Task C + Task B
- child Task B:
    - left 30% zone should trigger indent under Task A. Exactly the same logic as the above parent scenario
    - right 70% zone should trigger indent under Task B. So now there are 3 levels e.g. Task A > Task B > Task C