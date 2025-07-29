# TASK-23: Fix task dragging and indenting behaviour
Status: In Progress 

## Current behaviour
- Let's say there are 2 tasks: X and Y on level 1 in that respective order
- If I want to indent task Y under task X, currently I would select task Y using the vertical grip icon and hover under and slightly right (30px) of task X to try and indent.
- However, this does not indent task Y under task X. In fact, the position of both tasks remain the same as original.
- Also when hovering task Y under and slightly right of task X, the purple horizontal bar shows under task Y when it should show under task X

## Expected behaviour
- when selecting a task using the vertical grip icon and hover under and slightly right of ANY target task:
    - the purple horizontal bar should show under the the target task and NOT the selected task
    - upon release, the selected task should be indented under the target task
- to outdent, the user would select the target indented task using the vertical grip and hover under and slightly left of the parent task:
    - the purple horizontal bar should show under the the parent task and NOT the selected task
    - upon release, the selected task should be outdented so there's no more parent-child relationship and these 2 tasks sit on the same level
- refer to the @image.png on how Notion displays a blue horizontal bar with the first ~10% segmented in a darker blue to indicate indent while the rest 90% is normal blue

## Requirements Clarifications:
- Max indentation level: 3
- Indentation sensitivity: 20px threshold
- Only regular tasks can be drop targets (not sections)
- Use purple bars with progressive opacity (not blue like Notion)
- Invalid operations should be silently prevented
- Tasks should maintain parent-child relationships with proper level/parent_id/is_subtask properties
- Clarifying UX:
    1. On hover, show a drag handle on blocks.
    2. Enable dragging of blocks, with visual feedback via the purple line showing possible insert positions.
    3. When dropped, adjust the row's parent-child relationships in the scgedyke tree to move/reorder it.
    4. Indent action changes the structure by moving the row into the preceding task content array if valid.
    5. Visual UI reflects the updated hierarchy with indentation and nesting.

## Progress Update:
### ✅ Completed:
- Purple indicator now shows under target task (not dragged task)
- Tasks no longer shuffle positions during drag operations
- Notion-style segmented purple bar implemented (10% darker left segment for indent)
- Progressive opacity: indent (90%+75%), outdent (80%), reorder (60%)
- Cursor position detection from target task content left edge
- 20px threshold detection for indent/outdent operations
- Max indentation level 3 enforcement

### 🔄 Remaining Issue:
- **Indentation functionality**: While visual feedback works correctly, the actual indentation/outdentation behavior on drop still needs debugging. Tasks are being repositioned but not properly indented with parent-child relationships.


