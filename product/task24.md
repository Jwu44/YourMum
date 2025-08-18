# Bug #1 - Status: Done ✅
I am facing a bug where the autogenerate() function is showing completed tasks from recently sourced schedule

# Steps to reproduce:
1. as a signed in user, go to /dashboard for the first time today
2. autogenerate() is called
3. bug: observe completed tasks from recent schedule being shown 

# Expected behaviour:
- autogenerate should filter out completed tasks from recently sourced schedule
- autogenerate should show incomplete google calendar and manual and slack tasks from recent schedule, and tasks recurring on the provided date (today or next day)

# Current Autogenerate response:
{"created":true,"date":"2025-08-15","existed":false,"metadata":{"calendarEvents":1,"generatedAt":"2025-08-15T02:01:47.645588+00:00","lastModified":"2025-08-15T02:01:47.645604+00:00","recurringTasks":6,"source":"manual","totalTasks":10},"schedule":[{"categories":[],"completed":false,"end_time":"10:20","from_gcal":true,"gcal_event_id":"_6os3ioj66hj3ccph68r68p9h6lgm6c1m60p34e1b6kpj0db665ij0opi6hi6adhl6pim2dj181kmstj9ehiisoridtn6upjp5phmur8","id":"_6os3ioj66hj3ccph68r68p9h6lgm6c1m60p34e1b6kpj0db665ij0opi6hi6adhl6pim2dj181kmstj9ehiisoridtn6upjp5phmur8","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-15","start_time":"10:00","text":"Interview at Driva","type":"task"},{"categories":[],"completed":true,"end_time":"","id":"ea224912-5dec-4694-a830-c33bb123645f","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":1,"start_date":"2025-08-13","start_time":"","text":"gym","type":"task"},{"categories":[],"completed":true,"end_time":"","id":"71a81c4e-3538-413d-bb1c-f06208f2e3ef","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-13","start_time":"","text":"read fountainhead","type":"task"},{"categories":[],"completed":true,"end_time":"","id":"3ff7b881-3a73-4770-a1e6-24aa2b86c361","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-13","start_time":"","text":"manual task A","type":"task"},{"categories":[],"completed":true,"end_time":"","id":"21e53aad-44a7-4497-a677-01966a633a57","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":1,"start_date":"2025-08-14","start_time":"","text":"gym","type":"task"},{"categories":[],"completed":true,"end_time":"","id":"d98b49c4-ce8c-42f4-8a90-d7cd5b6569f1","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-14","start_time":"","text":"read fountainhead","type":"task"},{"categories":[],"completed":true,"end_time":"","id":"93dbd00f-a0cb-4057-bc90-3c49a027ae89","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-14","start_time":"","text":"manual task A","type":"task"},{"categories":[],"completed":true,"id":"8c74ef64-6025-43f8-84c4-7a0704f64923","is_microstep":false,"is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"slack_metadata":{"channel_id":"C099GE54JA2","channel_name":"Unknown Channel","deep_link":"slack://channel?team=T099GE4RBE2&id=C099GE54JA2&message=1755160112.669789","event_ts":"1755160112.669789","message_url":"https://yourmum.slack.com/archives/C099GE54JA2/p1755160112669789","original_text":"<@U099GE4SF8W> book haircut","sender_id":"U099GE4SF8W","sender_name":"Unknown User","thread_ts":null,"workspace_id":"T099GE4RBE2","workspace_name":"YourMum"},"source":"slack","start_date":null,"text":"book haircut","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"1ae7a499-ccf1-4d24-8079-ce4645f690c5","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":1,"start_date":"2025-08-15","start_time":"","text":"gym","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"c816482b-c093-4aa0-af21-8d51066f7fff","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-15","start_time":"","text":"read fountainhead","type":"task"}],"sourceFound":true,"success":true}


# Bug #2 - Status: Done ✅
I am facing a bug where the autogenerate() function is not carrying over incomplete synced google calendar events from recently soruced schedule

# Steps to reproduce:
1. as a signed in user, go to /dashboard for the first time today
2. autogenerate() is called
3. bug: observe incomplete synced google calendar events not showing on today's schedule
4. click right chevron arrow
5. bug: observe incomplete synced google calendar events from today not showing on tomorrow's schedule

# Expected behaviour:
- autogenerate should carry over incomplete synced google calendar events for today and tomorrow
- autogenerate should show incomplete google calendar and manual and slack tasks from recent schedule, and tasks recurring on the provided date (today or next day)

# Bug #3 - Status: Done ✅
I am facing a bug where the autogenerate() function is duplicating incomplete recurring tasks when generating the next day schedule

# Steps to reproduce:
1. as a signed in user, go to /dashboard for the first time today
2. autogenerate() is called
3. see generated schedule for today
4. click right chevron arrow
5. bug: observe incomplete task recurring on the next day being duplicated

# Expected behaviour:
- autogenerate should not duplicate recurring tasks if they were incomplete when generating next day schedule

# Current autogenerate response:
{"created":true,"date":"2025-08-16","existed":false,"metadata":{"calendarEvents":4,"generatedAt":"2025-08-15T02:31:06.648219+00:00","lastModified":"2025-08-15T02:31:06.648239+00:00","recurringTasks":3,"source":"manual","totalTasks":7},"schedule":[{"categories":[],"completed":false,"end_time":"11:00","from_gcal":true,"gcal_event_id":"6asjk4j70u0idrh1557i0idu2g_20250815T220000Z","id":"6asjk4j70u0idrh1557i0idu2g_20250815T220000Z","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-16","start_time":"08:00","text":"\ud83c\udfc3\u200d\u2642\ufe0fParkrun","type":"task"},{"categories":[],"completed":false,"end_time":"15:00","from_gcal":true,"gcal_event_id":"2qmm0chdup5aaku0vp8h4ktjj8_20250816T033000Z","id":"2qmm0chdup5aaku0vp8h4ktjj8_20250816T033000Z","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-16","start_time":"13:30","text":"\ud83c\udfcb\ufe0fgym push v2","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"31a982e6-a2bb-481e-81b8-e65f55fd213f","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-15","start_time":"","text":"read fountainhead","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"90aeeee8-7af2-4232-9483-bd559162ebaa","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":1,"start_date":"2025-08-16","start_time":"","text":"gym","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"e4eabab0-f1da-4e6c-84aa-ee42244f5aa9","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-16","start_time":"","text":"read fountainhead","type":"task"},{"categories":[],"completed":false,"end_time":"18:30","from_gcal":true,"gcal_event_id":"2oaa6k1uhi8fk1uqr2gka01t2h","id":"1545f484-33bb-4980-80ae-aff276435482","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-16","start_time":"17:30","text":"haircut","type":"task"},{"categories":[],"completed":false,"end_time":"19:00","from_gcal":true,"gcal_event_id":"4b02qocptl3cotqe8lvfnbi9d4","id":"6708d0e4-b555-405d-901c-a90eb4dbc761","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-16","start_time":"18:00","text":"fix sim card","type":"task"}],"sourceFound":true,"success":true}

# Bug #4 - Status: Done ✅
I am facing a bug where the event_bus for handling google calendar events is inconsistent.

# Steps to reproduce:
1. as a signed in user, go to /dashboard for the first time today
2. autogenerate() is called
3. see generated schedule for today
4. go to google calendar and add a new event "Task X"
5. bug: "Task X" does not render in real time unless i refresh the page
6. go to @inputsconfig and click "Save" to generate a schedule with sections
7. go to google calendar and add a new event "Task Y"
8. "Task X" and "Task Y" now appear at the top of the list but also mvoed the position of all today's synced google calendar task

# Expected behaviour:
- syncing of google calendar events for today should be real time regardless of whether list has sections or not
- should not have to manually refresh/reload the page to see synced tasks
- for any synced google calendar tasks for today, preserve their most recent positon in the list so they are not grouped together with the calendar event added in real time

# Fix Summary:
**Root Cause**: Two architectural issues - (1) conflated responsibilities in calendar sync methods causing wrong webhook path usage, and (2) faulty position preservation logic that grouped all calendar events together when new events were added.

**Solution**: 
1. **Architectural Separation**: Implemented Single Responsibility Principle by refactoring `create_schedule_from_calendar_sync` to handle only initial schedule creation, delegating to `apply_calendar_webhook_update` for existing schedule updates
2. **Position Preservation Fix**: Rewrote `_rebuild_tasks_preserving_calendar_positions` logic to insert new calendar events at top while preserving existing event positions (no more unwanted grouping)

**Key Changes**:
- `schedule_service.py:165-240`: Simplified calendar sync method with existence check and delegation pattern
- `schedule_service.py:1450-1543`: Fixed position preservation to use "preserve existing positions, insert new at top" strategy instead of "insert after last calendar event" which caused grouping
- Enhanced section-aware insertion with intelligent section inheritance

**Result**: ✅ Real-time sync works, ✅ existing calendar events maintain positions, ✅ new events appear at top with proper section context

# Bug #5 - ✅ Done 
I am facing a bug where the autogenerate() function is duplicating incomplete tasks when generating the next day schedule

# Steps to reproduce:
1. as a signed in user, go to /dashboard for the first time today
2. autogenerate() is called
3. see generated schedule for today
4. click right chevron arrow
5. bug: observe incomplete tasks being duplicated

# Expected behaviour:
- autogenerate should not duplicate incomplete tasks when generating next day schedule

# Current autogenerate response for creating next day:
https://yourdai-production.up.railway.app/api/schedules/autogenerate - {"created":true,"date":"2025-08-16","existed":false,"metadata":{"calendarEvents":2,"generatedAt":"2025-08-15T04:44:05.799763+00:00","lastModified":"2025-08-15T04:44:05.799786+00:00","recurringTasks":2,"source":"manual","totalTasks":12},"schedule":[{"categories":[],"completed":false,"id":"20adde01-4b2c-4028-a026-18d8798ff5b8","is_section":true,"level":0,"parent_id":null,"section":null,"section_index":0,"text":"High Priority","type":"section"},{"categories":[],"completed":false,"end_time":"11:00","from_gcal":true,"gcal_event_id":"6asjk4j70u0idrh1557i0idu2g_20250815T220000Z","id":"6asjk4j70u0idrh1557i0idu2g_20250815T220000Z","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":"High Priority","section_index":0,"start_date":"2025-08-16","start_time":"08:00","text":"\ud83c\udfc3\u200d\u2642\ufe0fParkrun","type":"task"},{"categories":[],"completed":false,"end_time":"15:00","from_gcal":true,"gcal_event_id":"2qmm0chdup5aaku0vp8h4ktjj8_20250816T033000Z","id":"2qmm0chdup5aaku0vp8h4ktjj8_20250816T033000Z","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":"High Priority","section_index":0,"start_date":"2025-08-16","start_time":"13:30","text":"\ud83c\udfcb\ufe0fgym push v2","type":"task"},{"categories":["Fun"],"completed":false,"id":"6f617be0-fbd3-4ec4-b911-40c3dbb27fd9","is_section":false,"level":0,"parent_id":null,"section":"High Priority","section_index":2,"text":"read fountainhead","type":"task"},{"categories":[],"completed":false,"id":"0e5c94d1-36ac-4472-8187-d22a389b2e8e","is_section":true,"level":0,"parent_id":null,"section":null,"section_index":0,"text":"Medium Priority","type":"section"},{"categories":["Fun"],"completed":false,"id":"2oaa6k1uhi8fk1uqr2gka01t2h","is_section":false,"level":0,"parent_id":null,"section":"Medium Priority","section_index":1,"text":"haircut","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"48e435f4-fbd6-4990-983e-53672f34d0e7","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":"Medium Priority","section_index":3,"start_date":"2025-08-15","start_time":"","text":"implement rag","type":"task"},{"categories":[],"completed":false,"id":"6b811f22-1806-4694-9e39-f2f887d50caa","is_section":true,"level":0,"parent_id":null,"section":null,"section_index":0,"text":"Low Priority","type":"section"},{"categories":["Fun"],"completed":false,"id":"fdef5ed4-f3d2-4350-a532-e9279be051c1","is_section":false,"level":0,"parent_id":null,"section":"Low Priority","section_index":2,"text":"fix sim card","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"eb5526b6-33aa-4e7c-9541-b035b63f8157","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":1,"start_date":"2025-08-16","start_time":"","text":"gym","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"2205b8f7-fa46-410b-8321-70832acaa407","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-16","start_time":"","text":"read fountainhead","type":"task"},{"categories":["Fun"],"completed":false,"id":"33f21585-7b57-4714-9fa7-e7b236354527","is_section":false,"level":0,"parent_id":null,"section":"High Priority","section_index":2,"start_date":"2025-08-16","text":"read fountainhead","type":"task"},{"categories":["Fun"],"completed":false,"id":"73099313-7eb4-469b-aacb-734906df5bb0","is_section":false,"level":0,"parent_id":null,"section":"Medium Priority","section_index":1,"start_date":"2025-08-16","text":"haircut","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"1ef18d12-55bc-471a-9b40-c76f7276084b","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":"Medium Priority","section_index":3,"start_date":"2025-08-16","start_time":"","text":"implement rag","type":"task"},{"categories":["Fun"],"completed":false,"id":"09d9f9c2-ea13-44a4-addd-d1e4a4bbe013","is_section":false,"level":0,"parent_id":null,"section":"Low Priority","section_index":2,"start_date":"2025-08-16","text":"fix sim card","type":"task"}],"sourceFound":true,"success":true}

# Bug #6 - To do
I am facing a bug where the event_bus is not syncing newly added calendar events

# Steps to reproduce:
1. as a signed in user, go to /dashboard for the first time today
2. autogenerate() is called
3. see generated schedule for today
4. go to google calendar and add a new all day event "Task X"
5. bug: "Task X" does not render on today's schedule, instead it gets added to the previous day schedule
6. go to google calendar and add a new timed event "Task Y" from 9am-10am
7. bug: "Task Y" does not render on today's schedule, even after page refresh 

# Expected behaviour:
- syncing of google calendar events for today should be real time regardless if it is an all day or timed event
- should not have to manually refresh/reload the page to see synced tasks
- for any synced google calendar tasks for today, preserve their most recent positon in the list so they are not grouped together with the calendar event added in real time