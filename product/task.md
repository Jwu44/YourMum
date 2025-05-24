# TASK-02: Google calendar integration via mcp server
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
- Firebase authentication failing with \"default credentials not found\" error
- Root cause identified: AWS Parameter Store credentials not properly loaded in backend
- IAM setup verified:
  - Created custom policy \"YourdAIParameterStoreAccess\" with proper permissions:
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

## May 23 latest logs
May 23 10:48:16 ip-172-31-18-173 web[630833]: Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': True}
May 23 10:48:16 ip-172-31-18-173 web[630833]: Extracted token from Authorization header. Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDc5OTcyOTEsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0Nzk5NzI5NSwiZXhwIjoxNzQ4MDAwODk1LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.hoLIcP2GNgEoqZ-SSHxsvh-w_s9uUUOCs4mGZug6md752seKleJ3q803QjBcZv5cR5_NCdMeyCE-THYxxhQBAmwl3v_SY65b9L209e-Qf81P5FXsQlxEy0k-ZBfmAmvjxccKEBwR_L8THJ9o3lGvhn3VHq2wirSzF-trEoHFs_d2AJPjTS88mF-UX4V289JbjjDE9pcWJAJ2Hau0T33kqyAo5o4eVzT__Z8ExepZI_CeDOQ0c2gHE6PO1tKt1RbhiylVDG_I8P80_x3AD3P1nnJ7DcXf5Dn96K5MFvSUYNqkS32KI5B947qEC55nVRqFOqz1DusixhYiapFpPuAW6g
May 23 10:48:16 ip-172-31-18-173 web[630833]: Traceback (most recent call last):
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/current/backend/apis/calendar_routes.py", line 91, in get_user_id_from_token
May 23 10:48:16 ip-172-31-18-173 web[630833]:    decoded_token = auth.verify_id_token(token)
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/auth.py", line 219, in verify_id_token
May 23 10:48:16 ip-172-31-18-173 web[630833]:    client = _get_client(app)
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/auth.py", line 171, in _get_client
May 23 10:48:16 ip-172-31-18-173 web[630833]:    return _utils.get_app_service(app, _AUTH_ATTRIBUTE, Client)
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/_utils.py", line 98, in get_app_service
May 23 10:48:16 ip-172-31-18-173 web[630833]:    return app._get_service(name, initializer) # pylint: disable=protected-access
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/__init__.py", line 295, in _get_service
May 23 10:48:16 ip-172-31-18-173 web[630833]:    self._services[name] = initializer(self)
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/_auth_client.py", line 34, in __init__
May 23 10:48:16 ip-172-31-18-173 web[630833]:    if not app.project_id:
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/__init__.py", line 241, in project_id
May 23 10:48:16 ip-172-31-18-173 web[630833]:    self._project_id = self._lookup_project_id()
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/__init__.py", line 259, in _lookup_project_id
May 23 10:48:16 ip-172-31-18-173 web[630833]:    project_id = self._credential.project_id
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/credentials.py", line 154, in project_id
May 23 10:48:16 ip-172-31-18-173 web[630833]:    self._load_credential()
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/firebase_admin/credentials.py", line 159, in _load_credential
May 23 10:48:16 ip-172-31-18-173 web[630833]:    self._g_credential, self._project_id = google.auth.default(scopes=_scopes)
May 23 10:48:16 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/google/auth/_default.py", line 685, in default
May 23 10:48:16 ip-172-31-18-173 web[630833]:    raise exceptions.DefaultCredentialsError(_CLOUD_SDK_MISSING_CREDENTIALS)
May 23 10:48:16 ip-172-31-18-173 web[630833]: google.auth.exceptions.DefaultCredentialsError: Your default credentials were not found. To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc for more information.
May 23 10:48:18 ip-172-31-18-173 web[630833]: Traceback (most recent call last):
May 23 10:48:18 ip-172-31-18-173 web[630833]:  File "/var/app/current/backend/apis/calendar_routes.py", line 209, in get_calendar_events
May 23 10:48:18 ip-172-31-18-173 web[630833]:    print(f"DEBUG - Request body: {request.json}")
May 23 10:48:18 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 561, in json
May 23 10:48:18 ip-172-31-18-173 web[630833]:    return self.get_json()
May 23 10:48:18 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 607, in get_json
May 23 10:48:18 ip-172-31-18-173 web[630833]:    return self.on_json_loading_failed(None)
May 23 10:48:18 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/flask/wrappers.py", line 130, in on_json_loading_failed
May 23 10:48:18 ip-172-31-18-173 web[630833]:    return super().on_json_loading_failed(e)
May 23 10:48:18 ip-172-31-18-173 web[630833]:  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/werkzeug/wrappers/request.py", line 650, in on_json_loading_failed
May 23 10:48:18 ip-172-31-18-173 web[630833]:    raise UnsupportedMediaType(
May 23 10:48:18 ip-172-31-18-173 web[630833]: werkzeug.exceptions.UnsupportedMediaType: 415 Unsupported Media Type: Did not attempt to load JSON data because the request Content-Type was not 'application/json'.

## Acceptance Criteria
- After a user signs in via Google SSO, ask for access to Google Calendar
- If they allow, then create a connection to Google Calendar MCP server
  - Gather all events and tasks the user has for the current day
      - Create them as task objects
      - Create a schedule using these task objects
      - Store the schedule in MongoDB against the user for the current day
- If user clicks 'don't allow', then user should also see their dashboard page with an empty schedule
- Instead of continuing to the current onboarding flow, take user directly to the dashboard page