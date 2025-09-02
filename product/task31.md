# Task: Implement First-Time User Onboarding Tour

As a new user opening YourMum for the first time,
I want to be guided through the main features using a step-by-step interactive tour,
So that I can quickly understand how to use key functions and feel confident navigating YourMum.

## Acceptance Criteria:
- The tour launches automatically on first use and can be closed at any time.
- Each step highlights a relevant UI element with a callout and concise explanation.
- Navigation buttons ("Next", "Close") are clearly visible and accessible.
- My position in the tour (e.g., "1 of 3") is always visible so I know how many steps remain.
- The overlay does not block essential functionality, allowing me to see and understand the interface beneath.
- All instructions use clear, jargon-free language and are easy to follow.
- Once the tour is closed, user should not be able to bring it back up

## Components Breakdown
- Highlight/Overlay: A translucent overlay that dims the background, focusing the user’s attention on the active step.
- Callout content box:
    - title
    - divider
    - body text descriptive text (clear, concise, emphasizes action or learning).
    - step counter (e.g. 1 of 3)
    - CTA 1: Next 
- Content box is positioned contextually near the highlighted UI element using an pointed arrow to visually link the instructions to the feature being taught.

## Content for each step:
### Step 1
- page: /dashboard
- title: Add your first task
- divider:
- body text: Click the button to add your first task. Simply add the task name. YourMum can auto-categorise this task later and even assign times.
- step counter: 1 of 3
- CTA 1: Next
    - onClick should show step 2
- CTA 2: Back
    - onClick should show step 1
- close: dismisses entire interactive tour 
- position:
    - ignore auto layout
    - positioned below "+ Create Task button" 

### Step 2
- title: Fill out your preferences
- divider:
- body text: Provide details about your lifestyle and how you like to operate so YourMum can generate a personalised schedule for you.
- step counter: 2 of 3
- CTA 1: Next
    - onClick should open step 3
- CTA 2: Back
    - onClick should show step 2
- close: dismisses entire interactive tour 
- position:
    - ignore auto layout
    - positioned to the right of "Inputs" outside the Appsidebar
  
### Step 3
- title: Integrate with 3rd party apps
- divider:
- body text: Connect with other apps to allow YourMum to auto create tasks from those sources.
- step counter: 3 of 3
- CTA: Finish
    - dismisses interactive tour
- close: dismisses entire interactive tour 
- position:
    - ignore auto layout
    - positioned to the right of "Integrations" outside the Appsidebar  