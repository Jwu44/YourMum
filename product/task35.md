I am facing a bug where I am seeing multiple loadig states display after google sso when my calendar connection and schedule for the day are being set up.

# Preconditions before reproducing:
- Existing user
- No google calendar connection
- No schedule for today

# Steps to reproduce:
1. Complete google sso and give gcal access
2. Bug #1: After providing calendar access, user is taken to /dashboard and sees loading skeleton
3. Bug #2: User is then directed to /loading?reason=schedule while autogenerate() is being called
4. Bug #3: User is then directed to /loading?reason=schedule&from=calendar
5. Bug #4: User is taken to /dashboard and sees loading skeleton again 


# Expected behaviour:
- After step 1, user should straight to step 4 which means:
    - user should NOT be taken to /dashboard and see loading skeleton
    - user should NOT be directed to /loading?reason=schedule
- User should not see the loading skeleton in step 5 because the schedule should be fully rendered at that point

# Requirements
- assess if /loading?reason=schedule&from=calendar logic is unnecessary, can't we just reuse reason=calendar?
- identify any potential race conditions

# Resources
## Backend server logs
Deduplication: 14 tasks -> 10 tasks
[TIMING] Task deduplication: 0.000s
[TIMING] Total task processing (steps 3-6): 4.842s
Found recent schedule with inputs from 2025-09-03
[TIMING] Inputs lookup: 0.149s
[TIMING] Document creation and save: 0.150s
[TIMING] Metadata calculation: 0.000s
[TIMING] autogenerate_schedule SUCCESS: 5.429s
DEBUG: Fetching events for 2025-09-04 in timezone Australia/Sydney
DEBUG: Local time range: 2025-09-04 00:00:00+10:00 to 2025-09-04 23:59:59+10:00
DEBUG: UTC time range: 2025-09-03T14:00:00Z to 2025-09-04T13:59:59Z
Received authentication request. Headers: Host: yourmum-production.up.railway.app
User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36
Content-Length: 243
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-GB,en;q=0.7
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImVmMjQ4ZjQyZjc0YWUwZjk0OTIwYWY5YTlhMDEzMTdlZjJkMzVmZTEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cm11bS1jYzc0YiIsImF1ZCI6InlvdXJtdW0tY2M3NGIiLCJhdXRoX3RpbWUiOjE3NTY5NDk3MTQsInVzZXJfaWQiOiJWbENmMWlzVGJETTJsU2xqMXJKa05NUWxPUk4yIiwic3ViIjoiVmxDZjFpc1RiRE0ybFNsajFySmtOTVFsT1JOMiIsImlhdCI6MTc1Njk0OTcxNSwiZXhwIjoxNzU2OTUzMzE1LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.PRUzkZdPdvEs3097DfhIjrJPMWBDN_tblMJg5uYVDhtXjEJzu8Hc0Oyyn9956cg7sqpQIcJT-Lc-qPKsyzsYhFfzRDuZt5D1cuJY2F0HS04vOG019wJMjfQyydvVm6J2rV7e2B962rwziaVyvsVswZ7O_kSBJ57KjS2LKzpZLtE_BxQJgkk0YCH_rAcmGmskwErJ_AEW2EoKh1po1YOiBR-x_DIP2rGMToHnVgZr0BDx2dd4LePeE6Dcc05nEt-7FImPbPUiLxWpKyCEimi3Dc4BN9reO8cZVW4ZJgLJj7X1OjY1SpZA_nM7jA9PazpVajQmJBSXHQdwzjt_zLbT_Q
Content-Type: application/json
Origin: https://yourmum.app
Priority: u=1, i
Referer: https://yourmum.app/
Sec-Ch-Ua: "Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"
Sec-Ch-Ua-Mobile: ?1
Sec-Ch-Ua-Platform: "Android"
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: cross-site
Sec-Gpc: 1
X-Forwarded-For: 58.178.50.215
X-Forwarded-Host: yourmum-production.up.railway.app
X-Forwarded-Proto: https
X-Railway-Edge: railway/asia-southeast1-eqsg3a
X-Railway-Request-Id: Dy_MhxuXRTeDHqiA0ubPiw
X-Real-Ip: 58.178.50.215
X-Request-Start: 1756949716139