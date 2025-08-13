# Status: To Do
I am facing a bug where the event bus/sse stream permanently deletes incomplete google calendar events synced from a recent schedule using the autogenerate() function while unchecking previously complete google synced calendar events synced from today.

# Steps to reproduce:
1. Setup schedule for today using autogenerate(). E.g. in the first image, I have 7 tasks. note: sync gcal, test7, test 1 and boulder are google calendar events where the first 3 were synced from a recent schedule as they were incomplete but the task "boulder" was synced from today. notice how these tasks were marked as "complete"
2. on google calendar, create a new event for today to trigger the event bus/sse stream
3. Bug: observe /dashboard being overwritten. E.g. in the second image, now we have 5 tasks. note: sync gcal, test7 and test 1 have been deleted. but "boulder" still remains but it has now been unchekced
4. refresh the page and observe the schedule has been permanently overwritten


# Expected behaviour:
- adding new events on google calendar which triggers the event bus/sse stream should never delete any google calendar events synced from a recent schedule, even if they have been completed
- adding new events on google calendar which triggers the event bus/sse stream should never overrwrite the state of synced google calendar events, their state (complete/incomplete) should remain as is
- adding new events on google calendar should just add them as tasks on /dashboard.
