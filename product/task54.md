# Task 54: AI-Powered Task Execution via OpenAI Agents + Arcade

## 📋 Summary

Enable users to execute natural-language tasks (e.g., "reply to Will on Slack", "set up a meeting at 3pm") with a single click using OpenAI AgentKit (ChatKit + Agents SDK) + Arcade integration, providing an interactive AI agent experience directly in the YourMum UI.

**Status**: ✅ Validated - Integration is feasible and production-ready (Oct 2025)

**Key Research Findings**:
- ChatKit officially launched October 2025 as part of OpenAI AgentKit (`@openai/chatkit-react`)
- Arcade won "Authentication Solution of the Year" 2025, SOC 2 Type 2 certified
- Python SDK (`agents-arcade`) is production-ready with Google Calendar, Slack, Gmail tools
- OAuth flow works exactly as specified - users auth once, credentials auto-reused
- **Critical**: Requires domain allowlist setup in OpenAI dashboard before deployment

---

## 🎯 Core UX Flow

### 1. **Task Action Trigger**
- **Location**: `frontend/components/parts/EditableScheduleRow.tsx`
- **New UI Element**: Add a new button next to the existing pickaxe (breakdown) button
  - Icon: Zap
  - Label: "Execute" (tooltip)
  - Placement: Desktop - inline with pickaxe; Mobile - in action drawer
  - Visibility: Show for all non-section tasks (similar to pickaxe button logic)

### 2. **ChatKit UI Integration**
- **On button click**: Launch OpenAI ChatKit UI in a modal/drawer
  - Documentation: https://openai.github.io/chatkit-js/
  - **Auto-trigger**: Automatically pass `task.text` as the initial user message
  - Example: User clicks button on task "Schedule meeting with Will tomorrow at 3pm"
    → ChatKit opens with this text pre-populated and conversation starts immediately

### 3. **One-Time Credential Setup**
- **First-time flow**: When user first attempts to execute a task requiring external app access:
  1. Agent prompts: "I need access to your Google Calendar to complete this task. Please authorize."
  2. User completes OAuth flow (Google Calendar, Slack, Gmail, etc.)
  3. Credentials stored securely by Arcade and reused for future requests
- **Subsequent executions**: Agent has access to stored credentials, executes autonomously

### 4. **Autonomous Task Execution**
- **Agent inputs**:
  - `task.text` (natural language instruction)
  - `user_id` (for Arcade credential lookup)
- **Agent behavior**:
  - Analyze task intent (similar to task51 classifier)
  - Call appropriate Arcade tools (Google Calendar, Slack, Gmail, etc.)
  - Handle multi-step flows (e.g., check availability → create meeting → send invite)
  - Provide real-time updates via ChatKit UI
  - Return actionable link (calendar event URL, Slack permalink, etc.)

---

## 🏗️ Technical Architecture

### Frontend Integration

#### EditableScheduleRow.tsx Changes
```typescript
// New button component (next to pickaxe)
{canExecute && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExecuteTask}
        disabled={isExecuting}
        className="h-8 w-8 p-0 text-primary-foreground hover:scale-105"
      >
        {isExecuting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Execute task with AI</p>
    </TooltipContent>
  </Tooltip>
)}
```

#### ChatKit Integration Component
```typescript
// frontend/components/parts/TaskExecutorChat.tsx
import { ChatKit, useChatKit } from '@openai/chatkit-react';

interface TaskExecutorChatProps {
  taskText: string;
  onClose: () => void;
}

export function TaskExecutorChat({ taskText, onClose }: TaskExecutorChatProps) {
  const { control } = useChatKit({
    api: {
      async getClientSecret() {
        const res = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialMessage: taskText })
        });
        const { client_secret } = await res.json();
        return client_secret;
      }
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[600px] h-[80vh] shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Execute Task</h2>
          <button onClick={onClose}>×</button>
        </div>
        <ChatKit control={control} className="h-[calc(100%-60px)]" />
      </div>
    </div>
  );
}
```

### Backend: OpenAI Agents + Arcade Integration

