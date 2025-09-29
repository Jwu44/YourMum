## 📘 Summary

### Automation Goal

Enable YourMum users to action natural-language tasks (e.g., “reply to Will on Slack”, “set up a meeting at 3pm”) with a single click of the purple pickaxe button, after connecting once to integrations like Google Calendar, Slack, and Gmail.

### Core UX Flow

1. User clicks **Connect** on an integration → completes OAuth (per user).
2. User creates a **natural-language task** in YourMum.
3. On pickaxe click:
   * **Classifier**?: NLP + LLM maps `task.text` → `{ action, entities, payload }`.
   * **Router**: maps the action to a sub-workflow (Slack, Gmail, Calendar).
   * **Executor**: invokes the n8n sub-workflow with the user’s short-lived token.
   * **Result handler**: returns normalized JSON with a resource link (e.g. Slack permalink, Gmail draft URL, Calendar htmlLink).
4. UI updates task row with success/failure state and link.

### Middleware – n8n Orchestrator

* Single shared workflow for all users, triggered by **Webhook**.
* Flow:
  * Webhook (POST, Bearer/HMAC auth, respond after execution)
  * Function (validate payload, parse tokens, set correlationId)
  * Classifier? (rules + LLM fallback → action schema)
  * Switch node → sub-workflows (Slack, Gmail, Calendar)
  * Sub-workflows call APIs with user tokens, return `{ success, link, error }`
  * Respond to Webhook with result JSON.
* Scales to 100+ users; YourMum backend manages token refresh/storage.

### Auth & Credentials

* OAuth per user, refresh tokens stored server-side (MongoDB, encrypted, rotated).
* YourMum exchanges refresh tokens → short-lived access tokens → sent to n8n.
* n8n never stores user credentials; it consumes what YourMum supplies.
* Google OAuth app verification required for >100 users.

### Example Request (YourMum → n8n Webhook)

```http
POST https://yourmum.app.n8n.cloud/webhook/pickaxe
Authorization: Bearer <SECRET>
Content-Type: application/json

{
  "userId": "123",
  "taskId": "456",
  "taskText": "Draft email reply to Will",
  "userTz": "Australia/Sydney",
  "accessToken": "ya29.a0AR..." 
}
```

## Note: I am having trouble with understanding what input data i should parse into the initial webhook. Because I want to provide the absolute minimum data for the agent to perform the action. But because the metatdata associatd with each integration scales exponentially, it could be too much. 

### Example Response (n8n → YourMum)

```json
{
  "success": true,
  "link": "https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&draft=xyz123",
  "error": null
}
```