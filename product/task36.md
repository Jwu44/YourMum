# Issue 1: ✅ Resolved
I am facing a bug where I am required to go through google sso twice.

# Preconditions before reproducing:
@@ -13,3 +14,126 @@ I am facing a bug where I am required to go through google sso twice.

# Expected behaviour:
- after completing google sso and giving gcal access via https://yourmum-cc74b.firebaseapp.com, user should not have to go through google sso again and give gcal access the 2nd time

# Issue 2: To do
I am facing a bug where I am seeing multiple loading states after google sso and approving gcal

# Preconditions before reproducing:
- Existing user who is logged out
- No google calendar connection
- No schedule for today

# Steps to reproduce:
1. Complete google sso and give gcal access via https://yourmum-cc74b.firebaseapp.com
2. Bug #1: After providing calendar access, user is taken to /dashboard and sees loading skeleton
3. Bug #2: User is then directed to /loading?reason=schedule while autogenerate() is being called
4. Bug #3: Briefly get taken to /dashboard
5. Bug #4: User is then directed to /loading?reason=schedule again
6. User is taken to /dashboard with rendered schedule

# Expected behaviour:
- After completing google sso and giving gcal access, user should be taken straight to 1 loading state which should process both the google calendar connection and autogenerate()
- Once those processes are complete, then take user to /dashboard with rendered schedule

# Network requests:
- https://yourmum-production.up.railway.app/api/auth/user: {googleId: "VlCf1isTbDM2lSlj1rJkNMQlORN2", email: "justin.wu4444@gmail.com", displayName: "Justin Wu",…}
displayName
: 
"Justin Wu"
email
: 
"justin.wu4444@gmail.com"
googleId
: 
"VlCf1isTbDM2lSlj1rJkNMQlORN2"
hasCalendarAccess
: 
false
photoURL
: 
"https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c"
- https://yourmum-production.up.railway.app/api/auth/user: {googleId: "VlCf1isTbDM2lSlj1rJkNMQlORN2", email: "justin.wu4444@gmail.com", displayName: "Justin Wu",…}
displayName
: 
"Justin Wu"
email
: 
"justin.wu4444@gmail.com"
googleId
: 
"VlCf1isTbDM2lSlj1rJkNMQlORN2"
hasCalendarAccess
: 
true
photoURL
: 
"https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c"
- https://yourmum-production.up.railway.app/api/schedules/2025-09-04: 404 not found
- https://yourmum.app/loading.txt?reason=schedule&_rsc=1pqyf
- https://yourmum-production.up.railway.app/api/schedules/autogenerate: {date: "2025-09-04", timezone: "Australia/Sydney"}
date
: 
"2025-09-04"
timezone
: 
"Australia/Sydney"
- https://securetoken.googleapis.com/v1/token?key=AIzaSyCBmlq8Wc5yEuUAkqmKnIoafq_uppShqm8
- https://yourmum.app/loading.txt?reason=schedule&_rsc=1pqyf
- https://yourmum-production.up.railway.app/api/auth/user: {authenticated: true, user: {_id: "68affd997b50055f7d99c0dd", age: null,…}}
authenticated
: 
true
user
: 
{_id: "68affd997b50055f7d99c0dd", age: null,…}
- https://yourmum-production.up.railway.app/api/auth/user: {message: "User successfully created/updated", user: {_id: "68affd997b50055f7d99c0dd", age: null,…}}
message
: 
"User successfully created/updated"
user
: 
{_id: "68affd997b50055f7d99c0dd", age: null,…}
- https://yourmum-production.up.railway.app/api/auth/user: {authenticated: true, user: {_id: "68affd997b50055f7d99c0dd", age: null,…}}
authenticated
: 
true
user
: 
{_id: "68affd997b50055f7d99c0dd", age: null,…}
- https://yourmum-production.up.railway.app/api/schedules/autogenerate: {"created":false,"date":"2025-09-04","existed":true,"schedule":[{"categories":[],"completed":false,"end_time":null,"from_gcal":true,"gcal_event_id":"7o07oan6p7q92m71bghfvq7oha","id":"7o07oan6p7q92m71bghfvq7oha","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-09-04","start_time":null,"text":"nomad climbs","type":"task"},{"categories":[],"completed":false,"end_time":"12:30","from_gcal":true,"gcal_event_id":"7ch5s7p4cbulc79ass4ivjtoni","id":"7ch5s7p4cbulc79ass4ivjtoni","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-09-04","start_time":"11:30","text":"lockedd inn","type":"task"}],"sourceFound":true,"success":true}

## Backend server logs:
Successfully connected to MongoDB database: YourMumSchedule
Warning: Using default credentials. Error: [Errno 2] No such file or directory: 'path/to/serviceAccountKey.json'
Cleared existing Firebase apps
Firebase not yet initialized, continuing...
Successfully parsed Firebase credentials from JSON
Successfully initialized Firebase with credentials
Firebase initialized successfully
Successfully connected to MongoDB
Users collection initialized successfully
Calendar collections initialized successfully
Slack collections initialized successfully
Archive collections initialized successfully
User schedules collection initialized successfully
Database initialized successfully
Received authentication request. Headers: Host: yourmum-production.up.railway.app
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
Content-Length: 243
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-GB,en;q=0.8
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImVmMjQ4ZjQyZjc0YWUwZjk0OTIwYWY5YTlhMDEzMTdlZjJkMzVmZTEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cm11bS1jYzc0YiIsImF1ZCI6InlvdXJtdW0tY2M3NGIiLCJhdXRoX3RpbWUiOjE3NTY5NTA5NDMsInVzZXJfaWQiOiJWbENmMWlzVGJETTJsU2xqMXJKa05NUWxPUk4yIiwic3ViIjoiVmxDZjFpc1RiRE0ybFNsajFySmtOTVFsT1JOMiIsImlhdCI6MTc1Njk1ODEzOSwiZXhwIjoxNzU2OTYxNzM5LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.XMKfAZSLt-KcZ8w9Pjbv9mqssa7VESfk9PKqaz_xhK3FD3iOwMJZKQMJ0EY92jRfl99bC1FlBN8Qsjv_N95BMeQDoR1pgScMTZp5cybWQT6ZEmLywrmxdiAOi6fK9NgkOEwFckQYcUXwtatpex-_d0kCACQVHP-d_SguwnyfbfryhS8dCj0NbHQ752aulTB4Leq5ydw8K66QhPckM2HLxXQNO_SbqUujRLWk8KgNRGyJaV_oK31YU9aNYriSVtSYI7X80HWjFssYDOg1nxeAmuJ9ZoF83UwQMfK4RkKEZkm4L4GuvhxKbS9fNcdrZCsQsHBU34BSWuDriOyb5nSZMA
Content-Type: application/json
Origin: https://yourmum.app
Priority: u=1, i
Referer: https://yourmum.app/
Sec-Ch-Ua: "Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: cross-site
Sec-Gpc: 1
X-Forwarded-For: 203.194.42.183
X-Forwarded-Host: yourmum-production.up.railway.app