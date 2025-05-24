# TASK-02: Firebase credentials not found
Status: In Progress

## Bug
After completing google sso and selecting google calendar scope, user's google calendar events are not syncing due to firebase credentials not being found.

## Browser logs
Sign in successful: Justin Wu (justin.wu4444@gmail.com)
Has calendar access: true
Waiting for auth state to stabilize before connecting to Google Calendar...
Connecting to Google Calendar...
Token obtained: true
POST https://yourdai.be/api/calendar/connect 500 (Internal Server Error)
 Error connecting to calendar: Error: Failed to connect calendar: {"error":"Failed to connect to Google Calendar: Firebase credentials not found in environment variables","success":false}
 Navigating to dashboard
Navigated to https://yourdai.app/dashboard
Setting up auth state change listener
Checking redirect result...
Auth state changed. User: Justin Wu (justin.wu4444@gmail.com)
Got ID token
API Base URL from env: https://yourdai.be
Attempting to store user at: https://yourdai.be/api/auth/user
Redirect result: null
No redirect result found
page-049776ad055ddfdd.js:1 Setting currentDate: Sun May 25 2025 04:35:25 GMT+1000 (Australian Eastern Standard Time)
User endpoint status: 200
User stored successfully: {message: 'User successfully created/updated', user: {…}}
Authentication completed successfully
      
GET https://yourdai.be/api/calendar/events?date=2025-05-24 500 (Internal Server Error)

