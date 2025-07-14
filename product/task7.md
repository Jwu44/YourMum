# TASK-07: Slack MCP Server Integration via Klavis AI
Status: ✅ Completed

# User story: 
As a knowledge base worker,
I want yourdai to sync to Slack and automatically create Slack tasks in yourdai,
So that I don't have to create them manually in yourdai

# Requirements
- Investigate the doc on Klavis AI's MCP Slack Server
- Set up logic where everytime the user gets a direct '@' mention on Slack, yourdai should pull that message 
- The pulled message should be converted into a yourdai task object
- Display the converted task object on /dashboard for the current day
- On the dashboard left side navbar, there should be a new tab called 'Integrations'
    - clicking on 'Integrations' should show a page with a card component for "Slack" integration
    - the card should have a CTA: "Connect"
    - clicking on "Connect" should sync the user's slack to klavis AI and hence to yourdai

# Architecture Decisions (from clarifying questions)

## User-Slack Account Linking
- Store Klavis AI integration data in user document:
  ```javascript
  slack: {
    connected: boolean,
    instanceId: string,    // From Klavis AI
    serverUrl: string,     // From Klavis AI  
    oauthUrl: string,      // From Klavis AI
    connectedAt: Date,
    lastSyncTime: Date
  }
  ```
- One Klavis AI instance per yourdai user (economical approach)
- OAuth flow opens in new tab, redirects to Klavis AI callback

## Message Monitoring Approach
- **Webhook implementation** (more effective than polling)
- Webhook endpoint: `POST /api/integrations/slack/webhook`
- Klavis AI sends real-time notifications when user gets @mentioned
- Immediate response, simpler to maintain than scheduled polling

## Task Data Enhancement
- Add `source?: "slack"` field to Task model to identify Slack-sourced tasks
- Add `slack_message_url?: string` field to store hyperlink to original message  
- Convert @mention content directly to task text (keep simple)
- No specific categories required for Slack tasks

## Integration Page Structure
- Route: `/dashboard/integrations` (replaces dashboard content area like InputsConfig)
- Grid layout with cards for different integrations
- Slack card shows Connect/Disconnect states
- Future-ready for other integrations

# Implementation Completed ✅

## ✅ Step 1: Enhanced Data Models
**Backend Task Model** (`backend/models/task.py`):
- Added `source` and `slack_message_url` optional parameters
- Updated `__init__`, `to_dict()`, and `from_dict()` methods
- Maintains backward compatibility

**Frontend Task Interface** (`frontend/lib/types.ts`):
- Added `source?: 'slack'` field  
- Added `slack_message_url?: string` field

## ✅ Step 2: Sidebar Navigation  
**Modified** (`frontend/components/parts/AppSidebar.tsx`):
- Added `Plug` icon import from lucide-react
- Added "Integrations" navigation item between "Inputs" and "Archive"
- Routes to `/dashboard/integrations`

## ✅ Step 3: Integration Page & Components
**Created** (`frontend/app/dashboard/integrations/page.tsx`):
- Route file following existing pattern

**Created** (`frontend/components/parts/IntegrationsLayout.tsx`):
- Main page with SidebarLayout following InputsConfig.tsx pattern
- Grid layout for integration cards
- Extensible design for future integrations
- Help section with documentation links

**Created** (`frontend/components/parts/SlackIntegrationCard.tsx`):
- Connection status indicators (CheckCircle, AlertCircle, Loader)
- OAuth handling opens new tab with provided URL
- Connect/Disconnect states with proper loading
- Features list and error handling
- Integrated with backend API endpoints

## ✅ Step 4: Backend Service Layer
**Created** (`backend/services/slack_service.py`):
- SlackService class with Klavis AI SDK integration
- create_slack_server_instance() method using Klavis API
- get_slack_integration_status(), process_slack_webhook() methods
- convert_slack_message_to_task() with source="slack" and categories=["Work"]
- disconnect_slack_integration() and helper methods

## ✅ Step 5: Backend API Endpoints
**Created** (`backend/apis/integration_routes.py`):
- `POST /api/integrations/slack/connect` - Creates Klavis instance, returns OAuth URL
- `GET /api/integrations/slack/status` - Checks connection status  
- `POST /api/integrations/slack/webhook` - Receives @mention notifications from Klavis AI
- `POST /api/integrations/slack/disconnect` - Removes integration
- Firebase authentication integration for all endpoints

**Updated** (`application.py`):
- Registered integration_routes blueprint

**Enhanced** (`backend/models/user_schema.py`):
- Added Slack integration field validation

**Updated** (`requirements.txt`):
- Added klavis package dependency

## ✅ Step 6: Enhanced Webhook Implementation
**Database Setup** (`backend/db_config.py`):
- initialize_slack_collections() with indexed MongoDB collection
- TTL index for automatic cleanup of processed messages (30 days)
- Duplicate message prevention system

**Webhook Enhancements**:
- Payload validation via _validate_webhook_payload()
- Duplicate message checking with check_duplicate_message()
- Enhanced process_slack_webhook() with success/error tuple returns
- User verification and comprehensive error handling

## ✅ Step 7: Frontend Integration
**Enhanced** (`frontend/components/parts/SlackIntegrationCard.tsx`):
- Integrated Firebase authentication following existing patterns
- Real API calls replacing TODO/mock implementations
- Enhanced checkSlackStatus() with backend integration
- OAuth popup management and window polling
- Connection details display (connected date, last sync, instance ID)
- Refresh functionality and comprehensive error handling

# Technical Implementation Details

## Klavis AI Integration
- Uses Klavis SDK for MCP server creation and management
- OAuth flow through Klavis-provided URLs with state management
- Real-time webhook notifications for @mentions
- Automatic task creation with "Work" category and today's schedule

## Database Schema
- User document includes slack integration fields with validation
- MongoDB collection for duplicate message prevention
- Indexed fields for performance and automatic cleanup

## Task Processing
- Slack messages converted to tasks with source="slack"
- Raw message text used for task content
- All tasks scheduled for current day
- Duplicate prevention using message timestamps and content

## Error Handling
- Comprehensive validation at API endpoints
- User verification for webhook processing
- Frontend error states with specific error messages
- Graceful fallbacks for OAuth flow interruptions

# Files Created/Modified

## Created Files:
```
backend/services/slack_service.py                   # Klavis AI integration service
backend/apis/integration_routes.py                  # API endpoints
frontend/app/dashboard/integrations/page.tsx        # Route file
frontend/components/parts/IntegrationsLayout.tsx    # Main page component  
frontend/components/parts/SlackIntegrationCard.tsx  # Slack card component
```

## Modified Files:
```
backend/models/task.py                              # Added Slack fields
backend/models/user_schema.py                      # Added Slack validation
backend/db_config.py                               # Added Slack collections
application.py                                      # Registered integration routes
requirements.txt                                    # Added klavis dependency
frontend/lib/types.ts                              # Added Slack fields  
frontend/components/parts/AppSidebar.tsx          # Added Integrations nav
```

# Development Guidelines Followed
- Simple implementation without unnecessary complexity
- Modular architecture with clear separation of concerns
- Proper TypeScript with interface definitions
- Consistent patterns following existing codebase conventions
- Comprehensive error handling and validation
- Real-time webhook processing for immediate task creation
- Secure OAuth flow with proper state management