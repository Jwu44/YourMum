[ ] I've tried refactoring the implementation for generating a schedule so that it can scale towards a schedule that can flexibly change to different layouts (structured to do list , unstructured to do list, kanban, calendar etc.) and for each schedule order the tasks in different patterns (timebox, batching, alternating, 3 3 3 etc). I'd like you to review the attached refactored code to see if it matches the following scope of requirements:

- ai_service.py should be responsible for generating the schedule with the optimal task ordering pattern based on the user's preference. The frontend should only be concerned with displaying and interacting with the already-ordered schedule, not implementing the ordering logic itself. Here's the pseudo steps:
  1. The frontend sends a request with layout preferences and task ordering pattern preference to the backend
  2. The AI model in ai_service.py generates a schedule following that pattern, leveraging its understanding
  of tasks and context
  3. The frontend receives a pre-ordered schedule and only handles rendering and user interaction
- In generate_schedule in ai_service.py, I'd like to the output to return a structured json format of the  schedule which we can parse locally to render the UI. 
- In future I'd like to scale towards different schedule layouts like kanban or calendar. But for our first version, I'd like a field in the schedule object to cater for these layouts. But we will not be implementing them as I'd like to focus on just the structured and unstructured to do list layout.
- Task relationships like parent-child subtasks or a task's categories should always be maintained upon updating the schedule. 

Clarification to task patterns:
  - I'd like to refactor the schedule generation and also the frontend if necessary so it's more modular. The use case is for when a user chooses different combinations of schedule layouts and task ordering patterns,we should be able to process this quickly.
  
- The 3-3-3 method Popularized by Oliver Burkeman in Four Thousand Weeks: Time Management for Mortals, divides the workday into three distinct phases to optimize focus:
    1. Focus for 3 hours on #1 priority
    2. Focus on 3 shorter tasks/medium
    3. Focus on 3 maintenance tasks like health
- "Alternating" task pattern means switching between different types of tasks. Alternating blocks: 90 minutes of analytical work → 30 minutes of creative tasks → 60 minutes of collaborative activities.
- "Batching" task pattern means grouping similar tasks together within a timbe block. Example of alternating: Example of batching: "Theme-based blocks: Dedicate Tuesday mornings to financial tasks (budgeting, invoicing) and Thursday afternoons to creative work (brainstorming, design) or Skill-aligned batches: Cluster analytical tasks (data analysis, coding) in one block and interpersonaltasks (calls, mentoring) in another.

Summary of the changes I've made to refactor the schedule generation logic:

  1. Created a more modular scheduleHelper.tsx file that:
    - Focuses on rendering and transforming schedules
    - Delegates task ordering logic to the AI service
    - Provides clean helper functions for different operations
    - Handles backward compatibility with the old layout system
    - Removed the 'timeboxed' field in favor of using 'orderingPattern' throughout the system
  2. Updated the types in types.ts to support:
    - New schedule layout types (todolist, kanban, calendar)
    - Different task ordering patterns (timebox, batching, alternating, 3-3-3)
    - Enhanced layout preferences with better separation of concerns
  3. Modified ai_service.py to:
    - Handle task ordering patterns in the schedule generation
    - Return structured JSON for easier frontend processing
    - Generate optimized schedules based on user preferences
  4. Refactored frontend components:
    - EditableSchedule now uses the new layout system
    - Dashboard page uses direct schedule generation instead of text parsing
    - Schedule handling is more modular and maintainable

  These changes separate concerns properly:
  - The AI service handles the task ordering and scheduling logic
  - The frontend handles presentation and interaction
  - The scheduleHelper module bridges the two with transform functions