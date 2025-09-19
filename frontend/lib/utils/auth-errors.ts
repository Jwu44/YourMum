/**
 * @file auth-errors.ts
 * @description Centralized error categorization for authentication and calendar issues
 * Following dev-guide.md: Single responsibility, reusable utilities
 */

export type ErrorCategory = 'token' | 'calendar' | 'network' | 'general'

export interface CategorizedError {
  category: ErrorCategory
  message: string
  shouldShowToUser: boolean
  shouldStoreForRouting: boolean
}

/**
 * Categorize errors to distinguish between auth token issues and calendar connection problems
 * Prevents showing "Calendar Connection Issue" when the problem is actually Firebase auth
 */
export function categorizeAuthError(error: any, context: string): CategorizedError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // Check if this is a token-related error
  const isTokenError = errorMessage.includes('token') || 
                      errorMessage.includes('authentication') || 
                      errorMessage.includes('unauthorized') ||
                      error?.status === 401

  if (isTokenError) {
    console.error(`🔐 Token/Auth error in ${context}:`, errorMessage)
    return {
      category: 'token',
      message: errorMessage,
      shouldShowToUser: false, // API client handles token refresh automatically
      shouldStoreForRouting: false
    }
  }

  // Check if this is a network error
  const isNetworkError = errorMessage.includes('fetch') ||
                         errorMessage.includes('network') ||
                         errorMessage.includes('connection') ||
                         error?.code === 'NETWORK_ERROR'

  if (isNetworkError) {
    console.error(`🌐 Network error in ${context}:`, errorMessage)
    return {
      category: 'network',
      message: 'Network connection issue. Please check your internet connection.',
      shouldShowToUser: true,
      shouldStoreForRouting: false
    }
  }

  // Assume calendar-related error for other cases in calendar contexts
  const isCalendarContext = context.includes('calendar') || 
                            context.includes('Calendar') ||
                            context.includes('oauth') ||
                            context.includes('OAuth')

  if (isCalendarContext) {
    console.error(`📅 Calendar connection error in ${context}:`, errorMessage)
    return {
      category: 'calendar',
      message: errorMessage,
      shouldShowToUser: true,
      shouldStoreForRouting: true
    }
  }

  // General error
  console.error(`❌ General error in ${context}:`, errorMessage)
  return {
    category: 'general',
    message: errorMessage,
    shouldShowToUser: true,
    shouldStoreForRouting: false
  }
}

/**
 * Store calendar connection error for routing logic
 */
export function storeCalendarError(errorMessage: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('calendarConnectionError', JSON.stringify({
      error: errorMessage,
      action: 'redirect_to_integrations'
    }))
  }
}

/**
 * Clear stored calendar error
 */
export function clearStoredCalendarError(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('calendarConnectionError')
  }
}