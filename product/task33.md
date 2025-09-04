# Status: To Do
I am facing a bug where viewing the onboarding flow on mobile is hard to use.

# Pre conditions before steps reproduction
- first time user loading /dashboard

# Steps to reproduce:
1. first time user completes auth
2. loads /dashboard
3. bug #1: user on prod does not see onboarding flow as a fist time user 
3. bug #2: sees step 1 with weird UI (on local dev)
4. bug #3: sees step 2 with weird UI (on local dev)
5. bug #4: clicking on buttons in step 2 are unresponsive (on local dev)

# Current behaviour:
## bug 1: ✅ fixed
- first time prod user who loads /dashboard doesn't see the onboarding flow
- they just see their schedule for the day

## bug 2: ✅ fixed
- spotlight is taking too much space in step 1
- triangle arrow is on top of the spotlight
image.png

## bug 3: ✅ fixed
- spotlight does not highlight "inputs" button consistenly
- sometimes on page refresh it does but other times it doesn't
- triangle arrow is missing on tooltip
image.png

## bug 4: ✅ fixed
- clicking on "Next" or "Back" are unresponsive
- only clicking "X" closes the flow

# Expected behaviour:
## bug 1: ✅ fixed
- first time prod user should see onboarding flow 
- ensure it only shows once

## bug 2: ✅ fixed
- spotlight dynamic sizing should be smaller for step 1
- triangle arrow should be pointing to the spotlight without being on top of it

## bug 3: ✅ fixed
- spotlight should highlight "inputs" button all the time
- triangle arrow should show on the top side of the toolitp and point to the spotlight above

## bug 4:
- clicking on "Next" should take user to step 3 
    - ensure step 3 spotlight and tooltip UI is same as step 2
- clicking on "back" should take user to step 1