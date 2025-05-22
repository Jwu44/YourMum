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

## Issue Investigation
- Firebase authentication failing with "default credentials not found" error
- Root cause identified: AWS Parameter Store credentials not properly loaded in backend
- IAM setup verified:
  - Created custom policy "YourdAIParameterStoreAccess" with proper permissions:
    - Actions: ssm:GetParameter, ssm:GetParameters
    - Resource: arn:aws:ssm:us-east-1:055242619423:parameter/yourdai/firebase-credentials
  - Policy attached to both EC2 instance roles:
    - aws-elasticbeanstalk-ec2-role
    - aws-elasticbeanstalk-service-role

- Original implementation was overly complex with multiple fallback mechanisms
- Simplified Firebase authentication implementation proposed with cleaner error handling

## Latest Logs (May 22)
```
May 22 11:46:35 ip-172-31-18-173 web[572642]: Extracted token from Authorization header. Token length: 1142
May 22 11:46:59 ip-172-31-18-173 web[572642]: Request body: Token verification error: Your default credentials were not found. To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc for more information.
May 22 11:47:00 ip-172-31-18-173 web[572642]: Token verification error: Your default credentials were not found. To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc for more information.
```

## Next Steps
1. Verify the parameter exists in Parameter Store with exact path: /yourdai/firebase-credentials
2. Confirm EC2 instance has proper permissions by:
   - Testing AWS CLI command from instance: `aws ssm get-parameter --name "/yourdai/firebase-credentials" --with-decryption`
3. Implement simplified authentication approach
4. Add additional logging to trace exactly where the credential retrieval is failing

## Acceptance Criteria
- After a user signs in via Google SSO, ask for access to Google Calendar
- If they allow, then create a connection to Google Calendar MCP server
  - Gather all events and tasks the user has for the current day
      - Create them as task objects
      - Create a schedule using these task objects
      - Store the schedule in MongoDB against the user for the current day
- If user clicks 'don't allow', then user should also see their dashboard page with an empty schedule
- Instead of continuing to the current onboarding flow, take user directly to the dashboard page
