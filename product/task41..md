# Status: To Do
I am facing a bug where I am asked forced to re sign in via google sso to reconnect my google calendar every hour

# Steps to reproduce:
1. As an existing user, have a google calendar connection and schedule for the day
2. Wait more than an hour
3. Come back to /dashboard and see the toast "title: 'Calendar Connection Issue',
              description: 'Please reconnect your Google Calendar in the Integrations page.',"
4. Force prompted to re sign in


# Expected behaviour:
- Once google sso and calendar access have been provided they should last indefinitely via refresh tokens
- User should only re sign in when they have explicitly logged out or deleted their account
- User should only re provide calendar access if they have previously disconnected google calendar

# Backend server logs
  [TIMING] Schedule storage: 0.102s
[TIMING] Total submit_data request: 17.944s
Auth utils: Token verification error: Token expired, 1757472930 < 1757474942
DEBUG: Access token expired but no refresh token available for user VlCf1isTbDM2lSlj1rJkNMQlORN2
Auth utils: Token verification error: Token expired, 1757479855 < 1757479930
Received authentication request. Headers: Host: yourmum-production.up.railway.app
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
Content-Length: 243
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-GB,en;q=0.6
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImUzZWU3ZTAyOGUzODg1YTM0NWNlMDcwNTVmODQ2ODYyMjU1YTcwNDYiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cm11bS1jYzc0YiIsImF1ZCI6InlvdXJtdW0tY2M3NGIiLCJhdXRoX3RpbWUiOjE3NTc0Njc1MjUsInVzZXJfaWQiOiJWbENmMWlzVGJETTJsU2xqMXJKa05NUWxPUk4yIiwic3ViIjoiVmxDZjFpc1RiRE0ybFNsajFySmtOTVFsT1JOMiIsImlhdCI6MTc1NzQ3OTg1NywiZXhwIjoxNzU3NDgzNDU3LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.WS8SYARV-9eYHLZr3Gc56sYW6Wh8cqNPx4ETNftJqdJgZ0ewe0vhmzm64HZz9cOco7F7GRRG_C6MIY25lFy0wgeduv7wBnCuGJMkpFMHdCZegh3Za0LXpIRPUQxUEwJNBZbNSUDIlgse5RBqHNtbaqfzO8nHgDWnlQNdNt1pCg3QvUOcJU9rRRcpWNIm_yy6KtblqqAEcub1bHOY1jHcBSiAWtgBsVWLRxGwkQyKLAjvw4Z_VubXKmh7jMoW2ShoZpCH-wyZS9FipLRt1n34MONMneYirNKEvPxLZ77LRp2amrdQnQS48D1BVj5G3U2kb2tooNAdk_APIJZ3ILnz-g
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
X-Forwarded-For: 159.196.100.133
X-Forwarded-Host: yourmum-production.up.railway.app
X-Forwarded-Proto: https
X-Railway-Edge: railway/asia-southeast1-eqsg3a
X-Railway-Request-Id: 50IwQT50TCGY-Za8V7rehQ
X-Real-Ip: 159.196.100.133
X-Request-Start: 1757480546043

Request body: {'googleId': 'VlCf1isTbDM2lSlj1rJkNMQlORN2', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': False}
DEBUG: Access token expired but no refresh token available for user VlCf1isTbDM2lSlj1rJkNMQlORN2

# Browser logs
Setting currentDate: Wed Sep 10 2025 15:02:36 GMT+1000 (Australian Eastern Standard Time)
page-2a89121f1b90c99c.js:1 🔍 Dashboard: Starting calendar health validation...
page-2a89121f1b90c99c.js:1 🚀 Dashboard: Conditions met, loading initial schedule...
page-2a89121f1b90c99c.js:1 📋 Dashboard: Starting simplified loadInitialSchedule...
page-2a89121f1b90c99c.js:1 📅 Dashboard: Attempting to load existing schedule for: 2025-09-10
layout-bbef23a7c747ceae.js:1 RouteGuard State: Object
yourmum-production.up.railway.app/api/calendar/events?date=2025-09-10:1  Failed to load resource: the server responded with a status of 400 ()
page-2a89121f1b90c99c.js:1 Calendar API failed with auth error, needs re-authentication
page-2a89121f1b90c99c.js:1 ⚠️ Calendar health issue: calendar_auth_failed
page-2a89121f1b90c99c.js:1 🔄 Attempting calendar credential refresh...
112-c02e56744da00d53.js:1 Starting calendar credential refresh process
112-c02e56744da00d53.js:1 Refreshing Firebase credentials with popup
page-2a89121f1b90c99c.js:1 User creation date: Thu Aug 28 2025 06:56:25 GMT+1000 (Australian Eastern Standard Time)
page-2a89121f1b90c99c.js:1 ✅ Dashboard: Found existing schedule with 16 tasks
page-2a89121f1b90c99c.js:1 ✅ Rendering optimized backend structure