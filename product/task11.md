Overview
Implement direct Slack API integration to automatically create tasks from @mentions in yourdai. Users connect their Slack workspace via OAuth, and all @mentions of the authorized user are processed by AI to create actionable tasks.
Architecture Summary

Direct Slack API integration (no third-party dependencies)
OAuth 2.0 authentication using @slack/oauth package
Events API webhook for real-time @mention detection
Claude Haiku for message filtering and task generation
Asynchronous processing for reliability and performance


Phase 1: Slack App Setup
1.1 Create Slack App

Go to https://api.slack.com/apps
Click "Create New App" → "From scratch"
App Name: yourdai
Workspace: prodigiau.slack.com

1.2 Configure OAuth & Permissions
Navigate to "OAuth & Permissions" and add these scopes:
Bot Token Scopes:
- app_mentions:read     (detect @mentions of the bot)
- channels:history      (read public channel messages)
- groups:history        (read private channel messages)  
- im:history           (read direct messages)
- chat:write           (send messages - for future features)
- users:read           (get user information)
- team:read            (get workspace information)

User Token Scopes:
- identity.basic       (get user's Slack identity)
1.3 Configure Event Subscriptions

Enable Events API
Set Request URL: https://yourdai.com/api/integrations/slack/events
Subscribe to bot events:

app_mention (when bot is @mentioned)
message.channels (messages in public channels)
message.groups (messages in private channels)
message.im (direct messages)



1.4 App Installation Settings

Set OAuth Redirect URL: https://yourdai.com/api/integrations/slack/auth/callback
Save Client ID and Client Secret as environment variables


Phase 2: Backend Implementation
2.1 Environment Variables
envSLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_APP_ID=your_app_id
2.2 Install Dependencies
bashpip install slack-sdk aiohttp cryptography
npm install @slack/oauth @slack/web-api
2.3 File Structure
backend/
├── services/
│   ├── slack_service.py          # Core Slack integration logic
│   └── slack_message_processor.py # AI message processing
├── apis/
│   └── slack_routes.py           # Slack API endpoints
└── models/
    └── slack_schema.py           # Slack data models
2.4 Core Service Implementation (slack_service.py)
pythonclass SlackService:
    """Handles Slack OAuth, event processing, and task creation"""
    
    def __init__(self):
        self.client_id = os.environ.get('SLACK_CLIENT_ID')
        self.client_secret = os.environ.get('SLACK_CLIENT_SECRET')
        self.signing_secret = os.environ.get('SLACK_SIGNING_SECRET')
    
    async def handle_oauth_callback(self, code: str) -> dict:
        """Exchange OAuth code for access tokens"""
        # 1. Exchange code for tokens using Slack OAuth API
        # 2. Store encrypted tokens in MongoDB
        # 3. Get user info and workspace details
        # 4. Return success status
    
    async def verify_webhook_signature(self, request_body: str, headers: dict) -> bool:
        """Verify request is from Slack using HMAC-SHA256"""
        # Implement signature verification
    
    async def process_event(self, event: dict, user_id: str) -> Optional[Task]:
        """Process Slack event and create task if needed"""
        # 1. Extract message text and metadata
        # 2. Check if user is mentioned
        # 3. Send to AI processor
        # 4. Create task if actionable
        # 5. Store with Slack metadata
2.5 Message Processor (slack_message_processor.py)
pythonclass SlackMessageProcessor:
    """AI-powered message filtering and task generation"""
    
    async def process_mention(self, message_data: dict) -> tuple[bool, str]:
        """
        Analyze message with Claude Haiku
        Returns (is_actionable, task_text)
        """
        prompt = '''
        Analyze this Slack message and determine if it contains an actionable task.
        
        Message: {text}
        Context: User was @mentioned in {channel_name}
        
        Rules:
        - Return true only if there's a clear action item for the mentioned user
        - Extract a concise, actionable task description
        - Ignore greetings, FYIs, or non-actionable mentions
        
        Respond in JSON: {"is_actionable": boolean, "task_text": string}
        '''
        
        # Call Claude Haiku and parse response
2.6 API Routes (slack_routes.py)
python# POST /api/integrations/slack/auth/init
def init_oauth():
    """Generate OAuth URL with state token"""
    state = generate_csrf_token()
    oauth_url = f"https://slack.com/oauth/v2/authorize?..."
    return {"oauth_url": oauth_url, "state": state}

# GET /api/integrations/slack/auth/callback
async def oauth_callback(code: str, state: str):
    """Handle OAuth callback from Slack"""
    # Verify state token
    # Exchange code for tokens
    # Store user integration data
    # Return success redirect

# POST /api/integrations/slack/events
async def handle_webhook():
    """Process incoming Slack events"""
    # 1. Verify signature
    # 2. Handle URL verification challenge
    # 3. Process events asynchronously
    # 4. Return 200 immediately (within 3 seconds)
    
    # Async processing:
    asyncio.create_task(process_event_async(event))

# GET /api/integrations/slack/status
def get_status(user_id: str):
    """Check integration status for user"""
    return integration_status

# DELETE /api/integrations/slack/disconnect
def disconnect(user_id: str):
    """Remove Slack integration"""
2.7 Database Schema Updates
python# User collection enhancement
slack_integration = {
    "workspace_id": str,
    "workspace_name": str,
    "team_id": str,
    "slack_user_id": str,      # User's Slack ID
    "slack_username": str,     # For @mention matching
    "access_token": str,       # Encrypted
    "bot_token": str,          # Encrypted bot token
    "bot_user_id": str,        # Bot's user ID
    "connected_at": datetime,
    "last_event_at": datetime,
    "channels_joined": []      # Track where bot is present
}

# Task enhancement for Slack source
slack_metadata = {
    "message_url": str,        # Web URL
    "deep_link": str,         # Slack app URL
    "channel_id": str,
    "channel_name": str,
    "sender_name": str,
    "original_text": str,
    "thread_ts": str,         # Thread timestamp if applicable
    "workspace_name": str
}

Phase 3: Frontend Implementation
3.1 Update SlackIntegrationCard Component
typescript// SlackIntegrationCard.tsx modifications
const handleConnect = async () => {
  // 1. Call /api/integrations/slack/auth/init
  // 2. Open OAuth URL in popup
  // 3. Poll for completion
  // 4. Update UI on success
}

const handleDisconnect = async () => {
  // Call /api/integrations/slack/disconnect
  // Update UI
}

// Display connection status with workspace name
// Show "Invite bot to channels" helper text
3.2 Task Display Enhancement
typescript// In TaskItem component, add Slack source indicator
{task.source === 'slack' && (
  <div className="flex items-center gap-2">
    <SlackIcon className="w-4 h-4" />
    <a 
      href={task.slack_metadata.message_url}
      target="_blank"
      className="text-sm text-blue-500 hover:underline"
    >
      View in Slack
    </a>
  </div>
)}

Phase 4: Implementation Steps
Step 1: Slack App Configuration (30 min)

Create Slack app in prodigiau.slack.com
Configure OAuth scopes and permissions
Set up Event Subscriptions (pending webhook URL)
Save credentials as environment variables

Step 2: Backend OAuth Flow (2 hours)

Implement slack_routes.py with OAuth endpoints
Create slack_service.py with token exchange logic
Add encryption for token storage
Test OAuth flow with Postman

Step 3: Webhook & Event Processing (3 hours)

Implement webhook signature verification
Create event router for different event types
Add @mention detection logic (bot mentions, user mentions, @here, @channel)
Implement async processing pattern
Add deduplication with event_id tracking

Step 4: AI Message Processing (2 hours)

Create slack_message_processor.py
Implement Haiku prompt for actionability detection
Add message parsing and task text extraction
Handle thread context and replies

Step 5: Task Creation Pipeline (2 hours)

Create task from processed message
Add Slack metadata (URLs, channel info)
Store in MongoDB with proper indexing
Handle errors gracefully (skip non-actionable)

Step 6: Frontend Integration (2 hours)

Update SlackIntegrationCard.tsx with new endpoints
Implement OAuth popup flow
Add connection status display
Enhance task display with Slack source indicators

Step 7: Bot Invitation Flow (1 hour)

Detect when bot is not in channel
Create notification system for missing bot access
Add "Invite bot" instructions in UI

Step 8: Testing & Deployment (2 hours)

Test OAuth flow end-to-end
Test @mention detection in various scenarios
Test AI filtering with sample messages
Deploy webhook endpoint with SSL
Update Slack app with production URLs


Key Implementation Details
Asynchronous Processing (Recommended)
pythonasync def handle_webhook(request):
    # Verify signature synchronously
    if not verify_signature(request):
        return 401
    
    # Handle URL verification
    if request.json.get('type') == 'url_verification':
        return {'challenge': request.json['challenge']}
    
    # Queue event for async processing
    asyncio.create_task(process_event_async(request.json))
    
    # Return immediately to meet 3-second deadline
    return {'status': 'ok'}, 200

async def process_event_async(event):
    # Process without time pressure
    # AI processing, task creation, etc.
Mention Detection Logic
pythondef extract_mentions(event):
    mentions = []
    text = event.get('text', '')
    
    # Direct @mentions
    if f'<@{slack_user_id}>' in text:
        mentions.append('direct')
    
    # @here, @channel, @everyone
    if '<!here>' in text or '<!channel>' in text or '<!everyone>' in text:
        mentions.append('broadcast')
    
    # Thread replies where user was mentioned
    if event.get('thread_ts') and was_mentioned_in_thread(event):
        mentions.append('thread')
    
    return mentions
URL Construction
pythondef build_slack_urls(event):
    workspace_domain = get_workspace_domain(team_id)
    message_ts = event['ts'].replace('.', '')
    
    return {
        'web_url': f"https://{workspace_domain}.slack.com/archives/{event['channel']}/p{message_ts}",
        'deep_link': f"slack://channel?team={team_id}&id={event['channel']}&message={event['ts']}"
    }

Notes for Implementation

Use asynchronous processing for robustness - acknowledge webhook immediately, process in background
Store both web and deep links for Slack messages - let frontend choose based on device
Implement exponential backoff for API calls to handle rate limits
Add comprehensive logging for debugging webhook events
Consider Redis for event deduplication if scaling beyond one server

Task Model Updates
1. Backend Task Model (backend/models/task.py)
pythonfrom typing import Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field

@dataclass
class Task:
    """
    Task model with support for multiple sources including Slack integration.
    """
    id: str
    text: str
    categories: set = field(default_factory=set)
    completed: bool = False
    is_microstep: bool = False
    parent_id: Optional[str] = None
    order: int = 0
    
    # Source tracking
    source: str = 'manual'  # 'manual' | 'slack' | 'calendar'
    
    # Slack-specific metadata (only populated when source='slack')
    slack_metadata: Optional[Dict[str, Any]] = None
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        """Convert Task to dictionary for MongoDB storage."""
        return {
            'id': self.id,
            'text': self.text,
            'categories': list(self.categories),
            'completed': self.completed,
            'is_microstep': self.is_microstep,
            'parent_id': self.parent_id,
            'order': self.order,
            'source': self.source,
            'slack_metadata': self.slack_metadata,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_slack_event(cls, event: dict, task_text: str, user_id: str) -> 'Task':
        """
        Factory method to create Task from Slack event.
        
        Args:
            event: Slack event data
            task_text: AI-processed actionable task text
            user_id: yourdai user ID
            
        Returns:
            Task object with Slack metadata
        """
        import uuid
        
        # Build Slack metadata
        slack_metadata = {
            'message_url': cls._build_web_url(event),
            'deep_link': cls._build_deep_link(event),
            'channel_id': event.get('channel'),
            'channel_name': event.get('channel_name', 'Unknown Channel'),
            'sender_id': event.get('user'),
            'sender_name': event.get('user_name', 'Unknown User'),
            'original_text': event.get('text'),
            'thread_ts': event.get('thread_ts'),
            'workspace_id': event.get('team_id'),
            'workspace_name': event.get('team_name', 'Unknown Workspace'),
            'event_ts': event.get('ts')
        }
        
        return cls(
            id=str(uuid.uuid4()),
            text=task_text,
            source='slack',
            slack_metadata=slack_metadata
        )
    
    @staticmethod
    def _build_web_url(event: dict) -> str:
        """Build Slack web URL for the message."""
        team_domain = event.get('team_domain', 'workspace')
        channel = event.get('channel', '')
        timestamp = event.get('ts', '').replace('.', '')
        return f"https://{team_domain}.slack.com/archives/{channel}/p{timestamp}"
    
    @staticmethod
    def _build_deep_link(event: dict) -> str:
        """Build Slack deep link for native app."""
        team_id = event.get('team_id', '')
        channel = event.get('channel', '')
        timestamp = event.get('ts', '')
        return f"slack://channel?team={team_id}&id={channel}&message={timestamp}"
2. Frontend Type Definitions (frontend/lib/types.ts)
typescript/**
 * Slack metadata for tasks created from Slack messages
 */
export interface SlackMetadata {
  message_url: string      // Web URL to view in browser
  deep_link: string        // Deep link to open in Slack app
  channel_id: string
  channel_name: string
  sender_id: string
  sender_name: string
  original_text: string    // Original message before AI processing
  thread_ts?: string       // Thread timestamp if part of thread
  workspace_id: string
  workspace_name: string
  event_ts: string         // Original event timestamp
}

/**
 * Task source types
 */
export type TaskSource = 'manual' | 'slack' | 'calendar'

/**
 * Main Task interface with Slack integration support
 */
export interface Task {
  id: string
  text: string
  categories: Set<string>
  completed: boolean
  is_microstep?: boolean
  parent_id?: string | null
  order?: number
  
  // Source tracking
  source?: TaskSource
  
  // Slack metadata (only present when source === 'slack')
  slack_metadata?: SlackMetadata
  
  // Timestamps
  created_at?: string
  updated_at?: string
  
  // Existing optional fields
  level?: number
  is_recurring?: RecurrenceType | null
  estimated_time?: number
  energy_level_required?: number
}
3. Database Schema Validation (backend/models/schemas.py)
python# Add to existing task schema validation
TASK_SCHEMA = {
    'bsonType': 'object',
    'required': ['id', 'text', 'categories', 'completed'],
    'properties': {
        'id': {'bsonType': 'string'},
        'text': {'bsonType': 'string'},
        'categories': {
            'bsonType': 'array',
            'items': {'bsonType': 'string'}
        },
        'completed': {'bsonType': 'bool'},
        'is_microstep': {'bsonType': 'bool'},
        'parent_id': {'bsonType': ['string', 'null']},
        'order': {'bsonType': 'int'},
        'source': {
            'bsonType': 'string',
            'enum': ['manual', 'slack', 'calendar']
        },
        'slack_metadata': {
            'bsonType': ['object', 'null'],
            'properties': {
                'message_url': {'bsonType': 'string'},
                'deep_link': {'bsonType': 'string'},
                'channel_id': {'bsonType': 'string'},
                'channel_name': {'bsonType': 'string'},
                'sender_id': {'bsonType': 'string'},
                'sender_name': {'bsonType': 'string'},
                'original_text': {'bsonType': 'string'},
                'thread_ts': {'bsonType': ['string', 'null']},
                'workspace_id': {'bsonType': 'string'},
                'workspace_name': {'bsonType': 'string'},
                'event_ts': {'bsonType': 'string'}
            }
        },
        'created_at': {'bsonType': 'string'},
        'updated_at': {'bsonType': 'string'}
    }
}
Key Design Decisions
1. Why Optional slack_metadata?

Keeps the Task model simple for non-Slack tasks
Only populated when source='slack'
Follows SOLID principles - not forcing all tasks to have Slack data

2. Why Store Both URLs?

message_url: Works in any browser
deep_link: Better UX for users with Slack app installed
Frontend can intelligently choose based on device/platform

3. Why Keep original_text?

Provides context if user wants to see what triggered the task
Useful for debugging or understanding AI interpretation
Can be displayed in a tooltip or expandable section

4. Factory Method Pattern

from_slack_event() encapsulates Slack-specific task creation logic
Keeps the main Task constructor clean
Makes testing easier with clear separation of concerns

Migration Considerations
Since we're adding optional fields with defaults:

✅ No breaking changes - existing tasks continue to work
✅ Backward compatible - old tasks have source='manual' by default
✅ No migration needed - MongoDB handles missing fields gracefully

Usage Example
python# In slack_service.py
async def create_task_from_slack(event: dict, user_id: str):
    # Process with AI
    is_actionable, task_text = await process_with_ai(event['text'])
    
    if not is_actionable:
        return None
    
    # Create task with Slack metadata
    task = Task.from_slack_event(
        event=event,
        task_text=task_text,
        user_id=user_id
    )
    
    # Save to MongoDB
    await save_task(task)
    return task

## Implementation Context & Clarifications

### Architecture Decisions Based on Discussion:

1. **Starting Fresh**: Complete rewrite of Slack integration, replacing previous Klavis AI MCP approach
2. **Multi-Workspace Support**: End users can connect their own workspaces (not limited to prodigiau.slack.com)
3. **Task Model Approach**: Maintain existing class-based Task model in `backend/models/task.py` for consistency
4. **Authentication Strategy**: Use Firebase user IDs as primary keys, extending user collection with `slack_integration` field
5. **AI Processing**: Separate processor using existing Claude integration, not Klavis AI MCP
6. **Frontend Integration**: Update existing `SlackIntegrationCard.tsx`, replace Klavis logic with direct OAuth

### Technical Implementation Details:

#### Database Schema:
- Extend existing user collection with `slack_integration` field (not separate collection)
- Add optional `slack_metadata` field to existing Task model
- Maintain backward compatibility - no migration needed

#### Security Requirements:
- Token encryption for database storage using cryptography library
- HMAC-SHA256 webhook signature verification
- OAuth state token validation
- Comprehensive error handling with user-friendly messages

#### Frontend API Strategy:
- Extend `frontend/lib/api/tasks.ts` with Slack-specific functions
- Maintain existing authentication patterns
- Replace popup OAuth flow in existing SlackIntegrationCard component

#### Testing Requirements:
- Unit tests for all service functions
- Integration tests for OAuth flow end-to-end
- Webhook signature verification tests
- AI message processing tests
- Task creation and storage tests

### Environment Variables Required:
```env
# Backend (.env)
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret  
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_APP_ID=your_app_id
ANTHROPIC_API_KEY=existing_claude_key
MONGODB_URI=existing_mongo_connection
```

### File Structure Summary:
```
backend/
├── services/
│   ├── slack_service.py          # OAuth, event processing, task creation
│   └── slack_message_processor.py # AI filtering with Claude Haiku
├── apis/
│   └── slack_routes.py           # API endpoints (/auth/init, /auth/callback, /events, etc.)
└── utils/
    └── encryption.py             # Token encryption utilities

frontend/
├── lib/api/
│   └── tasks.ts                  # Extended with Slack API functions
└── components/parts/
    └── SlackIntegrationCard.tsx  # Updated for direct OAuth (replace Klavis logic)
```

### Integration Patterns:
- Asynchronous webhook processing (acknowledge < 3s, process in background)
- Comprehensive logging for debugging webhook events  
- Rate limiting and exponential backoff for API calls
- Event deduplication using event_id tracking