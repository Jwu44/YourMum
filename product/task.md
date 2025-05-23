# USER-002: Google calendar integration via mcp server
Status: In Progress

## Current Progress
- Backend API routes have been created in backend/apis/calendar_routes.py:
  - `/api/calendar/connect` (POST): Connect user to Google Calendar after authorization
  - `/api/calendar/events` (GET): Fetch user's calendar events for a specific date
- MCP server configuration exists in mcp.json with the server URL
- Frontend implementation:
  - Fixed import for GoogleAuthProvider in AuthContext.tsx
  - Updated calendar.ts to correctly import auth from '@/auth/firebase'
  - Refactored dashboard.tsx to use calendarApi.fetchEvents() which automatically handles auth
  - Modified fetchEvents to use a simplified API signature with just date parameter
- Firebase authentication implementation:
  - Modified initialize_firebase() function to use FIREBASE_JSON environment variable
  - Set up FIREBASE_JSON in Elastic Beanstalk as a reference to AWS Secrets Manager
  - Implemented fallback mechanisms in case the primary method fails

## Issue Investigation
- Firebase authentication failing with "default credentials not found" error
- Root cause identified: AWS Parameter Store credentials not properly loaded in backend
- IAM setup verified:
  - Created custom policy "YourdAIParameterStoreAccess" with proper permissions:
    - Actions: ssm:GetParameter, ssm:GetParameters
    - Resource: arn:aws:ssm:us-east-1:055242619423:parameter/yourdai/firebase-credentials
  - Policy attached to both EC2 instance roles:
    - aws-elasticbeanstalk-ec2-role
    - aws-elasticbeanstalk-service-role
- Additional IAM permissions needed:
  - The Elastic Beanstalk instance profile requires `secretsmanager:GetSecretValue` and `kms:Decrypt` permissions
  - Warning notification observed in Elastic Beanstalk console about instance profile permissions for secrets

- Original implementation was overly complex with multiple fallback mechanisms
- Simplified Firebase authentication implementation proposed with cleaner error handling

