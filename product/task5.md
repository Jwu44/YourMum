# TASK-05: Fix Bug
Status: To do

## Bug
Whenever the /dashborad page loads, in the console logs I see it tries to fetch today's schedule twice via  Both fetches fail. Despite this, the schedule for the current day is able to be fetched successfully and rendered

### Steps to reproduce:
1. Go to /dashboard for any given day
2. Bug: observe multiple 404 errors when fetching today and yesterday's schedule

## Requirements