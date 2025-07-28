# TASK-19: Implement nested tasks via drag
Status: To do
## Problem
Users don't have the ability to drag tasks to be indented/outdented

## Requirements
- when dragging a task X under and slightly right (20px) from task Y, then show a purple horizontal bar with progressive opacity (purple with 2 opacities) to indicate zone for indentation
    - once user releases task in that zone, task is indented
    - task X is now a child of task Y
- when dragging a task X under and slightly left (20px) from task Y, then show purple horizontal bar (purple with 1 opacity) to indicate zone for outdentation
    - once user releases task in that zone, task is outdented
    - task X is now below task Y positonally (no parent-child)