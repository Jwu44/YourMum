User Story: Privacy Policy Page Implementation

Title: Implement Privacy Policy page with static content and public access

As a
new or existing user of YourMum,

I want
to view a clear Privacy Policy that outlines how my data is collected, used, shared, secured, and retained,

So that
I can understand my rights, trust the product, and comply with regulatory requirements (GDPR, CCPA, Australian Privacy Act).

Acceptance Criteria

Accessibility & Routing

/privacy route must be publicly accessible (no authentication required) and added to publicPaths in RouteGuard.tsx.

Page should not redirect unauthenticated users to / (home).

Include link to Privacy Policy in footer.

Layout & Styling

Use single-column, centered container (max-w-3xl, px-4, responsive spacing).

Typography follows prose style (e.g., Tailwind prose prose-neutral dark:prose-invert).

Headings hierarchy:

H1: “Privacy Policy”

Metadata (Effective Date, Last Updated) in muted small text.

H2: Numbered sections (1. Information We Collect … 8. Contact Us).

Lists styled with list-disc pl-6 space-y-2.

Content

Display the provided Privacy Policy copy exactly as specified:

Effective Date: September 2, 2025

Last Updated: September 2, 2025

Sections: Information We Collect, How We Use, Data Sharing, Data Security, Your Rights, Data Retention, Updates, Contact Us.

Ensure third-party providers listed (Google, Firebase, Stripe, Anthropic, MongoDB, Railway, Vercel) are formatted as bulleted list.

Integration with Current System

The account data categories (Google Auth info, calendar events, tasks, Stripe payments) must align with what is stored in backend from AuthContext.storeUserInBackend and schedule/task templates.

No API calls required—static page only.

Future-proofing: ensure footer links to /privacy and /terms.

Compliance

Clearly states no data is sold/rented.

Contact email: justin.yourmum4444@gmail.com.

Deletion timeline (30 days) included.