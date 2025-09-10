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
  File "/usr/local/lib/python3.11/site-packages/firebase_admin/_token_gen.py", line 392, in verify
    verified_claims = google.oauth2.id_token.verify_token(
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/google/oauth2/id_token.py", line 150, in verify_token
    return jwt.decode(
           ^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/google/auth/jwt.py", line 302, in decode
    _verify_iat_and_exp(payload, clock_skew_in_seconds)
  File "/usr/local/lib/python3.11/site-packages/google/auth/jwt.py", line 228, in _verify_iat_and_exp
    raise exceptions.InvalidValue("Token expired, {} < {}".format(latest, now))
google.auth.exceptions.InvalidValue: Token expired, 1757404227 < 1757404430
During handling of the above exception, another exception occurred:
Traceback (most recent call last):
  File "/app/backend/utils/auth.py", line 75, in verify_firebase_token
    return auth.verify_id_token(token)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/firebase_admin/auth.py", line 220, in verify_id_token
    return client.verify_id_token(id_token, check_revoked=check_revoked)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/firebase_admin/_auth_client.py", line 127, in verify_id_token
    verified_claims = self._token_verifier.verify_id_token(id_token)
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/site-packages/firebase_admin/_token_gen.py", line 293, in verify_id_token
    return self.id_token_verifier.verify(id_token, self.request)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
