# TASK-09: Fix Slack Integration - Direct @mentions not creating tasks
**Status: 🔄 Analysis Complete - Awaiting Revised Implementation**

## Problem Statement
After clicking "Connect" on the SlackIntegrationCard and completing OAuth with KlavisAI, Slack @mentions in direct messages are not creating tasks in yourdAI despite successful connection.

**Steps to Reproduce:**
1. Go to /dashboard → "Integrations" tab → Click "Connect" on Slack card
2. Complete OAuth in KlavisAI-hosted window
3. In Slack workspace "Prodigi", send direct message with @mention to self
4. **Bug**: No task appears in yourdAI dashboard

## Root Cause Analysis ✅ IDENTIFIED

### **Initial Discovery**
- ✅ OAuth flow completes successfully
- ✅ Integration shows as "connected" in UI
- ❌ **NO webhook requests** hitting `/api/integrations/slack/webhook` endpoint
- **Conclusion**: KlavisAI doesn't know WHERE to send @mention notifications

### **Core Issue**: Missing Event Subscription Configuration
The integration creates MCP server instance and completes OAuth, but **never subscribes to Slack events** through the MCP server's tools.

## Technical Context

### **Current Implementation (Incomplete)**
```
✅ MCP server creation (create_slack_server_instance)
✅ OAuth completion 
✅ Webhook endpoint ready (/api/integrations/slack/webhook)
❌ MISSING: Event subscription using MCP server tools
```

### **User Data from MongoDB**
- **Instance ID**: `5dd87456-c0bc-4f4a-aa3f-75ffe8631e09`
- **Server URL**: `https://slack-mcp-server.klavis.ai/mcp/?instance_id=5dd87456-c0bc-4f4a-aa3f-75ffe8631e09`
- **OAuth Status**: Connected (Fri, 11 Jul 2025 03:11:07 GMT)
- **Webhook Status**: No webhooks received

## Solution Evolution

### **❌ First Attempt: Manual Webhook Configuration**
**Problem**: Tried to manually configure webhooks via direct API calls to KlavisAI
- Direct API calls to `https://api.klavis.ai/v1/mcp-server/{instance_id}/webhook`
- MCP tool discovery without proper usage
- **Result**: Not following proper MCP patterns

### **✅ Revised Approach: Proper MCP Tool Usage**
**Insight**: KlavisAI provides official OpenAI integration example showing proper MCP pattern:

```javascript
// Discover tools from MCP server
const tools = await klavisClient.mcpServer.listTools({
    serverUrl: gmailServer.serverUrl,
    format: Klavis.ToolFormat.Openai
});

// Use tools for configuration
const result = await klavisClient.mcpServer.callTools({
    serverUrl: gmailServer.serverUrl,
    toolName: toolCall.function.name,
    toolArgs: JSON.parse(toolCall.function.arguments)
});
```

## Key Requirements
- **Event Subscription**: @mentions must trigger webhook to yourdAI
- **Tool-Based Configuration**: Use MCP server's intended capabilities
- **Proper Error Handling**: Clear feedback when tools fail
- **Status Tracking**: User can see configuration progress

## Files Requiring Changes
1. `backend/services/slack_service.py` - Replace webhook config with MCP tool usage
2. `backend/apis/integration_routes.py` - Update OAuth completion flow
3. `backend/models/user_schema.py` - Add tool configuration fields
4. `frontend/components/parts/SlackIntegrationCard.tsx` - Update UI for tool status

## References
- **KlavisAI OpenAI Example**: Shows proper MCP tool calling pattern
- **KlavisAI Slack MCP README**: https://github.com/Klavis-AI/klavis/blob/main/mcp_servers/slack/README.md
- **Current Integration Status**: Connected but no event subscription configured




