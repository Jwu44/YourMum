# TASK-20: Implement ability to 'archive' tasks
Status: To do
## Problem
There are tasks that are irrelevant to user's current day but shouldn't be deleted. Users should have the ability to archive these completed/incomplete tasks to be added in the future.

## Requirements
- clicking on the 3 dot icon should show a new option called "Archive" in between "Edit" and "Delete"
- "Archive" option should have the Archive icon in the dropdown menu
- Clicking on "Archive" will move the selected task to the "Archive" page
- users can access the "Archive" page by clicking on the "Archive button in @AppSidebar
- "Archive" page contains a list of all tasks archived chronologically as an unstructured list 
- if "Archive" page is empty, show empty state explaining what the page is
- these tasks should preserve the same functionality as on dashboard
- but clicking on the 3 dot for an archived task should show "Edit, "Move to today" and "Delete" 
- clicking on "Move to today" should move the archived task to today's schedule
- create a mongodb collection called "Archive" which stores all the archived list of tasks for each user 
