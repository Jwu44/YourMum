# Status: To do
I am facing a bug where google calendar events are not syncing for today and tomorrow via the autogenerate function.

# Steps to reproduce:
1. For current date, go to /dashboard for the first time
2. Bug: autogenerate correctly pulls unfinished + recurring tasks, but google calendar tasks for the day are not synced
3. click right chevron arrow to generate next day
4. bug: autogenerate correctly pulls unfinished + recurring tasks, but google calendar tasks for the next day are not synced


# Expected behaviour:
- autogenerate should pull google calendar tasks for today, add them into today's schedule and render them

# Notes:
- after going to /dashboard for the first time, clicking on "Integrations" in @Appsidebar, takes me to /integrations page. I then see the calendar loader page pop up again and shows google calendar connection has been completed. I then go back to /dashboard and then see today's google calendar events synced. perhaps this means google calendar connection was not fully complete?

# Requirements:
- Map out current google calendar flow for syncing events
- Analyse the below logs and what's been described so far to diagnose root case (e.g. race condition)
- Propose a targetted fix

# Resources
## Backend server logs
Request body: {'googleId': 'Si3NryNNjSMbW8q1t0niKX8sYng1', 'email': 'justin.wu4444@gmail.com', 'displayName': 'Justin Wu', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c';, 'hasCalendarAccess': False}

DEBUG: Preserving existing calendar connection for user Si3NryNNjSMbW8q1t0niKX8sYng1

Found 2 recurring tasks for 2025-08-12

Found recent schedule with inputs from 2025-08-01

Received authentication request. Headers: Host: yourdai-production.up.railway.app

User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36

Content-Length: 243

Accept: */*

Accept-Encoding: gzip, deflate, br, zstd

Accept-Language: en-GB,en;q=0.7

Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ5NzYyNjUsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDk3NjI2NywiZXhwIjoxNzU0OTc5ODY3LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.uDkZjmWjgpUUSlJWtglbNOJuOH5VL-DFI9ETeeo8bch8qHmkoNTnz4KZAlpdFCcR_GCcjm44fylbct3rTPi0XIB1_HW86maIrsueSn_NCkN0AIPHvyyBDU1hedz-sz5GBh-Iu_3IskUb-EdYHdEwkOLpPY9zAQPBWI0_EJn1lUMClbW8sVkacnchEGVdEnxDvjJ5Fy_hCg_qhH4hHgAH1H3GfZknws2E8kWTC2WbpVrWPLFqUwyetcAYQoKhH2kwMDPGhmGZwchtRig5R-6hQtltmXkQ8he0cEdYe7_1X2vN0LPd_Dun3XbyRmQnvDH4efnLrkq45QtXxhQdobI3zg

Content-Type: application/json

100.64.0.2 - - [12/Aug/2025 05:24:28] "OPTIONS /api/schedules/autogenerate HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:28] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:29] "OPTIONS /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:30] "POST /api/calendar/connect HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:31] "GET /api/schedules/2025-08-12 HTTP/1.1" 404 -

100.64.0.2 - - [12/Aug/2025 05:24:35] "POST /api/schedules/autogenerate HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:39] "POST /api/schedules/autogenerate HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:45] "OPTIONS /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:45] "GET /api/calendar/status/Si3NryNNjSMbW8q1t0niKX8sYng1 HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:46] "GET /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:46] "OPTIONS /api/calendar/events?date=2025-08-12&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:50] "GET /api/calendar/events?date=2025-08-12&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:52] "GET /api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ5NzYyNjUsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDk3NjI4NiwiZXhwIjoxNzU0OTc5ODg2LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.alyc6zCNYadtPHemVv0d4WeeTdilVIWAuP2DFo9fERq7BdNxUd3B5P1OEZVgdrg86RzOZ9UKPYQDWm1I6h7DZ3NUu1IgBGzoDd2JY23N2cnNIrHlSuSSJ0vJbHohzuIPzGcznq2m7Fxu8vDFdG6qpT7GGqfLe6LiyOlcrOHOwNWyJJrX5Po1GRVN2Qkq55XULLtjo-yB7r_POqXJmI48qAAJl-PwWcaJcfZ7h_ZhODUFeDvmWC85GMyes71F6gHf7f5zjdA0W1OYg0TrlmDOhR4IL6YggqWmls2k1djnhh99NchdIgDfzOqc36FmTXB70V0RC6mku1QAAoQN58yGGA HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:52] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:52] "OPTIONS /api/schedules/2025-08-12 HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:52] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:24:52] "GET /api/schedules/2025-08-12 HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:25:16] "OPTIONS /api/schedules/2025-08-11 HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:25:16] "GET /api/schedules/2025-08-11 HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:25:17] "GET /api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ5NzYyNjUsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDk3NjMxNSwiZXhwIjoxNzU0OTc5OTE1LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.sz_bzKntdKm45SGIQoVMGL5hJmiRfsO835coyWCwUMUZE9zxTCs64QeGGave88YapIHVzI3ksyBd1tUDfcuvPWGAcBc_BzwACJO2v_OgAvDd8dvZV9JKr-sfvYUKSwX6RP-78cGRJNsvxyLeVJJuep_ZYvnrOqg__hPG7LGjUOR-hDelqwwxohed__de-7kOLQrPOkv70E8gGvnBSsZfZbGYh-I4kVEKknF9Xzk2UVe_zyNV6fwu8fdkGraIqzsLpqt51qzGdx5hZCLbt3kguHx1X7nn7zRDx9jn1D_S9anKHY_73lg-QUdY53xkNPVcGN6F36iCxzxiTckLCzMWzA HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:25:20] "GET /api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ5NzYyNjUsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDk3NjMxNSwiZXhwIjoxNzU0OTc5OTE1LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.sz_bzKntdKm45SGIQoVMGL5hJmiRfsO835coyWCwUMUZE9zxTCs64QeGGave88YapIHVzI3ksyBd1tUDfcuvPWGAcBc_BzwACJO2v_OgAvDd8dvZV9JKr-sfvYUKSwX6RP-78cGRJNsvxyLeVJJuep_ZYvnrOqg__hPG7LGjUOR-hDelqwwxohed__de-7kOLQrPOkv70E8gGvnBSsZfZbGYh-I4kVEKknF9Xzk2UVe_zyNV6fwu8fdkGraIqzsLpqt51qzGdx5hZCLbt3kguHx1X7nn7zRDx9jn1D_S9anKHY_73lg-QUdY53xkNPVcGN6F36iCxzxiTckLCzMWzA HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:25:22] "GET /api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ5NzYyNjUsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDk3NjMxNSwiZXhwIjoxNzU0OTc5OTE1LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.sz_bzKntdKm45SGIQoVMGL5hJmiRfsO835coyWCwUMUZE9zxTCs64QeGGave88YapIHVzI3ksyBd1tUDfcuvPWGAcBc_BzwACJO2v_OgAvDd8dvZV9JKr-sfvYUKSwX6RP-78cGRJNsvxyLeVJJuep_ZYvnrOqg__hPG7LGjUOR-hDelqwwxohed__de-7kOLQrPOkv70E8gGvnBSsZfZbGYh-I4kVEKknF9Xzk2UVe_zyNV6fwu8fdkGraIqzsLpqt51qzGdx5hZCLbt3kguHx1X7nn7zRDx9jn1D_S9anKHY_73lg-QUdY53xkNPVcGN6F36iCxzxiTckLCzMWzA HTTP/1.1" 200 -

100.64.0.2 - - [12/Aug/2025 05:25:24] "GET /api/events/stream?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJiN2JhZmIyZjEwY2FlMmIxZjA3ZjM4MTZjNTQyMmJlY2NhNWMyMjMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSnVzdGluIFd1IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0wwTFN2bGs4d2xsdW5JZWkzM3BQXzFDY2U0dDREeUhtbEJyVGFMMUxOVll5S2FVNjhGaUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cmRhaSIsImF1ZCI6InlvdXJkYWkiLCJhdXRoX3RpbWUiOjE3NTQ5NzYyNjUsInVzZXJfaWQiOiJTaTNOcnlOTmpTTWJXOHExdDBuaUtYOHNZbmcxIiwic3ViIjoiU2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMSIsImlhdCI6MTc1NDk3NjMxNSwiZXhwIjoxNzU0OTc5OTE1LCJlbWFpbCI6Imp1c3Rpbi53dTQ0NDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTMwMjY1MDI5MTE2OTg1ODM1NTQiXSwiZW1haWwiOlsianVzdGluLnd1NDQ0NEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.sz_bzKntdKm45SGIQoVMGL5hJmiRfsO835coyWCwUMUZE9zxTCs64QeGGave88YapIHVzI3ksyBd1tUDfcuvPWGAcBc_BzwACJO2v_OgAvDd8dvZV9JKr-sfvYUKSwX6RP-78cGRJNsvxyLeVJJuep_ZYvnrOqg__hPG7LGjUOR-hDelqwwxohed__de-7kOLQrPOkv70E8gGvnBSsZfZbGYh-I4kVEKknF9Xzk2UVe_zyNV6fwu8fdkGraIqzsLpqt51qzGdx5hZCLbt3kguHx1X7nn7zRDx9jn1D_S9anKHY_73lg-QUdY53xkNPVcGN6F36iCxzxiTckLCzMWzA HTTP/1.1" 200 -

## Browser Network requests
- https://yourdai-production.up.railway.app/api/schedules/2025-08-12: {"error":"No schedule found for this date","success":false}

- https://yourdai-production.up.railway.app/api/auth/user: {"message":"User successfully created/updated","user":{"_id":"67c43aa2748088a1d7d9b585","age":null,"calendar":{"connected":true,"credentials":{"accessToken":"[REDACTED]","expiresAt":"Mon, 11 Aug 2025 09:45:35 GMT","scopes":["https://www.googleapis.com/auth/calendar.events.readonly","https://www.googleapis.com/auth/calendar.readonly","https://www.googleapis.com/auth/userinfo.email","https://www.googleapis.com/auth/userinfo.profile","openid"]},"error":null,"lastSyncTime":"2025-08-11T08:45:35.796000","settings":{"autoSync":true,"defaultReminders":true,"syncFrequency":15},"syncStatus":"completed","watch":{"channelId":"02186485-d359-4bb1-a949-d5c60c97a578","expiration":"Mon, 18 Aug 2025 08:00:06 GMT","resourceId":"TDuu7H3WBsxIHUFsvF_3VBXqp9I","token":"5748e26c-ba33-45aa-aaee-a50ffd2f16ae"}},"calendarSynced":true,"createdAt":"2025-03-02T11:01:54.766000","displayName":"Justin Wu","email":"justin.wu4444@gmail.com","googleId":"Si3NryNNjSMbW8q1t0niKX8sYng1","jobTitle":null,"lastLogin":"2025-08-12T05:20:59.910000","metadata":{"lastModified":"2025-08-12T05:20:59.910000"},"photoURL":"https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c","role":"free","slack":{"connected":true,"connectedAt":"Tue, 05 Aug 2025 09:20:35 GMT","instanceId":"5dd87456-c0bc-4f4a-aa3f-75ffe8631e09","lastSyncTime":"Tue, 05 Aug 2025 09:20:35 GMT","oauthUrl":"https://api.klavis.ai/oauth/slack/authorize?instance_id=5dd87456-c0bc-4f4a-aa3f-75ffe8631e09","serverUrl":"https://slack-mcp-server.klavis.ai/mcp/?instance_id=5dd87456-c0bc-4f4a-aa3f-75ffe8631e09"},"slack_integration":{"access_token":null,"bot_token":"Z0FBQUFBQm9sdm1kTVFFWkdMU2h3WkVYaXdMWWE2NkZESzlLSV9GRE9ubWhmWHNVSERnMUNya25FZUpuY1RJeDExOXFoT1o2SHB4dmxsTGtmWWdWcjFPdV9kRkRZemdyUThrTGJXZ0NnT2ZzMlBsZmVxRmlkQVBWNmthZUthX09WbXY4TjNkM1plblAzNnRPY2FlRE50V3VOdDBHNU8xNnZ3PT0=","bot_user_id":"U099MK0G4H2","channels_joined":[],"connected_at":"2025-08-09T07:32:45.335571","last_event_at":null,"slack_user_id":"U099GE4SF8W","slack_username":"Unknown User","team_id":"T099GE4RBE2","workspace_id":"T099GE4RBE2","workspace_name":"YourMum"},"timezone":"UTC"}}

- https://yourdai-production.up.railway.app/api/schedules/autogenerate: {"created":true,"date":"2025-08-12","existed":false,"metadata":{"calendarEvents":6,"generatedAt":"2025-08-12T05:21:07.350860+00:00","lastModified":"2025-08-12T05:21:07.350876+00:00","recurringTasks":2,"source":"manual","totalTasks":10},"schedule":[{"categories":["Work"],"completed":false,"end_time":null,"from_gcal":true,"gcal_event_id":"15en56dhnt1vqpdl5naibbpqb2","id":"8c589ab2-8bd8-48f3-8db0-17bb2c1e3f40","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":5,"start_date":"2025-08-12","start_time":null,"text":"test 2","type":"task"},{"categories":["Work"],"completed":false,"end_time":null,"from_gcal":true,"gcal_event_id":"4lvlg1glio2tn09vn00bev0f57","id":"e0a36709-6531-4d75-ab83-f2089806045e","is_recurring":null,"is_section":false,"is_subtask":true,"level":1,"parent_id":"017f1631-cf70-414b-bba7-7c49b6033e79","section":null,"section_index":1,"start_date":"2025-08-12","start_time":null,"text":"test 5","type":"task"},{"categories":["Work"],"completed":false,"end_time":null,"from_gcal":true,"gcal_event_id":"6bm3f13sdj1nb607snqt3a56t3","id":"8b1375a6-579b-4d02-88d0-61b671ce5ed3","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-12","start_time":null,"text":"test3","type":"task"},{"categories":["Work"],"completed":false,"end_time":null,"from_gcal":true,"gcal_event_id":"0ask2qnmlva079e2vk0td3g35m","id":"d259a480-c3d5-48fb-8fd1-3a9bacba241f","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":0,"start_date":"2025-08-12","start_time":null,"text":"test4","type":"task"},{"categories":["Fun"],"completed":false,"end_time":"11:00","from_gcal":true,"gcal_event_id":"9ma6ru5gld1go6l41fi06608ac","id":"aa05aac4-5d34-4e6e-b708-e3ad914adcfe","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":3,"start_date":"2025-08-12","start_time":"10:00","text":"yum ch","type":"task"},{"categories":["Exercise"],"completed":false,"end_time":"18:30","from_gcal":true,"gcal_event_id":"s4qml9j34aric2d5fjstjbsj5e_20250811T070000Z","id":"61736b61-3c56-4ddd-8b81-87cebb904a03","is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":4,"start_date":"2025-08-12","start_time":"17:00","text":"\ud83c\udfcb\ufe0fgym push v1","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"d405f018-6b4a-4f84-bdf6-9f7d7eebd5bd","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":1,"start_date":"2025-08-12","start_time":"","text":"gym","type":"task"},{"categories":[],"completed":false,"end_time":"","id":"b3a55008-c823-440f-ab6b-adf6347da700","is_recurring":{"dayOfWeek":"Monday","frequency":"daily"},"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":2,"start_date":"2025-08-12","start_time":"","text":"read fountainhead","type":"task"},{"categories":[],"completed":false,"id":"0f4aa85b-ade8-4fff-98b7-23d850256ed2","is_microstep":false,"is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":6,"slack_metadata":{"channel_id":"C099GE54JA2","channel_name":"Unknown Channel","deep_link":"slack://channel?team=T099GE4RBE2&id=C099GE54JA2&message=1754873165.952049","event_ts":"1754873165.952049","message_url":"https://yourmum.slack.com/archives/C099GE54JA2/p1754873165952049","original_text":"<@U099GE4SF8W> check for bridgit email","sender_id":"U099GE4SF8W","sender_name":"justin.wu4444","thread_ts":null,"workspace_id":"T099GE4RBE2","workspace_name":"YourMum"},"source":"slack","start_date":"2025-08-12","text":"check for bridgit email","type":"task"},{"categories":[],"completed":false,"id":"5e2ffc96-7acc-45ac-97b4-c502351b8e37","is_microstep":false,"is_recurring":null,"is_section":false,"is_subtask":false,"level":0,"parent_id":null,"section":null,"section_index":7,"slack_metadata":{"channel_id":"C099GE54JA2","channel_name":"Unknown Channel","deep_link":"slack://channel?team=T099GE4RBE2&id=C099GE54JA2&message=1754896358.283709","event_ts":"1754896358.283709","message_url":"https://yourmum.slack.com/archives/C099GE54JA2/p1754896358283709","original_text":"<@U099GE4SF8W> ensure gcal uses webhook","sender_id":"U099GE4SF8W","sender_name":"Unknown User","thread_ts":null,"workspace_id":"T099GE4RBE2","workspace_name":"YourMum"},"source":"slack","start_date":"2025-08-12","text":"ensure gcal uses webhook","type":"task"}],"sourceFound":true,"success":true}
