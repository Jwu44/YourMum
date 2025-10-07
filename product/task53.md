# Task 53: Slack User-Level OAuth for n8n Automation

## User Story

**As a** YourMum user
**I want to** execute Slack tasks through natural language commands
**So that** I can automatically send messages, search conversations, and interact with my workspace without leaving YourMum

## Background

Extends the n8n orchestrator (task51) to support Slack automation. Previously, Slack integration only used bot-level permissions for reading mentions and creating tasks. For automation features like "Reply to Will on Slack," we need user-level permissions to post messages as the authenticated user.

## Requirements

### Functional Requirements

1. **OAuth Scope Updates**
   - User must grant user-level permissions during Slack OAuth flow
   - Required user scopes:
     - `chat:write` - Post messages as authenticated user
     - `channels:read` + `channels:history` - Search public channels
     - `groups:read` + `groups:history` - Search private channels
     - `im:read` + `im:history` - Search DMs
     - `mpim:read` + `mpim:history` - Search group DMs
     - `search:read` - Workspace-wide message search
   - Bot scopes remain unchanged for webhook event listening

2. **Message Drafting Behavior**
   - Messages are sent immediately (not drafts)
   - Posted as the authenticated user (not as YourMum bot)
   - Return permalink to sent message for user verification

3. **Channel & Thread Search**
   - Search across all channel types (public, private, DMs, group DMs)
   - Find threads where user was mentioned or participated
   - Search window: **last 2 days** for performance
   - Match strategy: Most recent message from specified user

4. **Natural Language Task Examples**
   - "Reply to Will about the budget"
   - "Send message to #general thanking the team"
   - "DM Sarah about the deadline"

5. **n8n Workflow Integration**
   - Slack subagent receives user access token in webhook payload
   - Agent searches messages using provided context
   - Agent posts message as authenticated user
   - Returns permalink: `https://workspace.slack.com/archives/C123/p456`

### Technical Requirements

1. **OAuth Flow**
   - Enforce user access token requirement (fail OAuth if not granted)
   - Encrypt both `access_token` (user) and `bot_token` before storage
   - Existing users must reconnect to grant new permissions

2. **Database Schema**
   - `users.slack_integration.access_token` - encrypted user token (required)
   - `users.slack_integration.bot_token` - encrypted bot token (required)
   - Existing fields: `workspace_id`, `slack_user_id`, `team_id`, etc.

3. **n8n Webhook Payload**
   ```json
   {
     "userId": "string",
     "taskId": "string",
     "taskText": "Reply to Will about the budget",
     "accessToken": "string",  // Google Calendar token
     "slackCredentials": {      // NEW
       "accessToken": "string", // User access token (decrypted)
       "workspaceId": "string",
       "workspaceName": "string",
       "slackUserId": "string",
       "teamId": "string"
     }
   }
   ```

4. **Error Handling**
   - Gracefully handle missing Slack credentials (not all tasks need Slack)
   - Clear error messages if user hasn't connected Slack
   - Validation errors if OAuth missing required scopes

### Security Requirements

1. **Token Encryption**
   - User access tokens encrypted at rest using `backend.utils.encryption`
   - Decrypted only when needed for n8n webhook calls
   - Never logged or exposed in API responses

2. **Permission Scope**
   - Only grant minimum required permissions
   - User explicitly consents to user-level scopes during OAuth
   - No access to data outside user's workspace

## Acceptance Criteria

- [ ] User can complete Slack OAuth flow with user-level permissions
- [ ] OAuth fails with clear error if user denies user-level scopes
- [ ] Existing Slack users see `access_token: null` until reconnection
- [ ] n8n webhook receives Slack credentials when user has connected Slack
- [ ] n8n Slack subagent can search messages from last 2 days
- [ ] n8n Slack subagent can post messages as authenticated user
- [ ] Posted messages return valid permalink
- [ ] All unit tests pass for token extraction and validation
- [ ] Integration works end-to-end: task ’ n8n ’ Slack ’ permalink

## Implementation Summary

### Files Modified

1. **backend/services/slack_service.py**
   - Added user_scope parameter to OAuth URL generation (lines 115-169)
   - Required user access token in extraction logic (lines 263-297)
   - Enforced encryption of both tokens (lines 190-195)

2. **backend/apis/n8n_routes.py**
   - Added Slack credentials extraction (lines 352-381)
   - Included in n8n webhook payload conditionally
   - Added debug logging for active integrations (line 402)

3. **backend/tests/test_slack_routes.py**
   - Updated `test_extract_integration_data_no_user_token` to expect error
   - Added `test_oauth_callback_missing_user_token` for validation

### Migration Notes

**Existing Users:**
- Current Slack integrations have `access_token: null`
- Users must disconnect and reconnect Slack integration
- After reconnection, full automation features will work
- Webhook tasks will continue to create tasks from mentions (uses bot token)

**New Users:**
- Single OAuth flow grants both bot and user permissions
- Immediate access to all automation features
- Clear error if permissions denied

## Testing Strategy

1. **Unit Tests**
   - OAuth URL contains `user_scope` parameter 
   - User token extraction validates presence 
   - Missing user token raises ValueError 

2. **Integration Tests**
   - Full OAuth flow with real Slack workspace
   - n8n webhook receives correct Slack credentials
   - Message posting returns valid permalink

3. **End-to-End Tests**
   - User creates task: "Reply to Will on Slack"
   - n8n orchestrator delegates to Slack subagent
   - Subagent searches last 2 days for messages from Will
   - Subagent posts reply as authenticated user
   - YourMum UI shows permalink to sent message

## Related Tasks

- **task51**: n8n orchestrator architecture and webhook integration
- **task11**: Original Slack webhook integration (bot-only permissions)
- **task43**: Slack event processing and task creation

## Timeline

-  Implementation: Completed
- ó User Testing: Pending reconnection of existing users
- ó n8n Subagent: Slack agent implementation in n8n workflow
