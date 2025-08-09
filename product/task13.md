# Status: To Do
I am facing a bug where I have slack integrated into YourMum but when I receive a direct "@" mention in a channel with my name, I don't see a task being created in /dashboard

# Steps to reproduce:
1. Ensure slack is connected as seen in /integrations
2. In your slack workspace, get yourself or someone to "@" mention my name. Also tried to "@" mention the bot "YourMum" 
3. Bug: Message does not get converted into a task in /dashboard


# Expected behaviour:
- Whenver an "@" mention in a public or private channel, whether if that is "@everyone" or "@channel" or "@here" or "@username", this should trigger /webhook and have the message converted into a yourdai task

# Resources
## Backend server logs
100.64.0.5 - - [09/Aug/2025 05:18:29] "POST /api/integrations/slack/webhook HTTP/1.1" 200 -

100.64.0.8 - - [09/Aug/2025 05:18:34] "POST /api/integrations/slack/webhook HTTP/1.1" 200 -

100.64.0.8 - - [09/Aug/2025 05:18:35] "POST /api/integrations/slack/webhook HTTP/1.1" 200 -


# Notes
- Maybe it's because I am "@" mentioning myself?
- Maybe because I am the only user in this Slack Workspace?
- This Slack Workspace is also on a free trial