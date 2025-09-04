I am facing a bug where I am required to go through google sso twice.

# Preconditions before reproducing:
- Existing user who is logged out
- No google calendar connection
- No schedule for today

# Steps to reproduce:
1. Complete google sso and give gcal access via https://yourmum-cc74b.firebaseapp.com
2. See loading page 
3. Bug: Redirected back to google sso again and give gcal access via https://yourmum-production.up.railway.app
4. Taken to /dashboard

# Expected behaviour:
- after completing google sso and giving gcal access via https://yourmum-cc74b.firebaseapp.com, user should not have to go through google sso again and give gcal access the 2nd time