## EC2 instance logs
- [2025-05-24 18:27:03 +0000] [677983] [INFO] Handling signal: term
- [2025-05-24 18:27:03 +0000] [678016] [INFO] Worker exiting (pid: 678016)
- DEBUG - FULL TOKEN: eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgwOTEyNDgsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODA5MTI1MywiZXhwIjoxNzQ4MDk0ODUzLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.FBX-A1XTp9c4f-l8KlPPiZDqU-QT0osCk8j7suEoEAjZ7gjwjSvpvYRYh_3qiEL8xV6Y4Dn1Qgau4j1UnlFvRK_nQGQ4ycGzFdm6yuNiJ-A9ZOl0E-dwDhjDFPLWcg_Jp5dvl7rFq4dcxSfFtQyIrC_oJhxZThdb46xZl5gw-UJ78Hb2BEGkgHCZOYca5Qi3iqjDDcFvr3Hsijbaapf_i0zrlks9zBNvJcwty8Ih3aeFiOMuCLB-ZiU7b-c8e49KZsGWRagWc99At9e9iW57qJjmOZu5q5slCXmqNKDHFRgZa5P7V-nLfcGqEIsmNIROHwkwzlBkxQAuO0HNY9UNbg
- DEBUG - Auth header: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgwOTEyNDgsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODA5MTI1MywiZXhwIjoxNzQ4MDk0ODUzLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.FBX-A1XTp9c4f-l8KlPPiZDqU-QT0osCk8j7suEoEAjZ7gjwjSvpvYRYh_3qiEL8xV6Y4Dn1Qgau4j1UnlFvRK_nQGQ4ycGzFdm6yuNiJ-A9ZOl0E-dwDhjDFPLWcg_Jp5dvl7rFq4dcxSfFtQyIrC_oJhxZThdb46xZl5gw-UJ78Hb2BEGkgHCZOYca5Qi3iqjDDcFvr3Hsijbaapf_i0zrlks9zBNvJcwty8Ih3aeFiOMuCLB-ZiU7b-c8e49KZsGWRagWc99At9e9iW57qJjmOZu5q5slCXmqNKDHFRgZa5P7V-nLfcGqEIsmNIROHwkwzlBkxQAuO0HNY9UNbg
- Error fetching Google Calendar events: 415 Unsupported Media Type: Did not attempt to load JSON data because the request Content-Type was not 'application/json'.
- [2025-05-24 18:27:13 +0000] [705981] [INFO] Starting gunicorn 21.2.0
- [2025-05-24 18:27:13 +0000] [705981] [INFO] Listening at: http://0.0.0.0:8000 (705981)
- [2025-05-24 18:27:13 +0000] [705981] [INFO] Using worker: sync
- [2025-05-24 18:27:13 +0000] [706011] [INFO] Booting worker with pid: 706011
- : /var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pydantic/_internal/_config.py:321: UserWarning: Valid config keys have changed in V2:
- : * 'allow_population_by_field_name' has been renamed to 'populate_by_name'
- :  warnings.warn(message, UserWarning)
- Traceback (most recent call last):
-  File "/var/app/current/backend/apis/calendar_routes.py", line 131, in connect_google_calendar
-    user_id = get_user_id_from_token(token)
-  File "/var/app/current/backend/apis/calendar_routes.py", line 79, in get_user_id_from_token
-    app = initialize_firebase()
-  File "/var/app/current/backend/apis/calendar_routes.py", line 61, in initialize_firebase
-    raise ValueError("Firebase credentials not found in environment variables")
- ValueError: Firebase credentials not found in environment variables
- Warning: Using default credentials. Error: [Errno 2] No such file or directory: 'path/to/serviceAccountKey.json'
- Firebase initialization error: dictionary changed size during iteration
- Successfully connected to MongoDB
- Successfully connected to MongoDB database: YourDaiSchedule
- AI suggestions collection initialized successfully
- Users collection initialized successfully
- Calendar collections initialized successfully
- Database initialized successfully
- Received authentication request. Headers: Connection: upgrade
- Host: yourdai.be
- X-Real-Ip: 172.31.30.78
- X-Forwarded-For: 1.40.161.22, 172.31.30.78
- Content-Length: 242
- X-Forwarded-Proto: https
- X-Forwarded-Port: 443
- X-Amzn-Trace-Id: Root=1-68321010-23d9be6b0a401ade42002f62
- Sec-Ch-Ua-Platform: "macOS"
- Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImZlNjVjY2I4ZWFkMGJhZWY1ZmQzNjE5NWQ2NTI4YTA1NGZiYjc2ZjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgwOTEyNDgsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODExMTM3NCwiZXhwIjoxNzQ4MTE0OTc0LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.HehpIW-p_FzwIMSte6vkoRmBke59mmTQRKGmu5D6ByBtEsg2cmVSTPYml32MN272aj8vuMKfxbYNWHlxZYcMQ5Ne8DSbyI4_Wf-zitBGE3I4mAEoG-SVgEF4-WOjIm_gm1X39axtWFkaf5zqSsojaoYGCR3a7Y05Ju8KYQWS7BiWF0NhVdzXaSE-yzn9jF6RIur8VGae1ppywLz4eh_BQQ4fAdKbjzSOL94c5svxLDqxnK32OkJBsoVhUfgNBgQcDriLM7ddvLYPaG6Qs-C1xk4lOlUGKvfkKER5WZVcWAJH9C5RIXTg5_7UjatXGxGXYnXV-I_hShKiqRNJkfV_6w
- User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36
- Sec-Ch-Ua: "Brave";v="135", "Not-A.Brand";v="8", "Chromium";v="135"
- Content-Type: application/json
- Sec-Ch-Ua-Mobile: ?0
- Accept: */*
- Sec-Gpc: 1
- Accept-Language: en-GB,en;q=0.8
- Origin: https://yourdai.app
- Sec-Fetch-Site: cross-site
- Sec-Fetch-Mode: cors
- Sec-Fetch-Dest: empty
- Referer: https://yourdai.app/
- Accept-Encoding: gzip, deflate, br, zstd
- Priority: u=1, i
- #015
- Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': True}
- Extracted token from Authorization header. Token: eyJhbGciOiJSUzI1NiIsImtpZCI6ImZlNjVjY2I4ZWFkMGJhZWY1ZmQzNjE5NWQ2NTI4YTA1NGZiYjc2ZjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgxMTEzOTMsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODExMTM5NywiZXhwIjoxNzQ4MTE0OTk3LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.AbUtl9lbkO8gvO-Wk6D_0PmuLEKr9ojj8X3cUN1PsW3Sz9wOsneNgzmx0z0b9J2YnHuWw8fi-lZYG_pf7mLMBBSpw9y3mHuAgQYK-jLG-WCZB2vhUP6v2mb-lCM85SzEiN6BkosJYYot5DtydKzABl1Sw5T54FGlPCsUODp8yX6Tl7FGZaPNECJtr4yJVajM_WRXrO9nflS99a-GqAEvi7mbM4NmsUX1MJZ3urAedRQC-xepwP29WVChAEIt-qZYxSmzfWJqjCU73hpReKSY8baZLBc7W9x6hzZEa6cm2qXruUbH3cQjXSH-N7rwL4cuKst9tARhnoyE7ayD8K5ZyA
- Firebase not yet initialized, continuing...
- Firebase initialization failed: No valid credentials found
- Error connecting to Google Calendar: Firebase credentials not found in environment variables
- Received authentication request. Headers: Connection: upgrade
- Host: yourdai.be
- X-Real-Ip: 172.31.30.78
- X-Forwarded-For: 1.40.161.22, 172.31.30.78
- Content-Length: 242
- X-Forwarded-Proto: https
- X-Forwarded-Port: 443
- X-Amzn-Trace-Id: Root=1-68321027-21100ec8331062540915c1f0
- Sec-Ch-Ua-Platform: "Android"
- Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImZlNjVjY2I4ZWFkMGJhZWY1ZmQzNjE5NWQ2NTI4YTA1NGZiYjc2ZjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgxMTEzOTMsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODExMTM5NywiZXhwIjoxNzQ4MTE0OTk3LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.AbUtl9lbkO8gvO-Wk6D_0PmuLEKr9ojj8X3cUN1PsW3Sz9wOsneNgzmx0z0b9J2YnHuWw8fi-lZYG_pf7mLMBBSpw9y3mHuAgQYK-jLG-WCZB2vhUP6v2mb-lCM85SzEiN6BkosJYYot5DtydKzABl1Sw5T54FGlPCsUODp8yX6Tl7FGZaPNECJtr4yJVajM_WRXrO9nflS99a-GqAEvi7mbM4NmsUX1MJZ3urAedRQC-xepwP29WVChAEIt-qZYxSmzfWJqjCU73hpReKSY8baZLBc7W9x6hzZEa6cm2qXruUbH3cQjXSH-N7rwL4cuKst9tARhnoyE7ayD8K5ZyA
- User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36
- Sec-Ch-Ua: "Brave";v="135", "Not-A.Brand";v="8", "Chromium";v="135"
- Content-Type: application/json
- Sec-Ch-Ua-Mobile: ?1
- Accept: */*
- Sec-Gpc: 1
- Accept-Language: en-GB,en;q=0.8
- Origin: https://yourdai.app
- Sec-Fetch-Site: cross-site
- Sec-Fetch-Mode: cors
- Sec-Fetch-Dest: empty
- Referer: https://yourdai.app/
- Accept-Encoding: gzip, deflate, br, zstd
- Priority: u=1, i
- #015
- Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': True}
- DEBUG - FULL TOKEN: eyJhbGciOiJSUzI1NiIsImtpZCI6ImZlNjVjY2I4ZWFkMGJhZWY1ZmQzNjE5NWQ2NTI4YTA1NGZiYjc2ZjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgxMTEzOTMsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODExMTM5OCwiZXhwIjoxNzQ4MTE0OTk4LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.MmNek7Ve2ICH71zT82frDJTIOlxknh6MMNW8WGWRptzNbNQ4TrZ2LSydy9vsd7gPd1LzrdfdgvZqkzZexc6Phz01eDXS0qUBa97xGHnrvcfZO5PgHLQuHJyqzpPEyK86nUAemrTDvfDKUHrCgvz-ZdmVol09JmoHVtVJSrMWbEKkQ71_j4eRWu5bk4d5U583BTg0Gs2kT2Wx7N4RODNNTXYTtlAD4KKmbCUgr85YRHR1Ot1t4zppmQRF6PaoJN5B2mYmhHE2MIniDpZUfFyAPNprCGwApezxK8WsDlp0yNPIgJwQ8rfndoKjaTfgvL5R2kZaId7e9QrS4c4fe4gdiw
- Traceback (most recent call last):
-  File "/var/app/current/backend/apis/calendar_routes.py", line 206, in get_calendar_events
-    print(f"DEBUG - Request body: {request.json}")
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 561, in json
-    return self.get_json()
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 607, in get_json
-    return self.on_json_loading_failed(None)
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/flask/wrappers.py", line 130, in on_json_loading_failed
-    return super().on_json_loading_failed(e)
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 650, in on_json_loading_failed
-    raise UnsupportedMediaType(
- werkzeug.exceptions.UnsupportedMediaType: 415 Unsupported Media Type: Did not attempt to load JSON data because the request Content-Type was not 'application/json'.

## Current Progress
- Firebase authentication implementation:
  - Modified initialize_firebase() function to use FIREBASE_JSON environment variable
  - Set up FIREBASE_JSON in Elastic Beanstalk as a reference to AWS Secrets Manager
  - Implemented fallback mechanisms in case the primary method fails


## Requirements
- Keep asking any necessary clarifying questions until you are confident you have full context
- Diagnose root cause
- Propose a fix following @dev-guide.md implementation principles