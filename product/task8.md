# TASK-08: Google calendar sync pulls tomorrow's events
Status: To do

## Bug
I am facing a bug where after google sso, I land on /dashboard and google calendar events have been fetched, I see that google calendar events for the next day are being fetched too.

## Steps to reproduce:
1. sign in via google sso
2. provide calendar access
3. land on /dashboard
4. Bug: dashboard shows google calendar events for today and tomorrow


## Expected behaviour: dashboard should only be fetching google calendar events for the currently viewed date. 

## Example
- today is 17th July and the only task i have is a "haircut" on my google calendar
- also i have these 2 tasks tomorrow on the 18th July on my google calendar: laundry, gym
- i sihould only see "haircut" as the synced google calendar event for todya

## Resources
### Console logs

### Network requests