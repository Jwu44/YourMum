# Status: To Do
I am facing a bug where event_bus service is not adding google calendar events added on google calendar in real time. Instead I have to manually refresh the page which causes duplicate calendar event tasks.

# Steps to reproduce:
1. have an existing schedule on /dashboard for today
2. add a new calendar event on google calendar
3. bug: return to /dashboard, see that the newly added google calendar event doesn't appear
4. bug: reloading the page shows the newly added google caelndar event, but also duplicates any google calendar events that have already been pulled today

e.g. as seen in the image tasks "cold reach" and "cook steak" are google calendar tasks for today:
- originally, "cold reach" was already synced to today's schedule and I just added "cook steak" to my google calendar
- but after the page refresh the task "cold reach" has doubled up as "cold reach" originally existed and now it's being refetched again upon page refresh

# Expected behaviour:
- adding a calendar event on google calendar, should sync to /dashboard in real time without page reload
- syncing a real time google calendar event should check if the task already exists via its text or id to avoid duplicates

