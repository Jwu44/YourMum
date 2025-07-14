# yourdAI 🤖📅

yourdAI transforms how knowledge workers manage their day to day by creating an AI-powered to do list that eliminates the friction between intention and execution. yourdai learns your unique energy patterns, automatically captures tasks from your scattered digital workspace, and generates intelligent daily schedules that align your most important work with your peak performance windows—giving you back time to focus on what truly matters while reducing the mental overhead of constant task management.
[main dashboard]

## ✨ Key Value Props

### ✏️ Personalisation
- **Inputs Capture**: Configure your work schedule, life priorities, energy patterns, to do list structure... 
[inputs  page] 

### 🦾 Automation
- **Google Calendar Sync**: Automatically syncs your events and tasks from google calendar to yourdai
[gcal auth page]
- **Next Day Task Roll Over**: Rolls over unfinished tasks from your current day to the next day
- **Slack Integration**: Auto-creates tasks from @mentions [👷 WIP]
- **Action Overhead Admin Tasks**: [🔮 vision] yourdAI will identify simple overhead admin tasks and will automatically create drafts for them or have them actioned (e.g.. booking meeting rooms, email draft, reply to colleage etc.) 

### 🏞️ Streamline
- **Connect 3rd Party Apps**: Real time syncing with Google Calendar, Slack [👷 WIP] and more!
[integrations page]

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **State**: React Context with reducer patterns
- **Auth**: Firebase Authentication

### Backend
- **API**: Flask with Blueprint architecture
- **Database**: MongoDB with schema validation
- **AI**: Anthropic Claude API (Sonnet & Haiku models)
- **Caching**: Multi-layer (TTL, LRU, pattern-based)

### External Services
- **Google Calendar API**: OAuth 2.0 with selective sync
- **Klavis AI**: Slack MCP server integration
- **Firebase**: Authentication and user management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.11+
- MongoDB instance
- Firebase project
- Anthropic API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/yourdai.git
cd yourdai
```

2. **Backend Setup**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Configure: MONGODB_URI, ANTHROPIC_API_KEY, FIREBASE_CONFIG
```

3. **Frontend Setup**
```bash
cd frontend
npm install

# Environment variables
cp .env.local.example .env.local
# Configure: NEXT_PUBLIC_FIREBASE_CONFIG, API_URL
```

### Development

```bash
# Backend (Port 8000)
python3 application.py

# Frontend (Port 3000)
cd frontend && npm run dev
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
MONGODB_URI=mongodb://localhost:27017/YourDaiSchedule
ANTHROPIC_API_KEY=your_anthropic_key
FIREBASE_ADMIN_CREDENTIALS=path/to/serviceAccount.json
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 Data Models

### Task Structure
```typescript
interface Task {
  id: string;
  text: string;
  categories: Set<string>;
  completed: boolean;
  is_microstep: boolean;
  parent_id?: string;
  estimated_time?: number;
  energy_level_required?: number;
  is_recurring?: RecurrenceType;
  source?: 'slack' | 'calendar' | 'manual';
}
```

### User Preferences
```typescript
interface UserDocument {
  googleId: string;
  email: string;
  preferences: {
    work_hours: { start: string; end: string };
    energy_patterns: string[];
    layout: LayoutPreference;
  };
  integrations: {
    calendar: CalendarSettings;
    slack: SlackSettings;
  };
}
```

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests  
python -m pytest backend/tests/

# Integration tests
python -m pytest backend/tests/integration/
```

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
---
