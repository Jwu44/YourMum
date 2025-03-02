[ ] Debug error: "Access to fetch at 'https://yourdai.be/api/auth/user' from origin 'https://yourdai.app' has been blocked by CORS policy: Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response."

Steps to replicate:
1. Click "get started" on home page
2. Go through google sso flow
3. After successful sign in user is redirected to /work-times
4. Bug: Access https://yourdai.be/api/auth/user to create and store user

Expected outcome: 
- api should be accessible, not blocked by cars
- user is created and stored in the "users" table in mongodb

Notes:
- From network tab: {googleId: "Si3NryNNjSMbW8q1t0niKX8sYng1", email: "justin.wu4444@gmail.com", displayName: "Justin Wu",…}
displayName
: 
"Justin Wu"
email
: 
"justin.wu4444@gmail.com"
googleId
: 
"Si3NryNNjSMbW8q1t0niKX8sYng1"
hasCalendarAccess
: 
false
photoURL
: 
"https://lh3.googleusercontent.com/a/ACg8ocL0LSvlk8wllunIei33pP_1Cce4t4DyHmlBrTaL1LNVYyKaU68FiA=s96-c"
<!-- [ ] Debug api error: "23-f5bbdcf417f3555b.js:1 API request timed out after 10 seconds"
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
- no inbound or outbound points configured on aws -->
