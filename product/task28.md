# Status: To Do
I am facing a bug where I am prompted to redo google sso and give google calendar access when I have already done so during sign up

# Pre conditions before steps reproduction
- As an existing user, disconnect google calendar connection
- Open browser dev tools > Application tab > Click "Clear site data"
- Also delete current day schedule from database
- Now we're on the home page as an existing user but with no current day schedule, not signed in and not connected to google calendar

# Steps to reproduce:
1. Go through google sso and giving calendar access
2. arrive on /dashboard with autogenerate called and current day schedule being created successfully
3. click on any other page in @AppSidebar e.g. (Integrations)
4. bug: see google calendar load page appear 
5. bug: prompted to oauth with the page @https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?client_id=246264772427-aifjrr51mhhhg564plqs3tibqdbabohb.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fyourdai-production.up.railway.app%2Fapi%2Fcalendar%2Foauth%2Fcallback&response_type=code&access_type=offline&prompt=consent&state=Si3NryNNjSMbW8q1t0niKX8sYng1&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly&service=lso&o2v=2&flowName=GeneralOAuthFlow saying continue to "yourdai-production.up.railway.app" 
6. now google calendar is connected successfully

# Expected behaviour:
- if user has already gone through google sso and given google calendar access, they should not have to go through the oauth flow again 
- ensure after going through google sso and calendar access all auth data like refresh token are correct

# Notes:
- not sure why we see a second oauth page mentioning "yourdai-production.up.railway.app"

# Backend server logs
Successfully connected to MongoDB database: YourDaiSchedule

Warning: Using default credentials. Error: [Errno 2] No such file or directory: 'path/to/serviceAccountKey.json'

Cleared existing Firebase apps

Firebase not yet initialized, continuing...

Successfully parsed Firebase credentials from JSON

Successfully initialized Firebase with credentials

Firebase initialized successfully

Successfully connected to MongoDB

AI suggestions collection initialized successfully

Users collection initialized successfully

Calendar collections initialized successfully

Slack collections initialized successfully

Archive collections initialized successfully

User schedules collection initialized successfully

Database initialized successfully

Received authentication request. Headers: Host: yourdai-production.up.railway.app

User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36

Content-Length: 243

Accept: */*

Accept-Encoding: gzip, deflate, br, zstd

Accept-Language: en-GB,en;q=0.7

Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjU3YmZiMmExMWRkZmZjMGFkMmU2ODE0YzY4NzYzYjhjNjg3NTgxZDgiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTU1NzA3NjIsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NTc1MDI4NCwiZXhwIjoxNzU1NzUzODg0LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.SW7BP_6ou-Pq6XSz7V2tLvY6QoMKQTLwEtUbf3OjbYsRvHYjViPbvbktJ1dhzaKPLq74CuhCUXP4GWHOUfJr9J4A3cjI6PZwzAk8OspcpV9KIr3naVnaxuwZTN9CcyAyqskOPPeksc-a03hxOXjlPWS0a79zD50vol7IB8ntQbp8oschcNs9NdlILkcU7Du7DkcL7-KzXghR5ZlskhyiLuqq6GtNA-gsOR4T3kKFM6ddIC-4p9KUGPyF5OwyB5u49Gwb5byDYXuH0afKdR4cRoLIIYFuoOyFjfTzSPXnmw6-Hw8lKex3n4u1Npk01tk9Yn0QYRjpATgwayCaANZOYQ

Content-Type: application/json

Origin: https://yourdai.app

Sec-Fetch-Mode: cors

Priority: u=1, i

Referer: https://yourdai.app/

Sec-Ch-Ua: "Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"

Sec-Fetch-Site: cross-site

Sec-Ch-Ua-Mobile: ?1

Content-Length: 242

Sec-Gpc: 1

Sec-Ch-Ua-Platform: "Android"

Sec-Fetch-Dest: empty

X-Forwarded-For: 137.111.13.200

Accept: */*

X-Forwarded-Host: yourdai-production.up.railway.app

Sec-Fetch-Mode: cors

Accept-Encoding: gzip, deflate, br, zstd

Sec-Fetch-Site: cross-site

X-Railway-Request-Id: WY42LGFuQ2uH_pGzw9P4nw

X-Forwarded-Proto: https

Accept-Language: en-GB,en;q=0.7

Sec-Gpc: 1

X-Railway-Edge: railway/europe-west4-drams3a

X-Forwarded-For: 137.111.13.200
