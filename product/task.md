[ ] Debug error: "tasks:1 Access to fetch at 'https://yourdai.be/categorize_task' from origin 'https://yourdai.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
203-ca82269436739dfa.js:1 
POST https://yourdai.be/categorize_task net::ERR_FAILED"

Steps to replicate:
1. Click "get started" on home page
2. Go through google sso flow
3. After successful sign in user is redirected to /work-times
4. Bug: user enters a task to categorize in /tasks

Expected outcome: 
- able to pass task for categorization
- api should be accessible
- task is created and categorised 
