# YourMum 🤖📅
🔗 https://yourmum.app/ 
[currently gated behind Vercel for beta testing]

YourMum transforms how knowledge workers manage their day to day by creating an AI-powered to do list that eliminates the friction between intention and execution. 

YourMum learns your unique energy patterns, automatically captures tasks from your scattered digital workspace, and generates intelligent daily schedules that align your most important work with your peak performance windows—giving you back time to focus on what truly matters while reducing the mental overhead of constant task management.

<img width="1920" height="965" alt="dashboard" src="https://github.com/user-attachments/assets/7e27e3d5-eb8f-4034-897f-ead699569f3f" />

## ✨ Key Value Props

### ✏️ Personalisation
- **Inputs Capture**: Configure your work schedule, life priorities, energy patterns, to do list structure... 
<img width="1667" height="600" alt="inputs config" src="https://github.com/user-attachments/assets/ab1e4c99-df9d-45f3-9720-f69acb1db8fd" />
<img width="1666" height="600" alt="inputs config b" src="https://github.com/user-attachments/assets/b360a31e-965f-44d6-91df-d71dcd7f9f96" />
<img width="1654" height="600" alt="inputs config c" src="https://github.com/user-attachments/assets/ed85a0c9-182b-4905-892e-961d45ed5510" />



### 🦾 Automation
- **Google Calendar Sync**: Auto syncs your events and tasks from google calendar to YourMum
<img width="1282" height="789" alt="Screenshot 2025-07-14 at 11 19 50 am" src="https://github.com/user-attachments/assets/0db83202-e3bc-4041-9084-0d88dd3b6bf0" />

- **Categorise your tasks** Auto categorises your tasks for the day based on configured life priorities
<img width="1337" height="898" alt="edit task" src="https://github.com/user-attachments/assets/2d2bda3b-3b88-4a48-ba68-510291b5dddb" />

- **Next Day Task Roll Over**: Rolls over unfinished tasks from your current day to the next day
<img width="1324" height="446" alt="next day" src="https://github.com/user-attachments/assets/6fb7caed-92e1-4c79-b45c-58f72ca71ba2" />

- **Task Decompositionr**: Breaksdown complex tasks into more actionable mini steps
<img width="900" height="320" alt="decompe task" src="https://github.com/user-attachments/assets/b96e99ec-97ab-414b-8866-86447ff3a948" />
<img width="900" height="549" alt="decomposed" src="https://github.com/user-attachments/assets/53a3d279-d16e-4f75-aa2f-cbcc164c8384" />


- **Slack Integration**: Auto-creates tasks from @mentions [👷 WIP]
- **Action Overhead Admin Tasks**: [🔮 vision] yourdAI will identify simple overhead admin tasks and will automatically create drafts for them or have them actioned (e.g.. booking meeting rooms, email draft, reply to colleage etc.) 

### 🏞️ Streamline
- **Connect 3rd Party Apps**: Real time syncing with Google Calendar, Slack [👷 WIP] and more!
<img width="1659" height="750" alt="integrations" src="https://github.com/user-attachments/assets/f08fd459-8854-4858-b801-823b84b146f3" />


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
