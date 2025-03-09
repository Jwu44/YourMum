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
"Mar  9 03:26:34 ip-172-31-8-227 web[40942]: Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': False}
Mar  9 03:26:34 ip-172-31-8-227 web[40942]: User data received for user : {'name': '', 'age': '', 'work_start_time': '9:00 AM', 'work_end_time': '5:00 PM', 'tasks': [{'id': 'bc15b5d4-d148-421b-a113-ff38ff9826d7', 'text': 'cook for mum', 'categories': ['Relationships'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 0, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '215423fc-7eab-46c4-b63b-c26341563aa1', 'text': 'post product report', 'categories': ['Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 1, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '8f1051ae-4dfd-4baa-af3c-d5579acd7273', 'text': 'gym', 'categories': ['Exercise'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 2, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '0b479236-7c2f-4e9a-8d09-3a9227707cfc', 'text': 'check slack', 'categories': ['Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 3, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': '0909bf61-0230-49a8-b1e6-ce202037251f', 'text': '1:1 with ed', 'categories': ['Relationships', 'Ambition'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 4, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}, {'id': 'e91f076c-c12e-4672-a9df-13af7257121d', 'text': 'meetings', 'categories': ['Work'], 'is_subtask': False, 'completed': False, 'is_section': False, 'section': None, 'parent_id': None, 'level': 0, 'section_index': 5, 'type': 'task', 'is_recurring': None, 'start_date': '2025-03-09'}], 'energy_patterns': ['peak_afternoon'], 'priorities': {'relationships': '1', 'health': '2', 'fun_activities': '3', 'ambitions': '4'}, 'layout_preference': {'structure': 'structured', 'subcategory': 'day-sections', 'timeboxed': 'timeboxed'}, 'onboarding': {'currentStep': 8, 'totalSteps': 8, 'isComplete': False}}
Mar  9 03:26:34 ip-172-31-8-227 web[40942]: structured day-sections timeboxed
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    Morning ðŸŒž
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 7:00am - 7:30am: Wake up and morning routine
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 7:30am - 8:00am: Breakfast and check emails
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 8:00am - 9:30am: Work on high-priority project
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 9:30am - 10:00am: Team standup meeting
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 10:00am - 11:30am: Continue high-priority project work
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 11:30am - 12:00pm: Review and respond to important messages
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    Afternoon ðŸŒ‡
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 12:00pm - 1:00pm: Lunch break and short walk
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 1:00pm - 3:00pm: Deep work session on main tasks
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 3:00pm - 3:30pm: Quick break and snack
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 3:30pm - 5:00pm: Finish up daily tasks and plan for tomorrow
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    Evening ðŸ’¤
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 5:00pm - 6:00pm: Exercise or gym session
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 6:00pm - 7:00pm: Dinner and relaxation
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 7:00pm - 8:30pm: Personal project or hobby time
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 8:30pm - 9:30pm: Wind down routine
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    â–¡ 9:30pm: Bedtime
Mar  9 03:26:34 ip-172-31-8-227 web[40942]:    
"

Steps to resolve:
1. Modify the backend schedule generation function to return a properly structured JSON response instead of formatted text
2. Ensure the generated schedule is being saved to the `user_schedules` collection in MongoDB
3. Format the response according to the expected structure in the frontend:
   ```json
   {
     "success": true,
     "schedule": {
       "date": "2025-03-09",
       "sections": [
         {
           "name": "Morning",
           "timeBlocks": [
             {"startTime": "7:00am", "endTime": "7:30am", "task": "Wake up and morning routine"},
             // other time blocks...
           ]
         },
         // other sections...
       ]
     }
   }
   ```
4. Update error handling to provide more descriptive error messages

The issue is that the backend is generating a human-readable text schedule instead of a structured JSON object that the frontend can parse and display.