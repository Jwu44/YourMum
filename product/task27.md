# User Story: Decouple Timing from Task Ordering Patterns

## Story
**As a** user configuring my daily schedule  
**I want to** separately choose my time management style (timeboxed vs flexible) and optionally add an ordering pattern  
**So that** I can get more personalized schedules that match both my time preferences and task organization needs

## Background
Currently, "timebox" and "untimebox" are incorrectly coupled with ordering patterns (batching, alternating, 3-3-3) as mutually exclusive options. This prevents users from combining timing preferences with organizational patterns, which the backend templates already support (e.g., `["alternating", "timebox"]`).

## Problem Statement
- Users cannot select combinations like "timeboxed + batching" or "flexible timing + alternating"
- The RAG system cannot properly match templates that use combined patterns
- The UI presents timing and ordering as mutually exclusive when they are orthogonal concepts
- Template matching fails because frontend sends single values while templates expect combinations

## Requirements

### Schema Changes
1. **Add new field** `timing` to `layout_preference`:
   ```typescript
   interface LayoutPreference {
     layout: string                    // existing
     subcategory: string               // existing  
     timing: "timebox" | "untimebox"  // NEW
     orderingPattern?: string          // existing, now optional
   }
   ```

2. **Maintain backward compatibility** in backend by converting the new schema to combined format for template matching

### Frontend Implementation
1. **Two-step selection UI**:
   - Step 1: Time Management Style (Required)
     - Timeboxed: Tasks with specific time allocations
     - Flexible timing: Tasks without specific times
   - Step 2: Task Ordering Pattern (Optional)
     - Default ordering (none selected)
     - Batching: Group similar activities
     - Alternating: Alternate between energy levels
     - 3-3-3: 3 hours focus, 3 medium tasks, 3 maintenance

2. **Update `InputsConfig.tsx`**:
   - Replace single task ordering section with two-step selection
   - Update `handleTaskOrderingChange` to set both `timing` and `orderingPattern`
   - Preserve all selections when switching between options

3. **Update form context and types**:
   - Add `timing` field to `LayoutPreference` type
   - Set defaults: `timing: "untimebox"`, `orderingPattern: null`

### Backend Implementation
1. **Update `schedule_gen.py`**:
   - Accept new schema with separate `timing` and `orderingPattern`
   - Convert to combined format for template matching:
     ```python
     # If orderingPattern exists, combine with timing
     if ordering_pattern:
         pattern_for_matching = [ordering_pattern, timing]
     else:
         pattern_for_matching = timing
     ```

2. **Update RAG system** (`schedule_rag.py`):
   - Handle pattern matching with new combined format
   - Maintain compatibility with existing templates

3. **Canonical value for 3-3-3**:
   - Use "3-3-3" consistently across frontend and backend
   - Update any references from "three-three-three" to "3-3-3"

## Implementation Progress ✅ COMPLETED

### Phase 1: Testing Infrastructure
- [x] **Frontend Tests**: Created comprehensive test suite for timing/ordering decoupling (TimingOrderingDecoupling.test.tsx, 23 tests)
- [x] **Backend Tests**: Created schema conversion tests (test_timing_ordering_schema.py, 9 tests)

### Phase 2: Schema Updates  
- [x] **TypeScript Types**: Updated `LayoutPreference` interface with `timing: TimingPattern` and `orderingPattern?: TaskOrderingPattern`
- [x] **FormContext**: Set proper defaults - `timing: 'untimebox'`, `orderingPattern: undefined`

### Phase 3: Frontend Implementation
- [x] **Two-step UI**: Implemented separate timing and ordering pattern sections in InputsConfig.tsx
- [x] **Horizontal Card Layout**: Both sections use consistent grid-based card components (md:grid-cols-2 for timing, md:grid-cols-3 for ordering)
- [x] **Visual Design**: Purple theme selection, proper hover states, optional badge for ordering patterns

