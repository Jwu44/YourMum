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

# Bug #3 - Status: To do
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


