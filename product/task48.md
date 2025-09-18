# Status: to do

I am facing a bug where i am seeing auth errors on /dashboard after completing google sso and granting gcal access. This causes my schedule to not be created 

# Steps to reproduce:
1. go through google sso
2. click "continue" to grant calendar access
3. arrive on /dashboard
4. bug: schedule is empty and there are errors in console


# Expected behaviour:
- as a first time user with gcal synced, my initial schedule should have gcal events
- as a first time user without gcal synced, my initial schedule would be empty
- as an existing user with an exisitng schedule for today, dashboard should simply load the existing schedule
- as an existing user without an existing schedule for today, dashboard should call autogenerate() to create today's schedule

# Resources
## Console logs
🚀 Dashboard: Conditions met, loading initial schedule...
page-9ad5770fd6568079.js:1 📋 Dashboard: Starting simplified loadInitialSchedule...
page-9ad5770fd6568079.js:1 📅 Dashboard: Attempting to load existing schedule for: 2025-09-18
layout-ab7e0ccb8a4c8ef8.js:1 RouteGuard State: {user: 'Justin Wu (justin.yourmum4444@gmail.com)', loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
564-b9eaee3aac40e755.js:1  GET https://yourmum-production.up.railway.app/api/auth/user 401 (Unauthorized)
request @ 564-b9eaee3aac40e755.js:1
await in request
get @ 564-b9eaee3aac40e755.js:1
getCurrentUser @ page-9ad5770fd6568079.js:1
getUserCreationDate @ page-9ad5770fd6568079.js:1
564-b9eaee3aac40e755.js:1 🔄 Received 401, clearing token cache and retrying...
564-b9eaee3aac40e755.js:1 🔄 Refreshing Firebase ID token...
stream:1  GET https://yourmum-production.up.railway.app/api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjUwMDZlMjc5MTVhMTcwYWIyNmIxZWUzYjgxZDExNjU0MmYxMjRmMjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0lFeERIWFV1aExwUFJMbzJnLTlYazNna09Ea1FCUkkySHpJZEFrcXR3ajQyMlkyQT1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS95b3VybXVtLWNjNzRiIiwiYXVkIjoieW91cm11bS1jYzc0YiIsImF1dGhfdGltZSI6MTc1ODE2MjkwMCwidXNlcl9pZCI6IjBtR0ZWOTc1azhhTk1HakFKVXg4T1dJZTREQjMiLCJzdWIiOiIwbUdGVjk3NWs4YU5NR2pBSlV4OE9XSWU0REIzIiwiaWF0IjoxNzU4MTYyOTAyLCJleHAiOjE3NTgxNjY1MDIsImVtYWlsIjoianVzdGluLnlvdXJtdW00NDQ0QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTA3Mzk5OTE2MTM1OTI3MzYyODMzIl0sImVtYWlsIjpbImp1c3Rpbi55b3VybXVtNDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.EO7R4riiHyWh26vduia4VhSP4o8OCEktel41acKVs0c32pyhP1FNo50jDfS8iPNLp25oRaGPEuouAIvc8QdCU-UA0bEsSTrhtxYXqJppUjxMUABT1TgSUDBq0-CtHtFnOvJbPgYCLsCETfzXIF2rGCviojDPTYdQLButVQYNttr_Rx-Ys0ZHuA1ZpkGP2g44gvZY-XUFLkpO-GMVigQBDGGtyaxtJjrcW67L7gQv1ChSyPPxoFptsXNhbb_vxrIWlLSUqedUT_mJ6DFCWSna4cxvXnBE3k39rnInODctKVDH7Yr_THcWzZguHqvtK8zDZsIUXKS7ly5x4cAC7brPkA 401 (Unauthorized)
139-4f1a486df036f344.js:1  GET https://yourmum-production.up.railway.app/api/schedules/2025-09-18 401 (Unauthorized)
d @ 139-4f1a486df036f344.js:1
await in d
T @ 117-a2e30b74bbda5457.js:1
117-a2e30b74bbda5457.js:1 Error loading schedule: Error: Invalid authentication token
    at d (139-4f1a486df036f344.js:1:7037)
    at async t (page-9ad5770fd6568079.js:1:51594)
push.92304.window.console.error @ 117-a2e30b74bbda5457.js:1
d @ 139-4f1a486df036f344.js:1
page-9ad5770fd6568079.js:1 📝 Dashboard: No existing schedule found, attempting autogenerate...
564-b9eaee3aac40e755.js:1 ✅ Firebase ID token refreshed successfully
564-b9eaee3aac40e755.js:1  GET https://yourmum-production.up.railway.app/api/auth/user 401 (Unauthorized)
request @ 564-b9eaee3aac40e755.js:1
await in request
request @ 564-b9eaee3aac40e755.js:1
await in request
get @ 564-b9eaee3aac40e755.js:1
getCurrentUser @ page-9ad5770fd6568079.js:1
getUserCreationDate @ page-9ad5770fd6568079.js:1
117-a2e30b74bbda5457.js:1 Error fetching user data: Error: Authentication failed
    at Object.getCurrentUser (page-9ad5770fd6568079.js:1:10990)
    at async Object.getUserCreationDate (page-9ad5770fd6568079.js:1:11203)
    at async page-9ad5770fd6568079.js:1:40559
push.92304.window.console.error @ 117-a2e30b74bbda5457.js:1
getCurrentUser @ page-9ad5770fd6568079.js:1
await in getCurrentUser
getUserCreationDate @ page-9ad5770fd6568079.js:1
117-a2e30b74bbda5457.js:1 Error getting user creation date: Error: Failed to fetch user profile
    at Object.getCurrentUser (page-9ad5770fd6568079.js:1:11125)
    at async Object.getUserCreationDate (page-9ad5770fd6568079.js:1:11203)
    at async page-9ad5770fd6568079.js:1:40559
push.92304.window.console.error @ 117-a2e30b74bbda5457.js:1
getUserCreationDate @ page-9ad5770fd6568079.js:1
await in getUserCreationDate
page-9ad5770fd6568079.js:1 User creation date: Mon Jan 01 2024 11:00:00 GMT+1100 (Australian Eastern Daylight Time)
139-4f1a486df036f344.js:1  POST https://yourmum-production.up.railway.app/api/schedules/autogenerate 401 (Unauthorized)
page-9ad5770fd6568079.js:1 ⚠️ Dashb

# Network requests
- https://yourmum-production.up.railway.app/api/auth/user: {"error":"Authentication failed","message":"Invalid token or user not found"}
- https://yourmum-production.up.railway.app/api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjUwMDZlMjc5MTVhMTcwYWIyNmIxZWUzYjgxZDExNjU0MmYxMjRmMjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cm11bS1jYzc0YiIsImF1ZCI6InlvdXJtdW0tY2M3NGIiLCJhdXRoX3RpbWUiOjE3NTgxNzE1ODEsInVzZXJfaWQiOiJWbENmMWlzVGJETTJsU2xqMXJKa05NUWxPUk4yIiwic3ViIjoiVmxDZjFpc1RiRE0ybFNsajFySmtOTVFsT1JOMiIsImlhdCI6MTc1ODE3MTU4MiwiZXhwIjoxNzU4MTc1MTgyLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.HmhepViAqi6CIFLU1KeC0ur7u-hmE9uWNZtzsNOBMKU-UWOmorFGXjL6XnFF_6IUGqlCa8bFHB6URci_BQP9XBstxCXl3zZb4GoJlONRSBOgZoFXrc4sv4OkX9SmeKXZoZ-L7VdHwzts5hPYTFnKwIcFonz7qBqHogSNsrSI2BskgSgYYxx3FxfBpCoiyLDHU6VHrx9x3cTGczHzUf1cKhiOQQAI5BCjozC2ktmZzujVZkyYLO-crTdwTGsNOm-9QFqqNxTFCzTqJTeD3sA5kF995MLOBRZ3aS0UPu9cOHK0MhQ6nYxG5eQkWDlm2JtnYfJotp_ZIHBZ8SgVyR-nnA: {"error":"Invalid authentication token","success":false}
- https://yourmum-production.up.railway.app/api/schedules/2025-09-18: {"error":"Invalid authentication token","success":false}
- https://yourmum-production.up.railway.app/api/auth/user: {"error":"Authentication failed","message":"Invalid token or user not found"}
- https://yourmum-production.up.railway.app/api/schedules/autogenerate: {"error":"Invalid authentication token","success":false}
