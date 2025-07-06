# TASK-05: Deprecate "Edit" task flow
Status: To do

## Problem
Currently the "Edit" task flow looks overly complicated and engineered. This is causing a bug where after editing a task, the whole dashboard becomes unclickable. Instead of trying to fix the bug, I would like to deprecate the whole "Edit" task flow 

## Requirements
- Map out the current flow for editing a task which starts from clicking the ellipses on an EditableScheduleRow > Edit > Fill in details in TaskEditDrawer > Save
- Then, deprecate all functions for editing a task for this flow
- Fix up affected folders where the deprecation occurred