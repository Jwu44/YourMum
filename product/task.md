[ ] Debug this error when I submit the formdata for schedule generation: "203-c696639c29fea4e1.js:1 No valid schedule found in the response.
h @ 203-c696639c29fea4e1.js:1
(anonymous) @ page-602f5d0e4d3eb1fa.js:1
await in (anonymous)
a_ @ fd9d1056-4eaa1cb44a8df49f.js:1
aR @ fd9d1056-4eaa1cb44a8df49f.js:1
(anonymous) @ fd9d1056-4eaa1cb44a8df49f.js:1
sF @ fd9d1056-4eaa1cb44a8df49f.js:1
sM @ fd9d1056-4eaa1cb44a8df49f.js:1
(anonymous) @ fd9d1056-4eaa1cb44a8df49f.js:1
o4 @ fd9d1056-4eaa1cb44a8df49f.js:1
iV @ fd9d1056-4eaa1cb44a8df49f.js:1
sU @ fd9d1056-4eaa1cb44a8df49f.js:1
uR @ fd9d1056-4eaa1cb44a8df49f.js:1
uM @ fd9d1056-4eaa1cb44a8df49f.js:1
23-e90de6ae16e42b99.js:1 Error submitting form: Error: Invalid response from server"

Steps to replicate:
1. Click "get started" on home page
2. Go through google sso flow
3. After successful sign go through the onboarding flow
4. Bug: user clicks "generate schedule" button on /timebox-preference

Expected outcome: 
- formdata is passed to generate_schedule 
- schedule is generated and stored in db

