# Status: To Do
I am facing a bug where after google sso and providing gcal access and seeing "connecting to google calendar", the dashboard loads briefly, but them i am taken back to the google oauth page

# Preconditions 
- First time user
- Has completed google sso and given gcal access 

# Steps to reproduce:
1. Go through auth flow and grant gcal access
2. See the loading page "Connecting to google calendar..."
3. Sees dashboard
4. Bug: get taken back to google oauth page saying to "choose an account"

# Expected behaviour:
- Once google sso and gcal access have been provided, do not direct user back to google oauth page
- user should proceed to /dashboard and see the schedule rendered

# Backend server logs
Sec-Fetch-Mode: cors
Sec-Fetch-Site: cross-site
X-Forwarded-For: 202.161.74.115
X-Forwarded-Host: yourmum-production.up.railway.app
X-Forwarded-Proto: https
X-Railway-Edge: railway/asia-southeast1-eqsg3a
X-Railway-Request-Id: gbUi_3JZTHK2wKFX0ubPiw
X-Real-Ip: 202.161.74.115
X-Request-Start: 1758087732402

Received authentication request. Headers: Host: yourmum-production.up.railway.app
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
Content-Length: 235
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-AU,en;q=0.9
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjUwMDZlMjc5MTVhMTcwYWIyNmIxZWUzYjgxZDExNjU0MmYxMjRmMjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmFzZSBZIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0tpdENfTV9pZHFQWlBJUEJOQ2pvczhmR0kwN0l3RE9jbWlCZzRncFVVdklVZFZvZnJQSVE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cm11bS1jYzc0YiIsImF1ZCI6InlvdXJtdW0tY2M3NGIiLCJhdXRoX3RpbWUiOjE3NTgwODc2NDIsInVzZXJfaWQiOiJSUEdMcllQQXliWXU1WURYYk9WdFRIWEJWamcyIiwic3ViIjoiUlBHTHJZUEF5Yll1NVlEWGJPVnRUSFhCVmpnMiIsImlhdCI6MTc1ODA4NzY0NiwiZXhwIjoxNzU4MDkxMjQ2LCJlbWFpbCI6Imphc2VuODEwQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTEwNzExNTE5NzY2ODk3NzA1MTY1Il0sImVtYWlsIjpbImphc2VuODEwQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.UaKkcDpZ_FAZaQHzGx5UTh7BwPioWHUdwy5JvEfh8YAimXSQNb5Ede7nFXRXyzot1LAhhVsZS8nLzBbILTomg5Q_hM_a2F0Ny8h_YS5TKBKhs7XnLFhvh8M3bAsLL32hsfDVMMvLwy55WrkS6QqeNeXjkHoZmze4yqiZDE7kTdjqb9odjOuuPkADDkFNWK8MqieOYdQAdyi2X1YNaWmiw3OYo0C7A6MycGg2s_CDBL8B3Vvb0RuTrnYKOebPYrvGDVEDiE_ZaG-b3hH8oE-V2gAwnwp-F_tJ0MW7T4p5YlCno1yCdKApF7wIAIiF5OIVYD7bCGmckxGVqUwAewB6UQ
Content-Type: application/json
Origin: https://yourmum.app
Priority: u=1, i
Referer: https://yourmum.app/
Sec-Ch-Ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: cross-site
X-Forwarded-For: 202.161.74.115
X-Forwarded-Host: yourmum-production.up.railway.app
X-Forwarded-Proto: https
X-Railway-Edge: railway/asia-southeast1-eqsg3a
X-Railway-Request-Id: t_Z8EnoOT-OTFoTE0ubPiw
X-Real-Ip: 202.161.74.115
X-Request-Start: 1758087669750

