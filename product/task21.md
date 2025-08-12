# Status: To Do
I am facing a bug where adding an to my google calendar overwrites my current day schedule by showing a new schedule with only manually created tasks and all google calendar tasks being filtered out. 

# Steps to reproduce:
1. go to today's schedule to see it's current state (e.g. has 5 tasks: 3 manually created and 2 sourced from google calendar)
2. on google calendar, create a new event for today
3. bug: go back to /dashboard, see today's schedule be overriden where only the 3 manually created tasks remain with all google calendar tasks not appearing


# Expected behaviour:
- adding google calendar events in real time should be shown as new events being appended in the current schedule
- google calendar events should be removed
- e.g. with the example I should see 6 tasks after adding a new event for today (3 manually created and 3 sourced from google calendar)

# Resources
## Backend server log
100.64.0.2 - - [12/Aug/2025 06:50:27] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:27] "GET /api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ5Nzc0MTksInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDk4MTM4MSwiZXhwIjoxNzU0OTg0OTgxLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.jAFLRlNqWsZl5eJQXPP2qwQ1njwvSqwr4UgddAUj9Q2odytrnf52jGDqAcdb7UHLycexSvSum3azgIApSGBihyBSyRG5Y-ulGWJ8XXPpA1Iozqap2y37wLIKyPonzgBvvtcGnjGRLgKL1VuA41Aerlf57RY1417B8LkvzhgtLMXGVFn_Y2WMR6ddbz9jkbTfR2r9ndyBWp_1AHBoWz5M3mi-P7mOxbvAmW65nwg-qfWmqrY-H0a_x8MWT_zFxXN4Fk8h6rxUV2sHneyCWvZF1dLnDugOGsCkLEkNC7iHM1IIS1akU0bl9MC31wp-jih2NsJC87UCb8zRVlztDYgGsA HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:27] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:27] "OPTIONS /api/schedules/2025-08-12 HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:28] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:28] "GET /api/schedules/2025-08-12 HTTP/1.1" 404 -

100.64.0.2 - - [12/Aug/2025 06:50:28] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:28] "OPTIONS /api/schedules/autogenerate HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:36] "POST /api/schedules/autogenerate HTTP/1.1" 200 -

100.64.0.5 - - [12/Aug/2025 06:50:52] "POST /api/calendar/webhook HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:52] "OPTIONS /api/schedules/2025-08-12 HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 06:50:53] "GET /api/schedules/2025-08-12 HTTP/1.1" 200 -

## Console logs
none made when a new google calendar event was added

## Network requests
none made when a new google calendar event was added