#### Why Arcade?
- **Problem**: OpenAI Agent Builder has limited native tools (basic API calls)
- **Solution**: Arcade provides pre-built, production-ready tools for:
  - Google Calendar (create/update/delete events, check availability)
  - Slack (send messages, read channels, search)
  - Gmail (send/draft emails, read inbox)
  - 100+ other integrations
- **Reference**: https://docs.arcade.dev/en/home/oai-agents/overview

#### Architecture Diagram
```
┌─────────────────────────────────────────────────────┐
│ YourMum Frontend (Next.js)                          │
│  ├─ EditableScheduleRow (Execute button)            │
│  └─ ChatKit UI (OpenAI modal)                       │
└──────────────────────┬──────────────────────────────┘
                       │ task.text + user_id
                       ↓
┌─────────────────────────────────────────────────────┐
│ YourMum Backend (Flask)                             │
│  └─ /api/chatkit/session (creates ChatKit session)  │
└──────────────────────┬──────────────────────────────┘
                       │ workflow_id + session config
                       ↓
┌─────────────────────────────────────────────────────┐
│ OpenAI Agent (Hosted on OpenAI Platform)            │
│  ├─ Classifier: Analyze task intent                 │
│  ├─ Planner: Determine execution steps              │
│  └─ Executor: Call Arcade tools                     │
└──────────────────────┬──────────────────────────────┘
                       │ Tool calls (authenticated)
                       ↓
┌─────────────────────────────────────────────────────┐
│ Arcade Platform                                      │
│  ├─ Google Calendar Tool                            │
│  ├─ Slack Tool                                       │
│  ├─ Gmail Tool                                       │
│  └─ OAuth Credential Management                     │
└─────────────────────────────────────────────────────┘
```

#### Backend Session Endpoint
```python
# backend/apis/chatkit_routes.py
from flask import Blueprint, request, jsonify
from openai import OpenAI
import os

bp = Blueprint('chatkit', __name__, url_prefix='/api/chatkit')

@bp.route('/session', methods=['POST'])
def create_session():
    """Create ChatKit session for task execution"""
    try:
        data = request.json
        task_text = data.get('initialMessage', '')

        # Get authenticated user from request
        user_id = get_current_user_id()  # Your auth function

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        session = client.chatkit.sessions.create(
            workflow_id=os.getenv("CHATKIT_WORKFLOW_ID"),
            # Pass user context for Arcade authentication
            metadata={
                "user_id": user_id,
                "initial_message": task_text
            }
        )

        return jsonify({"client_secret": session.client_secret})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

#### OpenAI Agent Configuration (Python SDK Approach)

**Option A: Python SDK (Recommended for MVP)**
```python
# backend/services/task_executor_service.py
from agents import Agent, Runner
from arcadepy import AsyncArcade
from agents_arcade import get_arcade_tools
import os

async def execute_task_with_agent(task_text: str, user_id: str):
    """Execute a task using OpenAI Agent + Arcade tools"""

    # Initialize Arcade client
    client = AsyncArcade(api_key=os.getenv("ARCADE_API_KEY"))

    # Get Google Calendar tools (start simple)
    tools = await get_arcade_tools(
        client,
        tools=[
            "Google_CreateEvent",
            "Google_CheckAvailability",
            "Google_GetEvent",
            "Google_UpdateEvent"
        ]
    )

    # Create agent with instructions
    agent = Agent(
        name="YourMum Task Executor",
        instructions="""
        You are an autonomous task execution assistant for YourMum.

        WORKFLOW:
        1. Analyze the user's task text to determine intent (calendar, slack, email, etc.)
        2. If you need credentials, request authorization through the OAuth flow
        3. Execute the task autonomously using available tools
        4. Provide clear status updates and final confirmation with actionable link

        EXAMPLES:
        - "Schedule meeting with Will tomorrow at 3pm"
          → Check availability, create event, return calendar link
        - "Move my 2pm meeting to 4pm"
          → Find event, check new slot, update event, confirm

        IMPORTANT:
        - Always confirm the action before executing
        - Return the direct link to the created/updated resource
        - Be concise and action-oriented
        """,
        model="gpt-4o",
        tools=tools
    )

    # Run agent with user context (Arcade uses this for auth)
    result = await Runner.run(
        starting_agent=agent,
        input=task_text,
        context={"user_id": user_id}
    )

    return result
