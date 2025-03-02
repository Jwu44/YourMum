[ ] Debug api error: "23-f5bbdcf417f3555b.js:1 API request timed out after 10 seconds"
- Affected API: @https://yourdai.be/api/auth/user
Steps to replicate:
1. Click "get started" on home page
2. Go through google sso flow
3. After successful sign in user is redirected to /work-times
4. Bug: Try to access https://yourdai.be/api/auth/user to create and store user

Expected outcome: 
- api should be accessible and not time out
- user is created and stored in the "users" table in mongodb

Notes:
- the backend api: https://yourdai.be is accessible and works
- backend api is hosted on amazon route 53
- no inbound or outbound points configured on aws

