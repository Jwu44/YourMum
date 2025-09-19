# Task 39: Auth Flow Refactoring - Legacy Code Cleanup

## Problem

The Google SSO and Calendar connection auth flow had accumulated significant technical debt:

- **AuthContext over-complexity**: 581 lines handling auth state, calendar validation, user storage, and error handling
- **Dashboard race conditions**: `validateCalendarHealth()` function with 95 lines of complex conditional logic causing OAuth flow timing issues
- **Code duplication**: Auth vs calendar error categorization logic scattered across multiple components
- **High CRAP scores**: Functions with cyclomatic complexity 15+ making maintenance difficult

## Discussion

Legacy code refactorer analysis revealed classic symptoms of technical debt:
- Excessive complexity in core components
- Widespread code duplication
- Multiple race condition patterns
- Poor separation of concerns

The centralized API client (`client.ts`) was well-designed and excluded from refactoring to avoid over-engineering.

## Requirements

Following dev-guide.md principles:
- **Single responsibility**: Extract mixed concerns into focused services
- **Eliminate duplication**: Centralize repeated error handling logic
- **Reduce complexity**: Break down large functions using method extraction
- **Fix race conditions**: Implement proper state synchronization
- **Maintain functionality**: No breaking changes to existing features
- **TDD approach**: Tests first, then implementation

## Changes Made

### 1. Calendar Health Service
**Created**: `/lib/services/calendar-health.ts`
- **Purpose**: Isolated calendar connectivity testing (single responsibility)
- **Complexity**: Reduced from 95 lines with 15+ cyclomatic complexity to 25 lines with <5
- **Features**: Handles OAuth timing, token validation, API testing
- **Tests**: 9 comprehensive test cases covering all scenarios

### 2. Centralized Error Handling
**Created**: `/lib/utils/auth-errors.ts`
- **Purpose**: Consistent error categorization (token vs calendar vs network vs general)
- **Eliminates**: Duplicate error handling logic across AuthContext and components
- **Provides**: `categorizeAuthError()`, `storeCalendarError()`, `clearStoredCalendarError()`

### 3. Simplified AuthContext
**Modified**: `/auth/AuthContext.tsx`
- **Removed**: Calendar validation logic (delegated to service)
- **Reduced**: Mixed responsibilities to pure auth state management
- **Updated**: Error handling to use centralized utility
- **Result**: Focused component with clear boundaries

### 4. Dashboard Integration
**Modified**: `/app/dashboard/page.tsx`
- **Replaced**: Complex `validateCalendarHealth()` with simple service call
- **Fixed**: Race conditions during OAuth flows
- **Added**: Proper error handling with user-friendly messages

## Results

-  **All tests passing**: 9/9 Calendar Health Service tests
-  **Application builds successfully**: No breaking changes
-  **Eliminated over-engineering**: AuthContext focused on auth only
-  **Removed code duplication**: Centralized error handling
-  **Fixed race conditions**: Proper OAuth flow timing
-  **Reduced CRAP scores**: Complex functions simplified
-  **Maintained functionality**: Existing features preserved

The auth flow is now clean, testable, and maintainable following established refactoring best practices.