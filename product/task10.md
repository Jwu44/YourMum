# TASK-10: Preserve Inputs Config
Status: To do

## Gap
I am facing a gap after providing my preferences in InputsConfig and click on the right chevron arrow to generate the next day schedule, my preferences aren't preserved for the next day.

## Steps to reproduce:
1. go to @InputsConfig
2. fill out Inputs Config
3. click "Save config"
4. see dashboard render schedule
5. click right chevron arrow to generate next day
6. bug: going to @InputsConfig shows the current day's inputs config, but in the backend this is not preserved. so when i refresh the page, the preserved inptus config are gone

## Expected behaviour: whenever inputsconfig is filled out or updated for a current day, then the user clicks the right chevron arrow to either create or nav to the next day, the next day's inputsconfig should have preserve the values as the current day

## Acceptance Criteria
### Scenario A: New user fills out inputs config and creates next day schedule
- As a new user, after I have filled out inputs config for today being the 23rd July and I see today's schedule updated after clicking "save config", if I click on the right chevron arrow to create tomorrow's schedule for the 24th July, then its inputs config should have the same values as today's. 