```

**Option B: Agent Builder UI (Simpler, No Code)**
- Create agent in OpenAI Agent Builder web interface
- Add Arcade tools via integration settings
- Copy workflow ID (starts with `wf_...`)
- Use workflow ID in ChatKit session creation

#### Arcade OAuth Flow
- **User Authorization**: Arcade handles OAuth flow when agent requests credentials
  ```python
  # Arcade automatically prompts when credentials needed
  result = await client.tools.auth.authorize(
      tool="Google_CreateEvent",
      user_id=user_id
  )

  # If auth needed, Arcade returns auth URL
  if result.status != "completed":
      print(f"Please authorize: {result.url}")
      # User completes OAuth in browser/ChatKit iframe
      await client.tools.auth.wait_for_completion(result)
  ```
- **Credential Reuse**: After first auth, credentials stored by Arcade
  - Associated with `user_id` you provide
  - Automatically used for subsequent tool calls
  - Never exposed to LLM or your backend
- **Security**: SOC 2 Type 2 certified, OAuth tokens encrypted at rest

---

## 🔒 Security & Privacy

### Credential Storage
- **Where**: Arcade platform (not YourMum backend)
- **How**: OAuth 2.0 tokens, encrypted at rest, SOC 2 Type 2 certified
- **Scope**: Per-user (tied to `user_id` you provide)
- **Revocation**: User can revoke via Arcade dashboard

### Data Flow
1. User clicks "Execute" → ChatKit opens with task text
2. Frontend calls `/api/chatkit/session` → Backend creates session with `user_id`
3. Agent analyzes task → determines required integrations
4. If credentials missing:
   - Arcade triggers OAuth flow (URL provided to ChatKit)
   - User authorizes → tokens stored in Arcade
5. Agent executes with Arcade tools
6. Result returned to ChatKit → user sees confirmation + link
7. **YourMum backend never stores 3rd-party credentials** (Arcade handles this)

### Privacy Benefits
- Credentials never exposed to LLM (Arcade handles auth separately)
- Your backend doesn't store sensitive OAuth tokens
- Users can revoke access independently
- Audit trail available in Arcade dashboard

---

## 💻 UI/UX Requirements

### Desktop Experience
```
┌───────────────────────────────────────────────────┐
│ Task: Schedule meeting with Will tomorrow at 3pm │
│                                                   │
│ [✓] [Slack] Schedule meeting...  [⚡] [🔧] [⋯] │
│                    Pickaxe  Execute  More         │
└───────────────────────────────────────────────────┘
```
- Execute button (⚡) appears next to pickaxe
- Hover state: "Execute task with AI"
- Click → ChatKit modal opens (centered, 600px width, 80vh height)

### Mobile Experience
- Execute button appears in `MobileTaskActionDrawer`
- Tap → ChatKit drawer slides up (full height, bottom sheet style)
- ChatKit automatically optimizes for mobile viewport

### ChatKit Modal States
1. **Loading**: "Analyzing task..."
2. **Credential Request**: "I need access to your Google Calendar. [Authorize]"
3. **Executing**: "Creating calendar event... checking availability..."
4. **Success**:
   ```
   ✅ Done! I've scheduled a meeting with Will tomorrow at 3pm.

   📅 View Event: [https://calendar.google.com/event?eid=abc123]
   ```
5. **Error**: "I couldn't complete this task. [Error details + retry button]"

---

## ✅ Implementation Checklist

### Phase 1: MVP Setup (2-3 days)
**Frontend**:
- [ ] Install OpenAI ChatKit: `npm install @openai/chatkit-react`
- [ ] Create `TaskExecutorChat.tsx` component in `components/parts/`
- [ ] Add execute button to `EditableScheduleRow.tsx` (desktop)
- [ ] Add loading/error states for execution flow
- [ ] Test ChatKit modal rendering

**Backend**:
- [ ] Install Arcade SDK: `pip install agents-arcade arcadepy`
- [ ] Create `/api/chatkit/session` endpoint in Flask
- [ ] Set up environment variables (see below)
- [ ] Test session creation with Postman

**Agent Setup**:
- [ ] Create OpenAI account, generate API key
- [ ] Create Arcade account at arcade.dev
- [ ] Choose approach: Agent Builder (no-code) OR Python SDK
- [ ] If Agent Builder: Create agent, add Arcade tools, copy workflow ID
- [ ] If Python SDK: Implement `task_executor_service.py`
- [ ] Test OAuth flow with Google Calendar

**Critical Setup**:
- [ ] Add domain to OpenAI allowlist: `localhost:3000` and production domain
  - Dashboard: https://platform.openai.com/settings/organization/general
  - Security → Allowed domains
- [ ] Configure Arcade OAuth redirect URLs
- [ ] Test full flow: button → ChatKit → auth → execution

### Phase 2: Polish & Testing (2-3 days)
- [ ] Add execute button to `MobileTaskActionDrawer.tsx` (mobile)
- [ ] Implement proper error handling (API failures, auth failures)
- [ ] Add Slack tools to agent
- [ ] Add Gmail tools to agent
- [ ] Test multi-step flows (e.g., "check calendar then schedule meeting")
- [ ] Verify credential reuse (second execution should not require re-auth)

### Phase 3: Production (1-2 days)
- [ ] Add cost controls: max turns per conversation (10), timeout (60s)
- [ ] Implement basic analytics: log execution attempts to MongoDB
- [ ] Add user feedback mechanism ("Was this helpful?")
- [ ] Monitor OpenAI + Arcade API costs
- [ ] Set up error alerting (Sentry, etc.)

### Phase 4: Optional Enhancements
- [ ] Store execution results in MongoDB for history
- [ ] Display execution history in task detail view
- [ ] Add "Re-execute" button for failed tasks
- [ ] Implement workspace-scoped credentials (team shared auth)

---

## 🔧 Environment Variables

### Backend (.env)
```bash
# OpenAI
OPENAI_API_KEY=sk-...                    # From platform.openai.com

# Arcade
ARCADE_API_KEY=...                       # From arcade.dev dashboard

# ChatKit Workflow (if using Agent Builder)
CHATKIT_WORKFLOW_ID=wf_...               # From Agent Builder after publishing

# Existing
MONGODB_URI=mongodb://localhost:27017/yourdai
FIREBASE_ADMIN_CREDENTIALS=path/to/key.json
```

### Frontend (.env.local)
```bash
# Existing
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
```

---

## 📚 Technical Resources

- **OpenAI ChatKit Docs**: https://openai.github.io/chatkit-js/
- **OpenAI ChatKit React**: https://www.npmjs.com/package/@openai/chatkit-react
- **ChatKit Starter App**: https://github.com/openai/openai-chatkit-starter-app
- **Arcade + OpenAI Integration**: https://docs.arcade.dev/en/home/oai-agents/overview
- **Arcade Python SDK**: https://github.com/ArcadeAI/openai-agents-arcade
- **Arcade Tool Catalog**: https://www.arcade.dev (browse available tools)
- **OAuth Best Practices**: https://blog.arcade.dev/sso-for-ai-agents-authentication-and-authorization-guide

---

## ❓ Open Questions (Resolved)

### 1. **Agent Deployment**: Host on OpenAI Platform or self-host with Agents SDK?
   - **Answer**: Both options work. Recommendation:
     - **MVP**: Use Agent Builder (no-code, faster to prototype)
     - **Production**: Migrate to Python SDK for more control
   - **Flexibility**: Can switch between approaches without frontend changes

### 2. **Credential Scope**: Should Arcade credentials be user-scoped or workspace-scoped?
   - **Answer**: Start with user-scoped (privacy-first)
   - **Future**: Add workspace-scoped for team features (requires Arcade Enterprise plan)
   - **Implementation**: Pass different `user_id` values to Arcade based on scope

### 3. **Fallback Behavior**: What happens if Arcade is down or rate-limited?
   - **Answer**: ChatKit will surface the error automatically
   - **Implementation**: Add retry logic with exponential backoff
   - **UX**: Show "Service temporarily unavailable, try again" message

### 4. **Task History**: Should we log all agent executions in YourMum backend?
   - **Answer**: Yes for analytics, but not required for MVP
   - **Implementation**: Phase 3 enhancement - log to MongoDB
   - **Data to store**: task_id, user_id, execution_status, result_link, timestamp

### 5. **Cost Control**: How to prevent runaway API costs from agent loops?
   - **Answer**: Set limits in ChatKit session configuration
   - **Implementation**:
     ```python
     session = client.chatkit.sessions.create(
         workflow_id=workflow_id,
         max_turns=10,        # Prevent infinite loops
         timeout_seconds=60   # Kill after 1 minute
     )
     ```

### 6. **ChatKit vs Arcade Hosted Chat**: Which UI should we use?
   - **Answer**: Use ChatKit for better customization
   - **Reasoning**:
     - ChatKit: Customizable theme, better Next.js integration
     - Arcade Chat: Faster to ship but less control
   - **Recommendation**: Start with ChatKit

---

## 🚀 Simplified MVP Approach

To ship fastest (1 week instead of 3 weeks), follow this simplified path:

### What to Build (MVP)
1. ✅ Execute button in EditableScheduleRow
2. ✅ ChatKit modal with task text pre-populated
3. ✅ Backend session endpoint (`/api/chatkit/session`)
4. ✅ Agent with ONLY Google Calendar tool
5. ✅ Basic error handling

### What to Skip (MVP)
1. ❌ Execution history logging
2. ❌ Mobile drawer (just use modal on mobile)
3. ❌ Slack/Gmail tools (add in Phase 2)
4. ❌ Analytics/metrics
5. ❌ Task model updates

### Decision: Agent Builder vs Python SDK

**Recommendation for MVP: Agent Builder (No-Code)**

**Pros**:
- No backend agent code needed
- Visual interface for testing
- Easier to iterate on agent instructions
- OpenAI manages hosting/scaling

**Cons**:
- Less control over agent behavior
- Harder to debug
- Limited customization

**When to migrate to Python SDK**:
- Need custom business logic in agent
- Want to run agents server-side (not via ChatKit)
- Need advanced error handling
- Want to reduce OpenAI API costs (self-host)

---

## 📝 Next Steps (Prioritized)

### Week 1: Foundation
1. ✅ **Research complete** (this document updated)
2. **Day 1-2**: Set up accounts
   - Create OpenAI account, get API key
   - Create Arcade account, get API key
   - Add localhost:3000 to OpenAI domain allowlist
3. **Day 3-4**: Build MVP
   - Install dependencies
   - Create ChatKit component
   - Add execute button
   - Create session endpoint
4. **Day 5**: Test & iterate
   - Create test agent in Agent Builder
   - Test Google Calendar event creation
   - Fix bugs

### Week 2: Polish
1. Add mobile support
2. Improve error handling
3. Add Slack/Gmail tools
4. Beta test with 5 users

### Week 3: Launch
1. Add basic analytics
2. Monitor costs
3. Launch to all users
4. Gather feedback

---

## 💰 Cost Estimates

Based on research, here are approximate costs:

### OpenAI Costs
- **ChatKit sessions**: Free (sessions are just auth containers)
- **GPT-4o API calls**: ~$2.50/1M input tokens, ~$10/1M output tokens
- **Estimated cost per execution**: $0.01-0.05 (depending on complexity)
- **For 1000 executions/month**: ~$10-50

### Arcade Costs
- **Free tier**: Available for prototyping
- **Paid plans**: Based on:
  - Monthly active users authenticating
  - Number of auth challenges (first-time vs reauth)
  - Tool complexity (basic vs advanced)
- **Estimated cost**: $50-200/month for 100-500 users
- **Cost optimization**: Use "Bring Your Own Credentials" to reduce costs

### Total Estimated Monthly Cost
- **MVP (100 users, 500 executions/month)**: $75-150
- **Production (1000 users, 5000 executions/month)**: $300-600

**Cost Control Strategies**:
1. Set max turns = 10 per conversation
2. Set timeout = 60s per execution
3. Cache common queries (e.g., "check my calendar")
4. Use GPT-4o-mini for intent classification (cheaper)
