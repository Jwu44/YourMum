# TASK-15: Implement Log out function
Status: To do

## Problem
Authenticated users need a way to log out

## Requirements
- Clicking CTA: "Log out" in the settings page should log the user out by:
    - Session Invalidation on Logout: The logout action must fully terminate the user's session server-side, invalidating all relevant session tokens or cookies, to ensure that no authenticated resources remain accessible.
    - Redirect After Logout: After logout, authenticated users must be redirected to the home page on "/" route, ensuring no sensitive resources are accessible via browser navigation or URL manipulation.
    - No Sensitive Data Caching: The application must send restrictive caching headers (e.g., Cache-Control: no-store, Pragma: no-cache) to prevent browsers from caching sensitive information or session identifiers