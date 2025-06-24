# TASK-04: Fix Bug
Status: To do

## Bug
I am unable to manually add a task to an empty schedule

### Steps to reproduce:
1. Arrive on /dashboard with an empty schedule for the current date
2. Click + FAB
3. Create a task
4. Bug: Task is created and displayed in dashboard frontend with the errors in resources section. Because it's not created and stored in the backend, upon page refresh, the task is gone

## Requirements
- Ensure user is able to manually add tasks to an existing schedule whether empty or not 
- Manually adding tasks should update the existing schedule for the day
- Analyse the below resoruces for further context

## Resources
### Browser logs
Creating new schedule: {"date":"2025-06-23T00:00:00","tasks":[{"id":"2b596524-8b7b-4fb1-9083-1fc2db1f6d6c","text":"check slack","categories":["Work"],"is_subtask":false,"completed":false,"is_section":false,"section":null,"parent_id":null,"level":0,"section_index":0,"type":"task","is_recurring":null,"start_date":"2025-06-23","start_time":"","end_time":""}],"userId":"default","inputs":{"name":"User","work_start_time":"09:00","work_end_time":"17:00"},"schedule":[{"id":"2b596524-8b7b-4fb1-9083-1fc2db1f6d6c","text":"check slack","categories":["Work"],"is_subtask":false,"completed":false,"is_section":false,"section":null,"parent_id":null,"level":0,"section_index":0,"type":"task","is_recurring":null,"start_date":"2025-06-23","start_time":"","end_time":""}],"metadata":{"createdAt":"2025-06-23T09:56:02.226Z","lastModified":"2025-06-23T09:56:02.226Z"}}
:8000/api/schedules:1 
            
            
           Failed to load resource: the server responded with a status of 409 (CONFLICT)
app-index.js:33 Failed to create schedule: {"error":"Schedule already exists for this date"}

window.console.error @ app-index.js:33
app-index.js:33 Error updating schedule: Error: Failed to create new schedule: {"error":"Schedule already exists for this date"}

    at updateSchedule (ScheduleHelper.tsx:163:15)
    at async eval (page.tsx:103:9)
window.console.error @ app-index.js:33

### Schedule object in mongodb
{"_id":{"$oid":"6858884a6597178d31c6dff0"},"userId":"Si3NryNNjSMbW8q1t0niKX8sYng1","date":"2025-06-23T00:00:00","schedule":[],"inputs":{"name":"","work_start_time":"","work_end_time":"","working_days":[],"energy_patterns":[],"priorities":{},"layout_preference":{},"tasks":[]},"metadata":{"created_at":"2025-06-22T22:48:42.876806+00:00","last_modified":"2025-06-22T22:48:42.876825+00:00","source":"manual"}}

### Backend logs
127.0.0.1 - - [23/Jun/2025 19:53:14] "GET /api/calendar/events?date=2025-06-23 HTTP/1.1" 500 -
127.0.0.1 - - [23/Jun/2025 19:53:14] "GET /api/schedules/range?start_date=2025-06-22&end_date=2025-06-22 HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:53:14] "GET /api/schedules/range?start_date=2025-06-22&end_date=2025-06-22 HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:53:14] "GET /api/schedules/range?start_date=2025-06-22&end_date=2025-06-22 HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:53:14] "GET /api/schedules/2025-06-23 HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:53:15] "GET /api/schedules/2025-06-23 HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:56:00] "OPTIONS /api/categorize_task HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:56:02] "POST /api/categorize_task HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:56:02] "OPTIONS /api/schedules/2025-06-23 HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:56:02] "GET /api/schedules/2025-06-23 HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:56:02] "OPTIONS /api/schedules HTTP/1.1" 200 -
127.0.0.1 - - [23/Jun/2025 19:56:02] "POST /api/schedules HTTP/1.1" 409 -