## Latest Logs (May 23)
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/current/backend/apis/calendar_routes.py", line 90, in get_user_id_from_token
May 23 09:43:02 ip-172-31-18-173 web[627051]:    decoded_token = auth.verify_id_token(token)
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/auth.py", line 219, in verify_id_token
May 23 09:43:02 ip-172-31-18-173 web[627051]:    client = _get_client(app)
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/auth.py", line 171, in _get_client
May 23 09:43:02 ip-172-31-18-173 web[627051]:    return _utils.get_app_service(app, _AUTH_ATTRIBUTE, Client)
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/_utils.py", line 98, in get_app_service
May 23 09:43:02 ip-172-31-18-173 web[627051]:    return app._get_service(name, initializer) # pylint: disable=protected-access
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/__init__.py", line 295, in _get_service
May 23 09:43:02 ip-172-31-18-173 web[627051]:    self._services[name] = initializer(self)
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/_auth_client.py", line 34, in __init__
May 23 09:43:02 ip-172-31-18-173 web[627051]:    if not app.project_id:
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/__init__.py", line 241, in project_id
May 23 09:43:02 ip-172-31-18-173 web[627051]:    self._project_id = self._lookup_project_id()
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/__init__.py", line 259, in _lookup_project_id
May 23 09:43:02 ip-172-31-18-173 web[627051]:    project_id = self._credential.project_id
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/credentials.py", line 154, in project_id
May 23 09:43:02 ip-172-31-18-173 web[627051]:    self._load_credential()
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/credentials.py", line 159, in _load_credential
May 23 09:43:02 ip-172-31-18-173 web[627051]:    self._g_credential, self._project_id = google.auth.default(scopes=_scopes)
May 23 09:43:02 ip-172-31-18-173 web[627051]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/google/auth/_default.py", line 685, in default
May 23 09:43:02 ip-172-31-18-173 web[627051]:    raise exceptions.DefaultCredentialsError(_CLOUD_SDK_MISSING_CREDENTIALS)
May 23 09:43:02 ip-172-31-18-173 web[627051]: google.auth.exceptions.DefaultCredentialsError: Your default credentials were not found. To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc for more information.
Warning: Using default credentials. Error: [Errno 2] No such file or directory: 'path/to/serviceAccountKey.json'
Successfully connected to MongoDB
Successfully connected to MongoDB database: YourDaiSchedule
AI suggestions collection initialized successfully
Users collection initialized successfully
Calendar collections initialized successfully
Database initialized successfully
Received authentication request. Headers: Connection: upgrade
Host: yourdai.be
X-Real-Ip: 172.31.74.157
X-Forwarded-For: 1.144.106.168, 172.31.74.157
Content-Length: 242
X-Forwarded-Proto: https
X-Forwarded-Port: 443
X-Amzn-Trace-Id: Root=1-683042d5-7378698b54d43b5c07cc7ace
Sec-Ch-Ua-Platform: "Android"
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDc5NTM5OTgsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0Nzk5MzI5OSwiZXhwIjoxNzQ3OTk2ODk5LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.Cr-ec7VSJqt2zr3kJIYh46GA-QBXeDhOsGMOgGhA5qv3xzjLm4L7f4VOAk0Kv1cE3TmZPu6KpKJIEl6lkzjSt9kSsOrSvfPKeEqzCjgG_MPuO_iG8P2EuEyPjjMKQVPzsTBUGFmtloqdM-yKDPmzTA26n_TdJ-QEAIUlBfEwl2C58sCAPZAWFtQ2DAyjZW5r2HOfY_TJTj6zzJD6uiKbbAosjyZG0QwTETi5rTS2xgu5OfBkl_nEC-9ZUsvaUkToGrPctEOdV9lEvNhBFSj47GNOfvcvjwk77Ou_ZrsNYw2Lh6VBreaWXjs2jJCO6imyY8zWna9HAy77bylvVUCIxw
User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36
Sec-Ch-Ua: "Brave";v="135", "Not-A.Brand";v="8", "Chromium";v="135"
Content-Type: application/json
Sec-Ch-Ua-Mobile: ?1
Accept: */*
Sec-Gpc: 1
Accept-Language: en-GB,en;q=0.8
Origin: https://yourdai.app
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://yourdai.app/
Accept-Encoding: gzip, deflate, br, zstd
Priority: u=1, i
#015
Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': True}
Extracted token from Authorization header. Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDc5OTMzNzcsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0Nzk5MzM4MCwiZXhwIjoxNzQ3OTk2OTgwLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.O8-B28FVAsbmPI-77rW9FgVMj7nA3oebjmFt0frkk6XrTWdwk8Wh7pE1YRRauvLqTzeQpDSj3ez3ll8v84a1VB8mhgYIsbK9BG13tQqiERExqq2YiCmOezF3ZQOsyibE4zHznkNodyDTjlJFzDsPAjiTcd085Lw3GOjtDsaf8i-MTvqPtCbx8_ILFk5c6nsjjLZcSTdhnH8qgesWvAL35lzLYM3OiPwdiJNLimIQf73pfwtiYy9KtRtb7Q-2LNWXiZ63g6ZzMm_e2enRlU9HtfVH3UR0v9ERtnq3M4iFBb1Pqaued1Hsu6sVHL8Vn5etiMCVlwpKpJi62-o5cERJRw
DEBUG - Attempting to verify token with Firebase
DEBUG - Firebase apps initialized: {'[DEFAULT]': <firebase_admin.App object at 0x7fb3f81c49a0>}
DEBUG - Token verification error: Your default credentials were not found. To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc for more information.
DEBUG - Exception type: DefaultCredentialsError
Received authentication request. Headers: Connection: upgrade
Host: yourdai.be
X-Real-Ip: 172.31.74.157
X-Forwarded-For: 1.144.106.168, 172.31.74.157
Content-Length: 242
X-Forwarded-Proto: https
X-Forwarded-Port: 443
X-Amzn-Trace-Id: Root=1-68304328-5f6ec9181e2c255d3e257690
Sec-Ch-Ua-Platform: "Android"
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDc5OTMzNzcsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0Nzk5MzM4MCwiZXhwIjoxNzQ3OTk2OTgwLCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.O8-B28FVAsbmPI-77rW9FgVMj7nA3oebjmFt0frkk6XrTWdwk8Wh7pE1YRRauvLqTzeQpDSj3ez3ll8v84a1VB8mhgYIsbK9BG13tQqiERExqq2YiCmOezF3ZQOsyibE4zHznkNodyDTjlJFzDsPAjiTcd085Lw3GOjtDsaf8i-MTvqPtCbx8_ILFk5c6nsjjLZcSTdhnH8qgesWvAL35lzLYM3OiPwdiJNLimIQf73pfwtiYy9KtRtb7Q-2LNWXiZ63g6ZzMm_e2enRlU9HtfVH3UR0v9ERtnq3M4iFBb1Pqaued1Hsu6sVHL8Vn5etiMCVlwpKpJi62-o5cERJRw
User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36
Sec-Ch-Ua: "Brave";v="135", "Not-A.Brand";v="8", "Chromium";v="135"
Content-Type: application/json
Sec-Ch-Ua-Mobile: ?1
Accept: */*
Sec-Gpc: 1
Accept-Language: en-GB,en;q=0.8
Origin: https://yourdai.app
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://yourdai.app/
Accept-Encoding: gzip, deflate, br, zstd
Priority: u=1, i
#015
Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': True}
DEBUG - FULL TOKEN: eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDc5OTMzNzcsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0Nzk5MzM4NCwiZXhwIjoxNzQ3OTk2OTg0LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.COeaKMwtkdTcPMTzcqcz3Zfw1NBiY_xDTdnOiOMjqiVo_Fgd6YnlL6-vVi3NuCVLSA3pVSyTqyTkeR20ClQZ1wxgqDhUpA1XrygXMY8dIvTmW-fUMQalAtifNGMUQHIPnuKgKASEASQY_Dqe3pQErzdzPSUKcvmChzfyAFQOMB14OyOrBDx3-Gdy5B6eRFPY5rjlZb8f7fwfSl0mMpajOB-myKrKgRqRx4pQ243uWJw5zUiTuiVSPlfnKJCdVuCmEgULUr3bO67dPA8Jf-D9SwBzUMjCSViZylVhkmaQdezFdxDzshE-EuqF8K7t20ujWdx8kPEH0wAWqaUfMQA20g
Traceback (most recent call last):
 File "/var/app/current/backend/apis/calendar_routes.py", line 208, in get_calendar_events
   print(f"DEBUG - Request body: {request.json}")
 File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 561, in json
   return self.get_json()
 File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 607, in get_json
   return self.on_json_loading_failed(None)
 File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/flask/wrappers.py", line 130, in on_json_loading_failed
   return super().on_json_loading_failed(e)
 File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 650, in on_json_loading_failed
   raise UnsupportedMediaType(
werkzeug.exceptions.UnsupportedMediaType: 415 Unsupported Media Type: Did not attempt to load JSON data because the request Content-Type was not 'application/json'.

## Logs from frontend console
Sign in successful: Justin Wu (justin.wu4444@gmail.com)
Has calendar access: true
Waiting for auth state to stabilize before connecting to Google Calendar...
Connecting to Google Calendar...
Token obtained: true
POST https://yourdai.be/api/calendar/connect 401 (Unauthorized)
Error connecting to calendar: Error: Failed to connect calendar: {"error":"Invalid or missing authentication token","success":false}
Error connecting to calendar: Error: Failed to connect calendar: {"error":"Invalid or missing authentication token","success":false}
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
Setting currentDate: Fri May 23 2025 19:43:04 GMT+1000 (Australian Eastern Standard Time)
RouteGuard State: {user: ee, loading: false, pathname: '/dashboard', isPublicPath: false, inAuthFlow: false, …}
User endpoint status: 200
User stored successfully: {message: 'User successfully created/updated', user: {…}}
GET https://yourdai.be/api/calendar/events?date=2025-05-23 500 (Internal Server Error)Authentication completed successfully


## Acceptance Criteria
- After a user signs in via Google SSO, ask for access to Google Calendar
- If they allow, then create a connection to Google Calendar MCP server
  - Gather all events and tasks the user has for the current day
      - Create them as task objects
      - Create a schedule using these task objects
      - Store the schedule in MongoDB against the user for the current day
- If user clicks 'don't allow', then user should also see their dashboard page with an empty schedule
- Instead of continuing to the current onboarding flow, take user directly to the dashboard page