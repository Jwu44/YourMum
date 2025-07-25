# TASK-11: Ability to navigate to custom date 
Status: To do

## Problem
Current left right arrow navigation may be slow. Users need the ability to quickly navigate to a certain date to view its schedule.

## Requirements
- in the dashboard header, clicking on the div containing the day and date shouls show a dropdown calendar 
- calendar should show list of available dates
    - available dates include all dates from when the user was created until their furthest created schedule
    - unavailable dates include dates before the user was created and dates for schedules that haven't been created in the future
- clicking on an available date should simply navigate the user to that schedule 

## Acceptance Criteria
### Scenario A: User navigates to previous date
- Today is currently 23rd July
- User was created on the 2nd of July
- User is able to click on all dates from 2nd July to 23rd July in the calendar to navigate to 

### Scenario B: User navigates to future existing date
- Today is currently 23rd July
- User was created on the 2nd of July
- User has created a schedule for the next day (24th July)
- User is able to click on the 24th July on the calendar and is navigated to that schedule

### Scenario C: User tries to navigate to a date before they were created
- Today is currently 23rd July
- User was created on the 2nd of July
- User has created a schedule for the next day (24th July)
- User should not be able to click on any dates before the 2nd of July
- User should not be able to click on any dates after 24th July