### Phase 4: Backend Implementation  
- [x] **Schema Conversion**: Updated schedule_gen.py to handle separate `timing` and `orderingPattern` fields
- [x] **Combined Pattern Logic**: Converts `[orderingPattern, timing]` for template matching
- [x] **RAG System**: Updated schedule_rag.py to support combined patterns
- [x] **Backward Compatibility**: Legacy single orderingPattern field with deprecation warnings

### Phase 5: Bug Fixes & Validation
- [x] **TypeScript Compilation**: Fixed all compilation errors (import issues, type mismatches)
- [x] **CSS Styles**: Added missing timing-card CSS classes for proper rendering
- [x] **Test Coverage**: All tests passing (23 frontend + 9 backend)

## Acceptance Criteria ✅ COMPLETED

### Functional Requirements ✅
- [x] User can select timing preference (timebox/untimebox) independently of ordering patterns
- [x] User can optionally add an ordering pattern (batching/alternating/3-3-3) to any timing choice
- [x] All 8 possible combinations work correctly:
  - Timebox only ✅
  - Timebox + Batching ✅
  - Timebox + Alternating ✅
  - Timebox + 3-3-3 ✅
  - Untimebox only ✅
  - Untimebox + Batching ✅
  - Untimebox + Alternating ✅
  - Untimebox + 3-3-3 ✅
- [x] Subcategory selection only appears for structured layouts (existing behavior maintained)
- [x] Form preserves all selections when switching between options

### Technical Requirements ✅
- [x] Frontend sends new schema format with `timing` field
- [x] Backend correctly converts new format to combined pattern for template matching
- [x] RAG system successfully retrieves examples for all combinations
- [x] Schedule generation works with new schema
- [x] Existing schedules continue to work (backward compatibility with deprecation warnings)
- [x] New schedules use the updated input fields

### UI/UX Requirements ✅
- [x] Clear visual separation between Step 1 (timing) and Step 2 (ordering)
- [x] Step 2 clearly marked as optional with badge
- [x] Selected options highlighted with purple theme colors
- [x] Visual feedback shows current selection combination
- [x] Mobile-responsive design maintained (grid-cols-1 on mobile)

### Testing Criteria ✅
- [x] Unit tests for schema conversion logic (test_timing_ordering_schema.py)
- [x] Integration tests for all 8 combination scenarios (TimingOrderingDecoupling.test.tsx)
- [x] RAG system correctly matches templates for each combination
- [x] Form state properly maintains selections during user interaction
- [x] Generated schedules reflect the selected timing and ordering patterns

## Definition of Done ✅ COMPLETED
- [x] Code implemented and reviewed
- [x] All acceptance criteria met
- [x] Tests written and passing (32 total tests)
- [x] Documentation updated (this file)
- [x] Deployed to production without breaking existing functionality

## Key Changes Made

### Frontend Files Modified
- `lib/types.ts`: Updated LayoutPreference interface
- `lib/FormContext.tsx`: Set proper defaults for timing/ordering
- `components/parts/InputsConfig.tsx`: Two-step UI with horizontal card layouts
- `app/globals.css`: Added missing timing-card and ordering-card CSS styles

### Backend Files Modified  
- `services/schedule_gen.py`: Schema conversion logic with deprecation warnings
- `services/schedule_rag.py`: Combined pattern support for template matching

### Test Files Created
- `frontend/tests/TimingOrderingDecoupling.test.tsx`: Comprehensive UI testing (23 tests)
- `backend/tests/test_timing_ordering_schema.py`: Schema conversion testing (9 tests)

## Technical Notes
- Default values: `timing: "untimebox"`, `orderingPattern: null`
- No database migration needed - new schema applied on next save
- Maintain backward compatibility in backend for smooth transition
- Use "3-3-3" as canonical value (not "three-three-three")

## Priority
High - This is a fundamental architecture fix that improves schedule quality and unblocks future pattern additions

## Estimated Effort
- Frontend: 4-6 hours
- Backend: 3-4 hours  
- Testing: 2-3 hours
- Total: ~1.5-2 days