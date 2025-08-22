# User Story: Add 3rd party app logos to tasks sourced from those apps

## Story
**As a** user with a 3rd party app connection (Google Calendar, Slack)
**I want to** see the 3rd party app logo in the task row if that task was sourced from that 3rd party app
**So that** I can easily identify where the task came from

## Background
Currently Google Calendar and Slack tasks get converted silently which may surprise users and they don't stand out from regular tasks.

## Requirements
- Given a task has been sourced from either Google Calendar or Slack, then display that logo in the task row
- Logo is positioned 16px from the right of the checkbox and 8px from the left of the task text
- Logo is 16px by 16px
- Logo should show regardless if start/end time is available
- Logog should show on default and hover state
- Logo should NOT show when editing the task in @TaskEditDrawer