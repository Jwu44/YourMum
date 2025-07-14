# TASK-02: Implement "Edit" task flow
Status: To do

## Context
Users need the ability to edit existing tasks as their details may need updating  

## Requirements
- right aligned on an EditableScheduleRow, display an ellipses button
- clicking the ellipses button should reveal a dropdownmenu containing an option called "Edit"
    - this dropdown option should have an edit Pencil icon next to the text "Edit"
- clicking on the "Edit" button should reveal the TaskEditDrawer
- user can update changes in the fields contained in TaskEditDrawer
- when user clicks CTA: Save, all changes to that task should be stored and synced 
    - on the frontend, user can see visible changes (e.g. if name was changed)
    - on the backend, if i check mongodb, the specific task object should've been updated for today's schedule
- ensure task object always follows the task schema in @task.py