Request body: {'googleId': 'RPGLrYPAybYu5YDXbOVtTHXBVjg2', 'email': 'jasen810@gmail.com', 'displayName': 'Jase Y', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocKitC_M_idqPZPIPBNCjos8fGI07IwDOcmiBg4gpUUvIUdVofrPIQ=s96-c', 'hasCalendarAccess': False}
DEBUG: Preserving existing calendar connection for user RPGLrYPAybYu5YDXbOVtTHXBVjg2
[TIMING] autogenerate_schedule started for date: 2025-09-17
[TIMING] Existing schedule check: 0.146s
[TIMING] Source schedule lookup (up to 30 days): 4.396s
[TIMING] autogenerate_schedule (no source found): 4.542s
Received authentication request. Headers: Host: yourmum-production.up.railway.app
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
Content-Length: 235
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-AU,en;q=0.9
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjUwMDZlMjc5MTVhMTcwYWIyNmIxZWUzYjgxZDExNjU0MmYxMjRmMjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmFzZSBZIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0tpdENfTV9pZHFQWlBJUEJOQ2pvczhmR0kwN0l3RE9jbWlCZzRncFVVdklVZFZvZnJQSVE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20veW91cm11bS1jYzc0YiIsImF1ZCI6InlvdXJtdW0tY2M3NGIiLCJhdXRoX3RpbWUiOjE3NTgwODc2NDIsInVzZXJfaWQiOiJSUEdMcllQQXliWXU1WURYYk9WdFRIWEJWamcyIiwic3ViIjoiUlBHTHJZUEF5Yll1NVlEWGJPVnRUSFhCVmpnMiIsImlhdCI6MTc1ODA4NzY0NiwiZXhwIjoxNzU4MDkxMjQ2LCJlbWFpbCI6Imphc2VuODEwQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTEwNzExNTE5NzY2ODk3NzA1MTY1Il0sImVtYWlsIjpbImphc2VuODEwQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.UaKkcDpZ_FAZaQHzGx5UTh7BwPioWHUdwy5JvEfh8YAimXSQNb5Ede7nFXRXyzot1LAhhVsZS8nLzBbILTomg5Q_hM_a2F0Ny8h_YS5TKBKhs7XnLFhvh8M3bAsLL32hsfDVMMvLwy55WrkS6QqeNeXjkHoZmze4yqiZDE7kTdjqb9odjOuuPkADDkFNWK8MqieOYdQAdyi2X1YNaWmiw3OYo0C7A6MycGg2s_CDBL8B3Vvb0RuTrnYKOebPYrvGDVEDiE_ZaG-b3hH8oE-V2gAwnwp-F_tJ0MW7T4p5YlCno1yCdKApF7wIAIiF5OIVYD7bCGmckxGVqUwAewB6UQ
Content-Type: application/json
Origin: https://yourmum.app
Priority: u=1, i
Referer: https://yourmum.app/
Sec-Ch-Ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: cross-site
X-Forwarded-For: 202.161.74.115
X-Forwarded-Host: yourmum-production.up.railway.app
X-Forwarded-Proto: https
X-Railway-Edge: railway/asia-southeast1-eqsg3a
X-Railway-Request-Id: gkff013FREO2GOzk0ubPiw
X-Real-Ip: 202.161.74.115
X-Request-Start: 1758087684093

Request body: {'googleId': 'RPGLrYPAybYu5YDXbOVtTHXBVjg2', 'email': 'jasen810@gmail.com', 'displayName': 'Jase Y', 'photoURL': 'https://lh3.googleusercontent.com/a/ACg8ocKitC_M_idqPZPIPBNCjos8fGI07IwDOcmiBg4gpUUvIUdVofrPIQ=s96-c', 'hasCalendarAccess': False}
DEBUG: Preserving existing calendar connection for user RPGLrYPAybYu5YDXbOVtTHXBVjg2
Received authentication request. Headers: Host: yourmum-production.up.railway.app
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Brave/1 Mobile/15E148 Safari/604.1

# user object
{"_id":{"$oid":"68ca49dec1d855206bf63323"},"googleId":"RPGLrYPAybYu5YDXbOVtTHXBVjg2","age":null,"calendar":{"connected":true,"lastSyncTime":null,"syncStatus":"never","selectedCalendars":[],"error":null,"settings":{"autoSync":true,"syncFrequency":{"$numberInt":"15"},"defaultReminders":true}},"calendarSynced":true,"createdAt":{"$date":{"$numberLong":"1758087646330"}},"displayName":"Jase Y","email":"jasen810@gmail.com","jobTitle":null,"lastLogin":{"$date":{"$numberLong":"1758088092631"}},"metadata":{"lastModified":{"$date":{"$numberLong":"1758088092631"}}},"photoURL":"https://lh3.googleusercontent.com/a/ACg8ocKitC_M_idqPZPIPBNCjos8fGI07IwDOcmiBg4gpUUvIUdVofrPIQ=s96-c","role":"free","timezone":"UTC"}