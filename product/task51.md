## 📘 Summary

### Automation Goal

Enable YourMum users to action natural-language tasks (e.g., “reply to Will on Slack”, “set up a meeting at 3pm”) with a single click of the purple pickaxe button, after connecting once to integrations like Google Calendar, Slack, and Gmail.

### Core UX Flow

1. User clicks **Connect** on an integration → completes OAuth (per user).
2. User creates a **natural-language task** in YourMum.
3. On pickaxe click:
  * **Main Orchestrator agent**: takes the auth token, analyses the nlp task and decides which subagent to delegate to
  * **Sub agent**: given auth token and nlp task, it will execute the nlp task. if more context is needed to execute the nlp task, it will call other GET tools.
  * **Result handler**: returns normalized JSON with a resource link (e.g. Slack permalink, Gmail draft URL, Calendar htmlLink).
4. UI updates task row with success/failure state and link.

### Middleware – n8n Orchestrator

* Single shared workflow for all users, triggered by **Webhook**.
* Flow:
  * Webhook (POST, Bearer/HMAC auth, respond after execution)
  * Main orchestrator agent to delegate to correct sub agent
  * Sub agent will execute task.text, it may perform other actions to fetch the right context like fetching the availabilities of the user and the attendees in google calendar
    * Upon success, return url with executed action e.g. if google calendar event created then return the calendar event url, if gmail message was drafted return link to draft etc. 
  * Respond to Webhook with result JSON.
* Scales to 100+ users; YourMum backend manages token refresh/storage.

### Auth & Credentials

* OAuth per user, refresh tokens stored server-side (MongoDB, encrypted, rotated).
* YourMum exchanges refresh tokens → sent to n8n.
* n8n never stores user credentials; it consumes what YourMum supplies.

### Example Request (YourMum → n8n Webhook)

```http
POST POST https://yourmum.app.n8n.cloud/webhook/yourmum-orchestrate
Authorization: Bearer <SECRET>
Content-Type: application/json

{
  "userId": "123",
  "taskId": "456",
  "taskText": "Draft email reply to Will",
  "accessToken": "ya29.a0AR..." 
}
```

### Example Response (n8n → YourMum)

```json
{
  "success": true,
  "link": "https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&draft=xyz123",
  "error": null
}

# Task 1

## 1. **App → n8n Webhook Contract**

* Your app must `POST` to the webhook URL (the Production URL, not the test one).
  Example:

  ```
  POST https://yourmum.app.n8n.cloud/webhook-test/yourmum-orchestrate
  ```
* Body format: JSON payload with at least:

  * `accessToken` → from user object (`user.calendar.credentials.accessToken`)
  * Optional: `refreshToken`, `expiresAt`, `timezone` if you want the workflow to handle refresh logic or scheduling logic.

📌 **Tip:** include a `correlationId` from your app for traceability.

---

## 2. **Authentication & Security**

* You already set **Webhook Trigger → Authentication: None**.
  This means:

  * Anyone who knows the webhook URL can hit it.
  * To lock it down, you need an **HMAC or bearer signature check** in the first Code node.

    * Your app should compute a signature (e.g. `HMAC-SHA256` of body + secret) and send in `Authorization` header.
    * n8n workflow validates and rejects if invalid.

⚠️ Right now, your uploaded workflow had a broken spread in that HMAC validation Code node — so you’ll need to fix that (return `{...body, validatedAt, ...}`).

---

## 3. **Response Handling**

* Webhook Trigger is set to *“Respond using Respond to Webhook node”*.
  → Your workflow must **end with a Respond to Webhook node** that sends JSON back to your app.
  Example response (normalized):

  ```json
  {
    "success": true,
    "data": {
      "id": "event123",
      "summary": "Meeting with Will",
      "htmlLink": "https://calendar.google.com/event?eid=...",
    }
  }
  ```

Your app then consumes this as the API response.

---

## 4. **Access Token Lifecycle**

* Your user object contains both `accessToken` and `refreshToken`:

  ```json
  "accessToken": "ya29....",
  "refreshToken": "1//0g1n...",
  "expiresAt": 1759281734107
  ```
* Google tokens expire hourly. So your app must:

  * Either **refresh before sending** to n8n (recommended for v1).
  * Or send both `accessToken` + `refreshToken` + `expiresAt` and let a Code node in n8n handle refresh automatically.

---

## 5. **Workflow Expectations**

The webhook payload must satisfy what the n8n **Calendar subagent** expects:

* For **Create/Update**: needs `summary`, `startDateTime`, optionally `endDateTime`, `attendees[]`.
* For **Delete**: must provide event ID (requires a Get Events step first).
* For **FreeBusy**: must provide `timeMin`, `timeMax`, and attendees list.

The system message you wrote enforces defaults (30 min, UTC if no TZ, work hours) — but still, **your app has to provide the core intent + token**.

---

## 6. **Infrastructure Setup**

* Your app must:

  1. Store each user’s Google OAuth credentials securely (accessToken + refreshToken + expiry).
  2. POST them to the n8n webhook along with the NL task.
  3. Handle the JSON response (success/failure).
* n8n must:

  * Validate the request (HMAC).
  * Pass the accessToken into the HTTP Request nodes.
  * Respond with normalized JSON.

---

✅ **So, minimum requirements for your API integration:**

1. **Your app must POST to n8n webhook** with JSON body:
   `{ accessToken, calendarId, task (NL instruction), refreshToken?, expiresAt?, timezone? }`
2. **Include HMAC signature** in headers (or some form of auth).
3. **Refresh token management** (decide app vs n8n).
4. **Handle JSON response** from n8n (`Respond to Webhook` node must be enabled).
5. **Normalize event data** before sending back to app.

```