# TASK-14: Implement "Settings" page
Status: In Progress

## Problem
Missing settings page to manage profile, billing and account.

## Requirements
- Refer to the attached design on layout
- Display "Settings" heading
- Then display a smaller "Profile" heading
- Profile section should contain the following editable fields:
    - Name 
    - Email address
    - Job title
    - Age
- Then display a smaller "Billing" heading
- Billing section should contain:
    - "Subscription" field (not editable)
    - CTA: "Manage"
- Then display a smaller "Account" heading
- Account section should contain:
    - "Log out" text with CTA: "Log out" (don't implement log out functionality yet)
    - "Delete your account" with CTA: "Delete" (don't implement delete functionality yet)

## Implementation Progress

### ✅ Backend Schema & API Updates
- **Updated User Schema** (`backend/models/user_schema.py`):
  - Added `jobTitle` field: optional string, max 50 characters
  - Added `age` field: optional integer, range 1-150
- **Updated User Data Preparation** (`backend/apis/routes.py`):
  - Enhanced `_prepare_user_data_for_storage()` to handle new fields
  - Added validation for jobTitle (50 char limit) and age (numeric, 1-150 range)
  - Both fields default to `None` when not provided
- **Updated Database Helper** (`backend/db_config.py`):
  - Modified `create_or_update_user()` to include new profile fields
  - Added missing fields like `timezone` and `calendar` for completeness

### ✅ Frontend Type Definitions
- **Updated UserDocument Interface** (`frontend/lib/types.ts`):
  - Added `timezone?: string`, `jobTitle?: string`, `age?: number` fields
  - Added `ProfileFormData` interface for form handling
- **Created Settings API Helper** (`frontend/lib/api/settings.ts`):
  - `fetchUserProfile()` function to get user data from backend
  - `updateUserProfile()` function to update profile data

### ✅ Settings Page Implementation
- **Created Settings Page** (`frontend/app/settings/page.tsx`):
  - Exact layout matching design requirements: Profile → Billing → Account sections
  - Profile section with editable fields (Name, Email, Job title, Age) and save/cancel buttons
  - Billing section with subscription display and manage button
  - Account section with logout and delete buttons (no functionality yet)
- **Form Validation & State Management**:
  - Age validation: 1-150 range, numeric input only
  - Job title validation: max 50 characters
  - Save/cancel functionality for profile section only
  - Proper error handling and loading states
- **Layout Consistency**:
  - Uses `SidebarLayout` component for consistent navigation
  - Matches InputsConfig layout structure (`max-w-4xl`, `grid gap-6`)
  - Applied consistent top padding (`pt-24`) for visual alignment

### ✅ Navigation Integration
- **Updated AppSidebar** (`frontend/components/parts/AppSidebar.tsx`):
  - Made user avatar clickable to route to `/settings`
  - Added `handleSettingsNavigation()` function
  - Added proper cursor styling, hover effects, and accessibility features
  - Added keyboard navigation support (Enter/Space key activation)
- **Code Cleanup**:
  - Removed old `settings.tsx` file, keeping proper `page.tsx` for Next.js routing

### ✅ Layout Consistency Updates
- **Applied consistent top padding** across all pages:
  - Settings page: Added `pt-24` to header section
  - InputsConfig: Added `pt-24` to page header section  
  - IntegrationsLayout: Added `pt-24` to page header section
- **Height calculation**: Based on DashboardHeader height (~6rem = 96px) for uniform spacing

## Technical Details

### Backend Changes
- User schema validation includes new optional fields with proper constraints
- Existing `/api/auth/user` endpoints automatically support new fields
- No new API endpoints required - follows dev-guide.md guidelines

### Frontend Changes
- Uses existing shadcn/ui components and Tailwind CSS patterns
- Follows existing authentication patterns and error handling
- Maintains modular architecture with clear separation of concerns
- TypeScript with proper type definitions throughout

### Navigation Flow
- Users click avatar in sidebar → routes to `/settings`
- Settings page shows AppSidebar for consistent navigation
- Users can navigate back to dashboard via logo or sidebar items

## Files Modified/Created
- `backend/models/user_schema.py` - Added jobTitle and age fields
- `backend/apis/routes.py` - Updated user data preparation
- `backend/db_config.py` - Updated database helper
- `frontend/lib/types.ts` - Added new interfaces
- `frontend/lib/api/settings.ts` - Created settings API helper
- `frontend/app/settings/page.tsx` - Created settings page
- `frontend/components/parts/AppSidebar.tsx` - Added navigation
- `frontend/components/parts/InputsConfig.tsx` - Added consistent padding
- `frontend/components/parts/IntegrationsLayout.tsx` - Added consistent padding