# USER-002: Google calendar integration via mcp server
Status: In Progress

## Current Progress
- Backend API routes have been created in backend/apis/calendar_routes.py:
  - `/api/calendar/connect` (POST): Connect user to Google Calendar after authorization
  - `/api/calendar/events` (GET): Fetch user's calendar events for a specific date
- MCP server configuration exists in mcp.json with the server URL
- Frontend implementation:
  - Fixed import for GoogleAuthProvider in AuthContext.tsx
  - Updated calendar.ts to correctly import auth from '@/auth/firebase'
  - Refactored dashboard.tsx to use calendarApi.fetchEvents() which automatically handles auth
  - Modified fetchEvents to use a simplified API signature with just date parameter

## Requirements
- Issue identified: Firebase authentication failing with "default credentials not found" error
- Root cause: AWS Parameter Store credentials not properly loaded in backend
- Solution path:
  1. Store Firebase Credentials Securely - Save the Firebase service account JSON as a SecureString in AWS Systems Manager Parameter Store.
  2. Configure IAM Permissions - Ensure the Elastic Beanstalk EC2 instance role has ssm:GetParameter (and ssm:GetParameters) permission for the Parameter Store secret.
  3. Do Not Use Beanstalk Environment Variables for JSON - Avoid storing multi-line JSON in Elastic Beanstalk environment variables due to formatting issues.
  4. Retrieve Credentials at Runtime - Use the AWS SDK or AWS CLI in your application or deployment script to fetch the JSON from Parameter Store during runtime or deployment.
- example implementation:
  import boto3
  import json

  # Initialize the SSM client (optionally specify region_name)
  ssm = boto3.client('ssm')

  # Replace with your parameter name
  PARAM_NAME = '/myapp/firebase/credentials'

  # Fetch the parameter value with decryption (for SecureString)
  response = ssm.get_parameter(
      Name=PARAM_NAME,
      WithDecryption=True
  )

  # The parameter value is a string; parse as JSON if needed
  firebase_credentials = json.loads(response['Parameter']['Value'])



## Acceptance Criteria
- After a user signs in via Google SSO, ask for access to Google Calendar
- If they allow, then create a connection to Google Calendar MCP server
  - Gather all events and tasks the user has for the current day
      - Create them as task objects
      - Create a schedule using these task objects
      - Store the schedule in MongoDB against the user for the current day
- If user clicks 'don't allow', then user should also see their dashboard page with an empty schedule
- Instead of continuing to the current onboarding flow, take user directly to the dashboard page