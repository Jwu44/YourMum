# CLAUDE.md

This file provides workflow-focused guidance to Claude Code when working with the YourMum task management application.

## Essential Commands

### Daily Development Workflow
```bash
# ALWAYS start both services for full-stack development
python3 application.py &           # Backend (port 8000) - start first
cd frontend && npm run dev         # Frontend (port 3000) - start second

# Verify services are running
lsof -i :8000  # Check backend
lsof -i :3000  # Check frontend
```

### Code Quality (ALWAYS run before commits)
```bash
# Frontend quality checks - run from frontend/
cd frontend
npm run lint                # Check TypeScript/React issues
npm run build              # Verify production build works

# Backend quality checks - run from root
python -m pytest backend/tests/ -v    # All backend tests
```

### Testing Workflow
```bash
# Frontend tests
cd frontend
npm run test               # Jest unit tests
npm run test:watch        # Watch mode for TDD

# Backend tests (run from root directory)
python -m pytest backend/tests/ -v                    # All tests verbose
python -m pytest backend/tests/integration/ -v        # Integration only
python -m pytest backend/tests/ -k "test_specific"    # Filter by name
```

## Architecture Overview

**Tech Stack**: Next.js 14 + TypeScript frontend, Flask + Python backend, MongoDB database, Firebase Auth, Claude AI integration

### Key Directory Structure
```
frontend/
├── components/ui/          # shadcn/ui base components (Button, Input, etc.)
├── components/parts/       # Custom app components (TaskItem, EditableSchedule)
├── lib/api/               # API clients (tasks.ts, calendar.ts, users.ts)
├── lib/types.ts           # TypeScript interfaces
└── hooks/                 # Custom React hooks

backend/
├── apis/                  # Flask routes (routes.py, calendar_routes.py)
├── services/              # Business logic (ai_service.py, schedule_service.py)
├── models/                # Pydantic data models
└── tests/                 # Backend tests
```

### Core Development Patterns

#### Frontend (ALWAYS follow these patterns)
- **Import Order**: (1) React/3rd-party (2) Components (3) Hooks (4) Types/Utils
- **Component Types**: Use `interface` for props, functional components with TypeScript
- **API Calls**: Use centralized clients in `lib/api/`, handle errors with try-catch
- **Styling**: Tailwind CSS with shadcn/ui components, use `@/*` imports
- **State**: React Context for global state (FormContext, AuthContext)

#### Backend (ALWAYS follow these patterns)
- **Layered Architecture**: Routes → Services → Models (see `product/backend-guide.md`)
- **Routes**: Flask Blueprints in `backend/apis/`, handle HTTP only
- **Services**: Business logic in `backend/services/`, coordinate data operations
- **Models**: Pydantic models with validation in `backend/models/`
- **Types**: Use Python type annotations, docstrings for functions
- **Naming**: snake_case for Python, camelCase for TypeScript

**For detailed backend implementation patterns, see `product/backend-guide.md`**

#### Task Model (Core Data Structure)
```typescript
interface Task {
  id: string                    // UUID
  text: string                  // Task description
  completed: boolean            // Status
  categories?: string[]         // AI-generated categories
  level?: number               // Indentation (0-n for hierarchy)
  parent_id?: string           // Parent task reference
  is_microstep?: boolean       // AI-generated breakdown
  source?: 'slack' | 'calendar' | 'manual'  // Origin
}
```

## Key Implementation Workflows

### Adding New Task Features
1. **ALWAYS update both models first**: `lib/types.ts` (frontend) + `backend/models/task.py`
2. **API endpoints**: Add to relevant route file in `backend/apis/`
3. **Frontend integration**: Update API client in `lib/api/tasks.ts`
4. **UI components**: Modify TaskItem or create new component in `components/parts/`
5. **ALWAYS write tests**: Frontend (Jest) + Backend (pytest)

### Working with AI Integration
```bash
# AI service endpoints in backend/services/ai_service.py
# Key functions:
# - categorize_tasks()        # Auto-categorize tasks
# - decompose_task()          # Break down complex tasks
# - generate_schedule()       # Create daily schedules
# - get_suggestions()         # Productivity suggestions
```

### Drag & Drop System Implementation
- **Core files**: `hooks/use-drag-drop-provider.tsx`, `hooks/use-drag-drop-task.tsx`
- **Library**: @dnd-kit with custom collision detection
- **Features**: Vertical reordering + horizontal indentation (parent-child relationships)
- **NEVER modify**: Keep existing drag logic intact, extend carefully

### External Integrations
- **Google Calendar**: Two-way sync via `backend/services/calendar_service.py`
- **Slack**: Message processing via Klavis AI MCP in `backend/services/slack_service.py`
- **Archive System**: `backend/services/archive_service.py` with routes at `/archive/task`

## Environment Setup

### Required Environment Variables
```bash
# Backend (.env) - REQUIRED for development
MONGODB_URI=mongodb://localhost:27017/yourdai
ANTHROPIC_API_KEY=sk-...                    # Claude API access
FIREBASE_ADMIN_CREDENTIALS=path/to/key.json # Firebase service account
KLAVIS_API_KEY=...                         # Slack integration (optional)

# Frontend (.env.local) - REQUIRED for development
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend URL
NEXT_PUBLIC_FIREBASE_API_KEY=...           # Firebase config
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...       # Firebase auth domain
```

### Database Collections (MongoDB)
- `users` - User profiles, integration settings
- `UserSchedules` - Daily task schedules and layouts
- `AISuggestions` - AI-generated recommendations
- `ArchivedTasks` - User archived task storage
- `calendar_events` - Synced Google Calendar events

## Critical Development Rules

### ALWAYS Do This Before Coding
1. **Understand context**: Read existing code patterns before implementing
2. **Ask clarifying questions**: If requirements are unclear, ask until confident
3. **Follow TDD**: Write tests first, then implement to pass tests
4. **Keep it SIMPLE**: Avoid unnecessary complexity or clever solutions
5. **Validate architecture**: Ensure changes maintain modular boundaries and SOLID principles
6. **Run quality checks**: `npm run lint` + `npm run build` + `pytest` before committing

### NEVER Do This
- **NEVER use `any` type** in TypeScript - use proper interfaces
- **NEVER skip error handling** - always use try-catch (JS) or try-except (Python)
- **NEVER commit without tests** - TDD is required
- **NEVER create unnecessary files** - prefer editing existing code
- **NEVER remove existing comments or code** unnecessarily
- **NEVER hardcode values** - use environment variables and constants

### Code Quality Standards
- **Type Safety**: Verify type consistency, check for null/undefined values
- **Error Handling**: Consider edge cases, validate against business rules
- **Documentation**: JSDoc comments for TypeScript, docstrings for Python
- **Performance**: Follow language/framework best practices
- **Reusability**: Create helper functions for common operations

### Implementation Process (Follow This Order)
1. **Parse requirements**: Understand acceptance criteria and dependencies
2. **Design approach**: Plan modular solution respecting architectural boundaries
3. **Write tests first**: Create test files before implementation
4. **Implement simply**: Code to pass tests, avoid over-engineering
5. **Document complex logic**: Add inline comments for non-obvious code
6. **Validate integration**: Test with existing components and services
7. **Update status**: Mark task complete after all checks pass

### When Stuck
- Check existing similar implementations in the codebase first
- Use `use context7` for up-to-date library documentation
- Follow the established patterns shown in existing components/services
- Understand module relationships and data flow patterns before making changes