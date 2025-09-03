User Story — Dedicated Loading Page (Lottie)

As a YourMum user
I want a dedicated loading page that shows a Lottie animation + text
So that I clearly know the app is doing work during longer operations (Google Calendar connect, schedule generation), without UI flicker or partial content.

Scope & Triggers

Shown during:

- Connecting to Google Calendar

- Auto-generating the daily schedule

Behavior: Navigates to a full /loading page that replaces the entire app view.

Dismissal: Auto-navigates back to the target page only when:

the operation is finished, and

the target content has rendered, and

≥ 1.5s have elapsed since arriving at /loading.

Fallback: If the Lottie fails, show existing spinner + “Loading…”. For quick refreshes / between-page hops, keep using the existing inline spinner (do not route to /loading).

Acceptance Criteria (updated)
AC1 — Route-based loading

Given any of the three trigger flows start

When the app detects a “long” operation

Then the router navigates to /loading (full page; no scroll; dark-mode friendly).

AC2 — Lottie + text

Given the /loading page is displayed

When the Lottie file loads

Then center the attached Lottie and show the text “testing” beneath it (looping).

AC3 — Minimum page time

Given the /loading page is shown

When the operation completes in < 1.5s

Then keep the page visible until 1.5s total has elapsed, then navigate onward.

AC4 — Content-ready gate

Given the target route has data

And its first render/mount completes (e.g., a “ready” signal/hook fires)

Then /loading redirects to that route (smoothly, no flash of empty content).

AC5 — Fallback & quick hops

If Lottie fails to load, /loading shows spinner + “Loading…”.

If a route change resolves in < ~600ms, skip /loading entirely and use inline spinner only (no navigation).

AC6 — Reusability

A small API (e.g., beginWork(reason) → endWork(reason)) allows any module to send the user to /loading and bring them back ( calendar connect, schedule gen). Reasons: 'calendar' | 'schedule'.

AC7 — Accessibility

Page has role="status", aria-live="polite".

Title updates to “Loading… • YourMum”.

Keyboard focus remains stable (no trap loops).

AC8 — Performance

Lottie JSON lazy-loads on first visit; cached thereafter.

No hydration warnings with Next.js; timers cleared on unmount.