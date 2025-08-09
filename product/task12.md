# Status: To Do
I am facing a bug where after completing slack oauth, it seems like Slack is not integrated with my app

# Steps to reproduce:
1. go to /integrations page
2. click "Connect" on @SlackIntegrationCard
3. click "Allow" on oauth page
4. see "Success" screen
5. Bug: going back to /integrations, I see error toast "Oauth window closed" + Slack Integration Card UI has not updated where status is not connected 


# Expected behaviour:
After seeing the success screen and being taken back to /integrations, I should not see an error toast and the Slack Integration Card UI should be updated to say connected

# Resources
## Backend server logs
100.64.0.2 - - [08/Aug/2025 08:04:51] "GET /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:04:52] "GET /api/calendar/events?date=2025-08-08&timezone=Australia/Sydney HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:04:59] "OPTIONS /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:04:59] "GET /api/calendar/status/Si3NryNNjSMbW8q1t0niKX8sYng1 HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:05:00] "GET /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:05:03] "OPTIONS /api/integrations/slack/auth/connect HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:05:04] "GET /api/integrations/slack/auth/connect HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:05:13] "GET /api/integrations/slack/auth/callback?code=9322480861478.9323225529526.be1d4a69022982ea886b3da6985a0a21b225b5c2edf5840624f9c459e6423c09&state=U2kzTnJ5Tk5qU01iVzhxMXQwbmlLWDhzWW5nMToxNzU0NjQwMzA0OmFiOGJkNjFkLTBiNmItNGVmMi04NTFlLWMwYzE2ZTdkZThhZQ HTTP/1.1" 302 -

100.64.0.2 - - [08/Aug/2025 08:05:16] "OPTIONS /api/auth/user HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:05:16] "OPTIONS /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:05:17] "GET /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.2 - - [08/Aug/2025 08:05:17] "POST /api/auth/user HTTP/1.1" 200 -

100.64.0.3 - - [08/Aug/2025 08:05:21] "GET /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.3 - - [08/Aug/2025 08:05:22] "GET /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.3 - - [08/Aug/2025 08:05:23] "GET /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.4 - - [08/Aug/2025 08:05:35] "OPTIONS /api/integrations/slack/status HTTP/1.1" 200 -

100.64.0.4 - - [08/Aug/2025 08:05:36] "GET /api/integrations/slack/status HTTP/1.1" 200 -

## Network requests
- After seeing success screen: https://yourdai-production.up.railway.app/api/integrations/slack/status: {"connected":false,"error":"object dict can't be used in 'await' expression"}