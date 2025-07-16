# TASK-03: Implement create next day schedule
Status: To do

## Problem
When viewing the current day schedule, users don't have the ability to 

## Requirements
- in the dashboard header, left arrow "<" should be the button to allow users to view the existing schedule for the previous day
    - help me decide whether we should detect if a previous schedule exists before clicking "<" or after clicking "<"
- hovering the left arrow "<" for previous day should show tooltip "View previous day"
- clicking on left arrow "<" arrow should:
    - fetch previous day schedule 
    - load previous day schedule preserving all its details on the dashboard
- users can edit the previous day schedule which should update the schedule in the frontend and backend in mongodb
- ensure the right arrow ">" is enabled in this case so the user can click to view the next day up until the current day
- if user currently viewing today's schedule, do not implement generating the next day yet