# TASK-04: 
Status: To do

## Bug
After completing google sso and selecting google calendar scope, user's google calendar events are not syncing. This might be due to the model context protocol connection I'm trying to setup with google calendar?

## Browser logs
Sign in successful: Justin Wu (justin.wu4444@gmail.com)
Has calendar access: true
Waiting for auth state to stabilize before connecting to Google Calendar...
Connecting to Google Calendar...
Token obtained: true
POST https://yourdai.be/api/calendar/connect 500 (Internal Server Error)
Error connecting to calendar: Error: Failed to connect calendar: {"error":"Failed to connect to Google Calendar: Document failed validation, full error: {'index': 0, 'code': 121, 'errmsg': 'Document failed validation', 'errInfo': {'failingDocumentId': ObjectId('67c43aa2748088a1d7d9b585'), 'details': {'operatorName': '$jsonSchema', 'schemaRulesNotSatisfied': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'calendar', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'lastSyncTime', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': ['date', 'null']}, 'reason': 'type did not match', 'consideredValue': '2025-05-25T03:34:48.784285+00:00', 'consideredType': 'string'}]}, {'propertyName': 'credentials', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'expiresAt', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': 'date'}, 'reason': 'type did not match', 'consideredValue': 1748147687933, 'consideredType': 'long'}]}]}]}]}]}]}]}}}","success":false}


## EC2 instance logs
- #015
- Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c', 'hasCalendarAccess': True}
- Received authentication request. Headers: Traceback (most recent call last):
-  File "/var/app/current/backend/apis/calendar_routes.py", line 140, in connect_google_calendar
-    result = users.update_one(
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/collection.py", line 1086, in update_one
-    self._update_retryable(
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/collection.py", line 881, in _update_retryable
-    return self.__database.client._retryable_write(
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/mongo_client.py", line 1523, in _retryable_write
-    return self._retry_with_session(retryable, func, s, bulk)
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/mongo_client.py", line 1421, in _retry_with_session
-    return self._retry_internal(
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/_csot.py", line 107, in csot_wrapper
-    return func(self, *args, **kwargs)
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/mongo_client.py", line 1453, in _retry_internal
-    return _ClientConnectionRetryable(
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/mongo_client.py", line 2315, in run
-    return self._read() if self._is_read else self._write()
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/mongo_client.py", line 2423, in _write
-    return self._func(self._session, conn, self._retryable)  # type: ignore
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/collection.py", line 862, in _update
-    return self._update(
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/collection.py", line 825, in _update
-    _check_write_command_response(result)
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/helpers.py", line 266, in _check_write_command_response
-    _raise_last_write_error(write_errors)
-  File "/var/app/venv/staging-LQM1lest/lib64/python3.9/site-packages/pymongo/helpers.py", line 239, in _raise_last_write_error
-    raise WriteError(error.get("errmsg"), error.get("code"), error)
- pymongo.errors.WriteError: Document failed validation, full error: {'index': 0, 'code': 121, 'errmsg': 'Document failed validation', 'errInfo': {'failingDocumentId': ObjectId('67c43aa2748088a1d7d9b585'), 'details': {'operatorName': '$jsonSchema', 'schemaRulesNotSatisfied': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'calendar', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'lastSyncTime', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': ['date', 'null']}, 'reason': 'type did not match', 'consideredValue': '2025-05-25T03:34:48.784285+00:00', 'consideredType': 'string'}]}, {'propertyName': 'credentials', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'expiresAt', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': 'date'}, 'reason': 'type did not match', 'consideredValue': 1748147687933, 'consideredType': 'long'}]}]}]}]}]}]}]}}}
- Connection: upgrade
- Host: yourdai.be
- X-Real-Ip: 172.31.30.78
- X-Forwarded-For: 1.40.161.22, 172.31.30.78
- Content-Length: 242
- X-Forwarded-Proto: https
- X-Forwarded-Port: 443
- X-Amzn-Trace-Id: Root=1-68328fc0-500b2a0274c9374d42a50974
- Sec-Ch-Ua-Platform: "Android"
- Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImZlNjVjY2I4ZWFkMGJhZWY1ZmQzNjE5NWQ2NTI4YTA1NGZiYjc2ZjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgxMTQ3NDMsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODE0MTI5NiwiZXhwIjoxNzQ4MTQ0ODk2LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.a7zQtZp3-vXZl2Ecc-L0bcFIIYxmdexfO2vq_cwOMrjecw5eSbNff8v9LQWevRDdCpL2WdlWPyZXzrcIpyV_oLkuz7psMB9s-MpV6p3GspevuTniG2vULkH9iKHRN3o5L6ZeiXKTD0dxZBZ_qM2OrCAg4K0D8bj1uwamoBlt9Wupv7dZLtAsSK5_jxseoUv61ZuXplz7k-T7F8KX8eQT1l64Uo9wjXRcIXqqEl5y7eq9_cjc_d303zTi9OTdBzKNXfS4aCcyf1rDiJ7CV1NeIfp7qNWP84wJlzNZj8LPW_MpDaDQRpFh7D8NDATWtZFPbBux6675hYBvBDWnRRMJdQ
- User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36
- Sec-Ch-Ua: "Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"
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
- Extracted token from Authorization header. Token: eyJhbGciOiJSUzI1NiIsImtpZCI6ImZlNjVjY2I4ZWFkMGJhZWY1ZmQzNjE5NWQ2NTI4YTA1NGZiYjc2ZjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NDgxNDQwODUsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc0ODE0NDA4OCwiZXhwIjoxNzQ4MTQ3Njg4LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.GaI6B8nhgROK06rglCKBjkjE9ACr5fOS2epw7ht20XmDrk8C-FOgnq2twVfG0Rbgs6fwQrLdQJ-QJs92SZgq1JTBf2r0mG33lAu0IuoXVJ1cBYWrNabAwzTj99jhjpQ9FtutUA95asDSZF2lJjEmW5W5j3v2uY8XT107Jit_-BsOft_O7gED61Z6rKMgXxemp64Ll977fgVNTVUXuywa-4K86OOzhhuyVrEJ955AsQNi8iNrXecahAOppkdDm2JF-JbXriFS3nFwBaX94WareRIVpgRurTBqqk8NtyRSRlbObV5Hr1gMGzH8Krn7ez8Q0ikfB2YlR3dpiMZcWPjVQg
- DEBUG - Attempting to verify token with Firebase
- DEBUG - Firebase apps initialized: {'[DEFAULT]': <firebase_admin.App object at 0x7f51007bfa30>}
- DEBUG - Token verification successful. User ID: Si3NryNNjSMbW8q1t0niKX8sYng1
- Error connecting to Google Calendar: Document failed validation, full error: {'index': 0, 'code': 121, 'errmsg': 'Document failed validation', 'errInfo': {'failingDocumentId': ObjectId('67c43aa2748088a1d7d9b585'), 'details': {'operatorName': '$jsonSchema', 'schemaRulesNotSatisfied': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'calendar', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'lastSyncTime', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': ['date', 'null']}, 'reason': 'type did not match', 'consideredValue': '2025-05-25T03:34:48.784285+00:00', 'consideredType': 'string'}]}, {'propertyName': 'credentials', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'expiresAt', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': 'date'}, 'reason': 'type did not match', 'consideredValue': 1748147687933, 'consideredType': 'long'}]}]}]}]}]}]}]}}}
- Received authentication request. Headers: Connection: upgrade

## Requirements
- Keep asking any necessary clarifying questions until you are confident you have full context
- Diagnose root cause
- Propose a fix following @dev-guide.md implementation principles