# TASK-04: Fix Bug
Status: To do

## Bug
After filling out inputs in @inputsconfig and i click "save config", i don't get a response from the new schedule generated in @schedule_gen.py.

### Steps to reproduce:
1. Click "Inputs" in left sidenavbar
2. Fill out fields in @inputsconfig
3. click "save config"
4. process loads...
5. taken to /dashboard
6. BUG: backend does not show response from generate_schedule and frontend does not show new schedule 

## Requirements
- Ensure we get the expected resonse from generate_schedule in @schedule_gen.py
- Ensure the new schedule is rendered on /dashboard e


## Resources
### Browser logs
Generating schedule with payload: 
{name: '', age: '', work_start_time: '09:00', work_end_time: '17:30', working_days: Array(5), …}
page.tsx:57 Setting currentDate: Fri Jun 27 2025 20:10:52 GMT+1000 (Australian Eastern Standard Time)
RouteGuard.tsx:33 RouteGuard State: 
{user: 'Dev User (dev@example.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
page.tsx:57 Setting currentDate: Fri Jun 27 2025 20:10:52 GMT+1000 (Australian Eastern Standard Time)
calendar.ts:122 
 GET http://localhost:8000/api/calendar/events?date=2025-06-27 404 (NOT FOUND)
helper.tsx:324 
 GET http://localhost:8000/api/schedules/2025-06-26 404 (NOT FOUND)
helper.tsx:324 
 GET http://localhost:8000/api/schedules/2025-06-26 404 (NOT FOUND)
calendar.ts:122 
 GET http://localhost:8000/api/calendar/events?date=2025-06-27 404 (NOT FOUND)
helper.tsx:324 
 GET http://localhost:8000/api/schedules/2025-06-26 404 (NOT FOUND)
EditableSchedule.tsx:194 ✅ Rendering optimized backend structure
EditableSchedule.tsx:194 ✅ Rendering optimized backend structure
EditableSchedule.tsx:194 ✅ Rendering optimized backend structure
﻿


Also why in the browser logs is it showing 404 not found error? Currently it is the 27th June so i'm not sure why it's fetching a schedule for 26th June and also for today the 27th June, a schedule already existss