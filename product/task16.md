# Status: To Do
I am facing a bug where after google sso and approving google calendar connection, I do not see my google calendar events appear in my current day schedule

# Steps to reproduce:
1. Start on / home page and click one of the CTAs to trigger signup/login
2. Go through google sso and approve google calendar connection
3. See google calendar connection load page
4. Bug: arrive on /dashboard, google calendar events are not shown in today's schedule


# Expected behaviour:
- When I signup/login and approve google calendar connection, I should see today's google calendar events synced to my /dashboard schedule

# Notes:
- I do see today's google calendar events synced if I go to /integrations > disconnect > reconnect
- I also see today's google calendar events synced if I just hard refresh /dashboard 
- Perhaps this means there's an issue in loading the initial schedule? e.g. race condition?

# Resources
## Backend server logs
Accept: */*

Referer: https://yourdai.app/

Content-Type: application/json

Content-Type: application/json

Origin: https://yourdai.app

Sec-Ch-Ua: "Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"

Origin: https://yourdai.app

Priority: u=1, i

Sec-Ch-Ua-Mobile: ?1

Referer: https://yourdai.app/

Sec-Ch-Ua-Platform: "Android"

Sec-Ch-Ua-Platform: "Android"

Sec-Ch-Ua: "Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"

Sec-Fetch-Dest: empty

Sec-Fetch-Dest: empty

Sec-Ch-Ua-Mobile: ?1

Sec-Fetch-Mode: cors

Sec-Fetch-Mode: cors

Sec-Ch-Ua-Platform: "Android"

Sec-Fetch-Site: cross-site

Sec-Fetch-Dest: empty

Sec-Fetch-Site: cross-site

Sec-Gpc: 1

Sec-Fetch-Mode: cors

Sec-Gpc: 1

X-Forwarded-For: 1.129.111.94

Sec-Fetch-Site: cross-site

Sec-Gpc: 1

X-Forwarded-Host: yourdai-production.up.railway.app

X-Forwarded-For: 1.129.111.94

X-Forwarded-For: 1.129.111.94

X-Forwarded-Proto: https

X-Forwarded-Host: yourdai-production.up.railway.app

X-Forwarded-Host: yourdai-production.up.railway.app

X-Forwarded-Proto: https

X-Railway-Edge: railway/us-west2

X-Forwarded-Proto: https

Accept-Encoding: gzip, deflate, br, zstd

X-Railway-Request-Id: aZTqi33BR4WfcyHxn6XIxQ

X-Real-Ip: 1.129.111.94

Accept-Language: en-GB,en;q=0.9

X-Railway-Edge: railway/us-west2

X-Request-Start: 1754887151634

Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ4ODcxMzgsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDg4NzE2OCwiZXhwIjoxNzU0ODkwNzY4LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.ryODGokkyY8_DlsH78DgR0OEF9TQYRzIzLPyW9Jm1BBzgKhjA70DzWeEU8q_tp9pv2XyZYBhiN3tmhKxH5l0WBDiJlr1BY9ZTWYlbkQPrmHg14JpwlonNK2k5KNaxce7QkYRnRTUd21p04YiiSUn_HwuSmDzTeYgoglybBTw5iVAIeibvXuLjWT8ZRGYE29J77nfr6dz08mljtRz7TDwQpWGuEXuYAnwgVRsoeE7_IOy3wGyq2Ltv9Q4UVJG7IpWMKsgQf-lQSUeNnq_8oiuSppZAWI-pKMe1UpuGS30vh-uNdzR18sM3t92qQLHK64D9GaNMVHo5_MbFUekbCWG3w

Content-Type: application/json

Origin: https://yourdai.app

Priority: u=1, i

Referer: https://yourdai.app/

Sec-Ch-Ua: "Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"

Sec-Ch-Ua-Mobile: ?1


100.64.0.4 - - [11/Aug/2025 04:39:31] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.4 - - [11/Aug/2025 04:39:31] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.4 - - [11/Aug/2025 04:39:33] "GET /api/calendar/events?date=2025-08-11&timezone=Australia/Sydney HTTP/1.1" 200 -

## Console logs
User creation date: Sun Mar 02 2025 11:01:54 GMT+1100 (Australian Eastern Daylight Time)
581-cd4432544f76df4d.js:1 User stored in backend successfully with calendar access: false
581-cd4432544f76df4d.js:1 Authentication completed successfully
581-cd4432544f76df4d.js:1 User stored in backend successfully with calendar access: true
581-cd4432544f76df4d.js:1 Starting calendar connection process...
581-cd4432544f76df4d.js:1 Waiting for auth state to stabilize before connecting to Google Calendar...
581-cd4432544f76df4d.js:1 Connecting to Google Calendar...
581-cd4432544f76df4d.js:1 Connected to Google Calendar successfully
page-8b1fab9d9b13598c.js:1 ⚠️ Rendering legacy structure