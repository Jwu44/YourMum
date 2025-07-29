# TASK-16: Implement account deletion function
Status: To do

## Problem
Users need the ability to delete their account from our database

## Requirements
- Clicking CTA: "Delete" in the settings page should hard delete the user, essentially removing them from mongodb and log them out
- Verification and Authorization - Confirm the user’s identity before allowing deletion.
- Data Deletion Scope:
    - Delete all user-related personal data from:
        - mongodb
        - connected services and integrations
        - logs
- After deletion, ensure the user:
    - logged out and redirected to "/" home route
    - can always re sign up
