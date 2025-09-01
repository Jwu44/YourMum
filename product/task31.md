# Task: Implement First-Time User Onboarding Tour

As a new user opening YourMum for the first time,
I want to be guided through the main features using a step-by-step interactive tour,
So that I can quickly understand how to use key functions and feel confident navigating YourMum.

## Acceptance Criteria:
- The tour launches automatically on first use and can be skipped at any time.
- Each step highlights a relevant UI element with a callout and concise explanation.
- Navigation buttons ("Next", "Close") are clearly visible and accessible.
- My position in the tour (e.g., "1 of 3") is always visible so I know how many steps remain.
- Theoverlay does not block essential functionality, allowing me to see and understand the interface beneath.
- All instructions use clear, jargon-free language and are easy to follow.
- The tour exits gracefully, allowing me to begin working.
- Once the tour is dismissed or closed, user should not be able to bring it back up

## Components Breakdown
- Highlight/Overlay: A translucent overlay that dims the background, focusing the user’s attention on the active step.
- Callout Tooltip/Modal:
    - Central content box with a short title (“Pick the right tool for the job”) and message text.
    Tooltip positioned contextually near the highlighted UI element (using an arrow/pointer) to visually link the instructions to the feature being taught.

Pointer/Arrow Indicator: An arrow or pointer graphic that connects the callout box directly to the feature or button in question for extra clarity.

Step Indicator: A progress counter within the callout/modal (“3 of 5”), showing the user’s current step in the tour.

Navigation Controls:

Next Button: Distinct primary button (prominent color, e.g., orange) to move forward in the tour.

Close Button: Subdued secondary button to exit/cancel the tour at any time.

Exit Control (X Icon): Clickable close (‘X’) icon at the top right of the callout/modal to dismiss the tour immediately.

Content Area:

Title (simple, bold for emphasis).

Descriptive text (clear, concise, emphasizes action or learning).

Optional asset/thumbnail preview when explaining tool-specific features.

Sample UI Structure (Pseudocode)
jsx
<TourOverlay>
  <HighlightElement targetSelector=".toolbar-icon-prototype" />
  <CalloutBox>
    <Title>Pick the right tool for the job</Title>
    <Pointer targetSelector=".toolbar-icon-prototype" />
    <Description>
      Along with simple slide tools, you can run a poll, embed a prototype, and add assets for some extra oomph.
    </Description>
    <StepIndicator>3 of 5</StepIndicator>
    <CloseIcon />
    <Actions>
      <Button variant="secondary">Close</Button>
      <Button variant="primary">Next</Button>
    </Actions>
  </CalloutBox>
</TourOverlay>
TourOverlay: Provides background dimming and modal container.

HighlightElement: Highlights or outlines the feature/button being explained.

CalloutBox: Contains instruction text, step controls, and navigation.

Pointer: Visually links the callout to the relevant UI component.

StepIndicator: Shows progress.

Actions: Next and Close buttons, clearly styled for visibility and accessibility.

Implementation Tips
Ensure that the overlay and callout/modal are focus-trapped and keyboard-navigable for accessibility.

Callout positioning should dynamically adjust to avoid overflowing screen edges and should anchor to the feature being explained.

Use a component-based approach (React/Vue/etc.) for reuse and easy tour step management.

Step data (text, target selectors, titles) can be stored as JSON or in code for flexibility.