Notes:
Output log:
"Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImJjNDAxN2U3MGE4MWM5NTMxY2YxYjY4MjY4M2Q5OThlNGY1NTg5MTkiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDE0OTA3NDYsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0MTQ5MDc0NiwiZXhwIjoxNzQxNDk0MzQ2LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.l7rRIzH3_p_ad6D_qj7G1UJqVZ4EKg21EYSuAgawDj9k82xwzj3sHQTn2986xUHKM3GlnrBoFHmZZmoJbMSFKaN9UUoRf8XJnjTIDrG5i5LpxhfSs4I4-zSO_sULsKc43qN3z4lF-rZ_oxmm-aiNNSvwALYupNuJ5hqfaMGMRGfDaiV2QLkchCMegYm_lhhxGtd9mJ2DHLTcGkYPHy-lgRbknFDZWKJevoUR5OlgUxeW9W2I2mKy2iG64krex-atOBs8XIOeRQ-z7Nr0IrAcZz63WTMO_j9pUHva-PGHVvg8MhCp9-HrsFvDZJdA4Kn3mjgqC2G3XFxwyXYL77Fl9A
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Sec-Ch-Ua: "Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Content-Type: application/json
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Sec-Ch-Ua-Mobile: ?1
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Accept: */*
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Sec-Gpc: 1
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Accept-Language: en-GB,en;q=0.7
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Origin: https://yourdai.app
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Sec-Fetch-Site: cross-site
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Sec-Fetch-Mode: cors
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Sec-Fetch-Dest: empty
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Referer: https://yourdai.app/
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Accept-Encoding: gzip, deflate, br, zstd
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Priority: u=1, i
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: #015
Mar  9 03:40:09 ip-172-31-8-227 web[42098]: Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': False}
Mar  9 03:53:48 ip-172-31-8-227 web[42098]: User data received for user : [2025-03-09 03:53:48 +0000] [42098] [INFO] Worker exiting (pid: 42098)
Mar  9 03:53:48 ip-172-31-8-227 web[42098]: {'name': '', 'age': '', 'work_start_time': '10:00 AM', 'work_end_time': '5:00 PM', 'tasks': [{'id': 'eae0f678-c891-4057-a264-cb998378710d', 'text': 'milky time', 'categories': ['Relationships'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 0, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '9acfcb3a-2774-466b-a5f8-d7f53ac5ba7f', 'text': 'gymies', 'categories': ['Exercise'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 1, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': 'f24b9dac-f484-4b7c-8d23-27c19b5021b6', 'text': '1:1 with ed', 'categories': ['Relationships', 'Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 2, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '75adfb4c-95c2-4af3-9229-57788aeb1c6e', 'text': 'post product reprot', 'categories': ['Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 3, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '3d3e2ebd-d2f6-4970-9f14-26d4840e63cd', 'text': 'write prd', 'categories': ['Ambition', 'Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 4, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}], 'energy_patterns': ['peak_morning'], 'priorities': {'health': '1', 'relationships': '2', 'ambitions': '3', 'fun_activities': '4'}, 'layout_preference': {'structure': 'structured', 'subcategory': 'day-sections', 'timeboxed': 'untimeboxed'}, 'onboarding': {'currentStep': 8, 'totalSteps': 8, 'isComplete': False}}
Mar  9 03:53:48 ip-172-31-8-227 web[42098]: structured day-sections untimeboxed
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    Morning ðŸŒž
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Wake up and complete morning routine
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Enjoy breakfast while checking and responding to urgent emails
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Begin work on the day's highest priority task
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Attend team standup meeting
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Continue focused work on priority tasks
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Review and respond to important messages
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    Afternoon ðŸŒ‡
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Take a lunch break and go for a short walk
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Engage in a deep work session for main project tasks
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Take a quick break and have a healthy snack
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Wrap up daily tasks and plan for the next day
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    Evening ðŸ’¤
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Exercise or attend a gym session
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Prepare and enjoy dinner
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Spend time on a personal project or hobby
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Complete evening wind-down routine
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    â–¡ Go to bed at a consistent time
Mar  9 03:53:48 ip-172-31-8-227 web[42098]:    
Mar  9 03:53:48 ip-172-31-8-227 web[42098]: Response from AI service: {'schedule': '<schedule_planning>\n1. Tasks by category:\n- Work: 1:1 with Ed, post product report, write PRD\n- Exercise: gymies\n- Ambition: write PRD (overlaps with work)\n- No specific relationship or fun tasks provided\n\n2. Energy pattern analysis:\n- Peak energy in morning\n- Work schedule: 10:00 AM - 5:00 PM\n- Best to schedule high-focus tasks in morning hours\n- Exercise can be scheduled post-work when energy naturally dips\n\n3. Priority consideration:\n- Health is top priority (rank 1)\n- Exercise task should be prioritized\n- Write PRD falls under both work and ambition categories\n\n4. Schedule structure:\n- Client prefers structured but untimeboxed format\n- Using day-sections layout as specified\n- Tasks will be listed in sequence without specific times\n\n5. Final schedule arrangement:\n- Morning to include preparation and high-focus work tasks\n- Afternoon for remaining work tasks\n- Evening for exercise priority\n</schedule_planning>\n\n<schedule>\nMorning ðŸŒž\nâ–¡ Write PRD\nâ–¡ 1:1 with Ed\nâ–¡ Post product report\n\nAfternoon ðŸŒ‡\nâ–¡ Write PRD (continuation)\nâ–¡ Post product report (completion)\n\nEvening ðŸ’¤\nâ–¡ Gymies\n\n</schedule>'}
Mar  9 03:53:48 ip-172-31-8-227 web[42098]: User data received for user : {'name': '', 'age': '', 'work_start_time': '10:00 AM', 'work_end_time': '5:00 PM', 'tasks': [{'id': 'eae0f678-c891-4057-a264-cb998378710d', 'text': 'milky time', 'categories': ['Relationships'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 0, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '9acfcb3a-2774-466b-a5f8-d7f53ac5ba7f', 'text': 'gymies', 'categories': ['Exercise'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 1, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': 'f24b9dac-f484-4b7c-8d23-27c19b5021b6', 'text': '1:1 with ed', 'categories': ['Relationships', 'Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 2, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '75adfb4c-95c2-4af3-9229-57788aeb1c6e', 'text': 'post product reprot', 'categories': ['Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 3, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '3d3e2ebd-d2f6-4970-9f14-26d4840e63cd', 'text': 'write prd', 'categories': ['Ambition', 'Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 4, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}], 'energy_patterns': ['peak_morning'], 'priorities': {'health': '1', 'relationships': '2', 'ambitions': '3', 'fun_activities': '4'}, 'layout_preference': {'structure': 'structured', 'subcategory': 'day-sections', 'timeboxed': 'untimeboxed'}, 'onboarding': {'currentStep': 8, 'totalSteps': 8, 'isComplete': False}}"