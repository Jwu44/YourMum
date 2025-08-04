Status: To do

## Bug
I am facing a bug where directly going to /dashboard for a current day upon initial load only shows an empty schedule

## Pre conditions
- User has not created a schedule for the current day e.g. via next day schedule gen
- So user may have a schedule yesterday, but never generated a schedule for the current day
- Or a user may have a schedule from X days ago, but never generated a schedule for the current day

## Steps to reproduce:
1. Current date is 4th Aug and I visit /dashboard for the first time today
2. Load /dashboard
3. Bug: Sees empty schedule + empty inputs config 
3. land on /dashboard

## Expected behaviour: 
- Upon initial load for a current day, ensure empty schedule creation if today's schedule doesn't exist contains:
    - Inputs config based on last valid schedule's input config
        - If yes and sections exist, render those sections
        - Otherwise no sections exist
    - Recurring tasks on current date
    - google calendar events for the day


