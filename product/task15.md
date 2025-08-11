# Status: To Do
I am facing a bug where I am unable to disconnect from google calendar.

# Steps to reproduce:
1. Ensure google calendar is currently connected to yourdai
2. Go to /integrations
3. Find google calendar card and click "Disconnect" button
4. Bug: unable to disconnect


# Expected behaviour:
- When I click the "Disconnect" button on the google calendar card, it should trigger /disconnect endpoint and disconnect the user's google calendar from yourdai
- Card UI should be updated to enable a reconnection

# Resources
## Backend server logs
100.64.0.6 - - [11/Aug/2025 00:56:14] "POST /api/calendar/disconnect HTTP/1.1" 500 -

100.64.0.6 - - [11/Aug/2025 00:56:23] "OPTIONS /api/calendar/disconnect HTTP/1.1" 200 -

Traceback (most recent call last):

  File "/app/backend/apis/calendar_routes.py", line 346, in disconnect_google_calendar

    result = users.update_one(

             ^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/collection.py", line 1086, in update_one

    self._update_retryable(

  File "/usr/local/lib/python3.11/site-packages/pymongo/collection.py", line 881, in _update_retryable

    return self.__database.client._retryable_write(

           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/mongo_client.py", line 1523, in _retryable_write

    return self._retry_with_session(retryable, func, s, bulk)

           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/mongo_client.py", line 1421, in _retry_with_session

    return self._retry_internal(

           ^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/_csot.py", line 107, in csot_wrapper

    return func(self, *args, **kwargs)

           ^^^^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/mongo_client.py", line 1462, in _retry_internal

    ).run()

      ^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/mongo_client.py", line 2315, in run

    return self._read() if self._is_read else self._write()

                                              ^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/mongo_client.py", line 2423, in _write

    return self._func(self._session, conn, self._retryable)  # type: ignore

           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/collection.py", line 862, in _update

    return self._update(

           ^^^^^^^^^^^^^

  File "/usr/local/lib/python3.11/site-packages/pymongo/collection.py", line 825, in _update

    _check_write_command_response(result)

  File "/usr/local/lib/python3.11/site-packages/pymongo/helpers.py", line 266, in _check_write_command_response

    _raise_last_write_error(write_errors)

  File "/usr/local/lib/python3.11/site-packages/pymongo/helpers.py", line 239, in _raise_last_write_error

    raise WriteError(error.get("errmsg"), error.get("code"), error)

pymongo.errors.WriteError: Document failed validation, full error: {'index': 0, 'code': 121, 'errmsg': 'Document failed validation', 'errInfo': {'failingDocumentId': ObjectId('67c43aa2748088a1d7d9b585'), 'details': {'operatorName': '$jsonSchema', 'schemaRulesNotSatisfied': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'calendar', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'syncStatus', 'details': [{'operatorName': 'enum', 'specifiedAs': {'enum': ['never', 'in_progress', 'completed', 'failed']}, 'reason': 'value was not found in enum', 'consideredValue': 'disconnected'}]}, {'propertyName': 'credentials', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': 'object'}, 'reason': 'type did not match', 'consideredValue': None, 'consideredType': 'null'}]}]}]}]}]}}}

## Console logs
Failed to load resource: the server responded with a status of 500 ()
117-dca654ed10df48e0.js:1 Calendar disconnection failed: Error: Failed to disconnect from Google Calendar: Document failed validation, full error: {'index': 0, 'code': 121, 'errmsg': 'Document failed validation', 'errInfo': {'failingDocumentId': ObjectId('67c43aa2748088a1d7d9b585'), 'details': {'operatorName': '$jsonSchema', 'schemaRulesNotSatisfied': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'calendar', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'syncStatus', 'details': [{'operatorName': 'enum', 'specifiedAs': {'enum': ['never', 'in_progress', 'completed', 'failed']}, 'reason': 'value was not found in enum', 'consideredValue': 'disconnected'}]}, {'propertyName': 'credentials', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': 'object'}, 'reason': 'type did not match', 'consideredValue': None, 'consideredType': 'null'}]}]}]}]}]}}}
    at Object.disconnectCalendar (581-cd4432544f76df4d.js:1:8951)

## Network request response
{"error":"Failed to disconnect from Google Calendar: Document failed validation, full error: {'index': 0, 'code': 121, 'errmsg': 'Document failed validation', 'errInfo': {'failingDocumentId': ObjectId('67c43aa2748088a1d7d9b585'), 'details': {'operatorName': '$jsonSchema', 'schemaRulesNotSatisfied': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'calendar', 'details': [{'operatorName': 'properties', 'propertiesNotSatisfied': [{'propertyName': 'syncStatus', 'details': [{'operatorName': 'enum', 'specifiedAs': {'enum': ['never', 'in_progress', 'completed', 'failed']}, 'reason': 'value was not found in enum', 'consideredValue': 'disconnected'}]}, {'propertyName': 'credentials', 'details': [{'operatorName': 'bsonType', 'specifiedAs': {'bsonType': 'object'}, 'reason': 'type did not match', 'consideredValue': None, 'consideredType': 'null'}]}]}]}]}]}}}","success":false}
s