# Status: To Do
As a first time user, I am facing a bug where my manually added tasks have been deleted after clicking "Save" to trigger schedule gen in @preferences page

# Steps to reproduce:
1. As a first time user, complete google sso and arrive on /dashboard 
2. I see my gcal tasks for today have been synced
3. I manually add tasks for today
4. Go to /preferences and fill out details
5. Click "Save"
6. Bug: all manually added tasks are gone, only calendar synced tasks remain


# Expected behaviour:
- the response from schedule gen should have shown the schedule containing all tasks in the most optimal order
- both gcal synced and manually added tasks should be there
- also any gcal sourced tasks should have the gcal logo and their start-end times preserved and displayed in @editableschedulerow, currently they don't show unless a page refresh is triggered

# Backend server logs
✅ User found by Firebase UID: justin.wu4444@gmail.com
[TIMING] Validation and authentication: 0.097s
[TIMING] Existing schedule lookup: 0.096s
[TIMING] generate_schedule started
[CATEGORIZATION] Task 'Reservation at BRAZA Churrascaria - Darling Quarter' needs categorization. Current categories: set()
[CATEGORIZATION] Task 'joint bday dinner' needs categorization. Current categories: set()
[TIMING] Task registry creation: 0.000s
[TIMING] Task categorization (LLM call): 1.928s
[TIMING] Local section generation: 0.000s
[SCHEDULE_GEN] Creating ordering prompt for 2 tasks
[SCHEMA_CONVERSION] Combined pattern: ['alternating', 'timebox']
[SCHEDULE_GEN] Attempting to create enhanced prompt with RAG system
[SCHEDULE_GEN] Parameters: subcategory='day-sections', pattern='['alternating', 'timebox']', tasks=2
[TIMING] create_enhanced_ordering_prompt_content started
[RAG] Creating enhanced prompt for subcategory='day-sections', pattern='['alternating', 'timebox']'
[TIMING] Pattern definitions loading: 0.000s
[RAG] Loaded 6 pattern definitions
[TIMING] retrieve_schedule_examples started
[RAG] Searching for examples: subcategory='day-sections', pattern='['alternating', 'timebox']'
[RAG] Cache miss - loading templates from disk
[RAG] Loading templates from: /app/backend/data/schedule_templates.json
[RAG] Successfully loaded 122 templates
[RAG] Templates cached successfully
[TIMING] Template cache access: 0.001s
[RAG] Searching through 122 total templates
[RAG] Found matching compound template: day-sections-alternating-1
[RAG] Found matching compound template: day-sections-alternating-2
[RAG] Found matching compound template: day-sections-alternating-4
[RAG] Search results: 3 matches found
[RAG] Stats: 122 checked, 0 invalid, 92 subcategory mismatches, 27 pattern mismatches
[TIMING] retrieve_schedule_examples: 0.001s
[TIMING] Schedule examples retrieval: 0.001s
[TIMING] Examples formatting: 0.000s
[RAG] Formatted examples length: 727 characters
[RAG] Added 2 pattern definitions to prompt
[RAG] Added examples section to prompt
[RAG] Generated enhanced prompt with 2767 characters
[TIMING] Total create_enhanced_ordering_prompt_content: 0.001s
[SCHEDULE_GEN] Successfully created enhanced prompt
[TIMING] Ordering prompt creation: 0.001s
[SCHEDULE_GEN] Calling LLM with prompt length: 2767 characters
[TIMING] LLM ordering call: 4.648s
[SCHEDULE_GEN] Received LLM response length: 790 characters
[SCHEDULE_GEN] Response preview: {
    "placements": [
        {
            "task_id": "2p2rmfhqlqdfccrgns6amt61lo", 
            "section": "Evening", 
            "order": 1, 
            "time_allocation": "17:00 - 18:00"
       ...
[SCHEDULE_GEN] Processing response of length: 790
[SCHEDULE_GEN] Extracted JSON content: {
    "placements": [
        {
            "task_id": "2p2rmfhqlqdfccrgns6amt61lo", 
            "section": "Evening", 
            "order": 1, 
            "time_allocation": "17:00 - 18:00"
       ...
[SCHEDULE_GEN] Found 2 placements in response
[SCHEDULE_GEN] Validated 2 placements
[TIMING] Response processing: 0.000s
[TIMING] Final schedule assembly: 0.000s

# Console logs
🚀 Dashboard: Conditions met, loading initial schedule...
page-2667fc065e2caece.js:1 📋 Dashboard: Starting simplified loadInitialSchedule...
page-2667fc065e2caece.js:1 📅 Dashboard: Attempting to load existing schedule for: 2025-09-23
layout-dbbe637500182cb6.js:1 RouteGuard State: Object
page-2667fc065e2caece.js:1 User creation date: Tue Sep 23 2025 04:57:27 GMT+1000 (Australian Eastern Standard Time)
page-2667fc065e2caece.js:1 ✅ Dashboard: Found existing schedule with 5 tasks
page-2667fc065e2caece.js:1 ✅ Rendering optimized backend structure