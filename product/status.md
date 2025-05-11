## ✅ Completed Features
- Modular schedule generation refactoring
  - Separating frontend rendering from AI-based ordering logic
  - Structured JSON format for generated schedules
  - Implemented multiple task ordering patterns (timeboxed, batching, alternating, 3-3-3)
- Enhanced schedule visualization
  - Structured (sections) and unstructured layouts
  - Parent-child task relationships with subtasks
  - Visual drag indicators for task reordering and indentation

## 🏗️ In Progress
- Modular schedule generation refactoring
  - Schedule generation optimisation
- Google Calendar integration via MCP server
  - Backend API routes implemented
  - Frontend implementation partially complete but experiencing authentication issues
  - 401 Unauthorized errors when attempting to connect to Google Calendar
  - Suspected timing issue with Firebase auth token
  - Next: Implement proper auth state handling with delayed API calls or forced token refresh

## Next
- AI suggestion system improvements
  - Personalized recommendations based on historical data
  - More transparent AI decision-making
- External calendar system integration refinements
  - Complete Google Calendar integration
  - Add support for other calendar services

## Known Issues
- Some performance bottlenecks with large schedule generation
- Need better syncing between backend DB and frontend state
- Nested tasks maintenance during schedule updates requires improvement
- Google Calendar connection failing with 401 Unauthorized despite successful authentication