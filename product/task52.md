# Status: To Do
I am facing a bug where on production, users are unable to save their updated preferences against @FormContext and when they click CTA: "Save", I am not sure if a new schedule is even being generated because after loading, the same schedule is still being shown.

# Steps to reproduce:
1. As an existing user, go to /preferences
2. Make updates
3. Click CTA: "save"
4. notice that upon click, the preferneces are not saved and same schedule is still being shown


# Expected behaviour:
- any changes to preferences should be saved to the frontend
- clicking "save" should pass /preferences for schedule gen in @schedule_gen.py, then then the updated scheduled should be stored and displayed

# Resources
## Network requests
  File "/app/backend/services/schedule_service.py", line 139, in create_schedule_from_ai_generation
    result = self.schedules_collection.replace_one(
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/pymongo/collection.py", line 973, in replace_one
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
  File "/usr/local/lib/python3.11/site-packages/pymongo/collection.py", line 816, in _update
    result = conn.command(
             ^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/pymongo/helpers.py", line 322, in inner
    return func(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/pymongo/pool.py", line 996, in command
    self._raise_connection_failure(error)
  File "/usr/local/lib/python3.11/site-packages/pymongo/pool.py", line 968, in command
    return command(
           ^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/pymongo/network.py", line 151, in command
    request_id, msg, size, max_doc_size = message._op_msg(
                                          ^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/pymongo/message.py", line 762, in _op_msg
    return _op_msg_uncompressed(flags, command, identifier, docs, opts)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
bson.errors.InvalidDocument: cannot encode object: <backend.models.task.RecurrenceType object at 0x7fb24053fd90>, of type: <class 'backend.models.task.RecurrenceType'>
