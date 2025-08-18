/**
 * Timezone Detection Utility
 * 
 * Provides robust timezone detection and validation for the application.
 * Uses browser APIs with intelligent fallbacks to ensure reliable timezone handling.
 */

/**
 * Detect the user's timezone from browser APIs
 * @returns IANA timezone string (e.g., 'Australia/Sydney')
 */
export function detectBrowserTimezone(): string {
  try {
    // Use Intl API to get user's actual timezone
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Validate the detected timezone
    if (isValidTimezone(detected)) {
      return detected
    }
  } catch (error) {
    console.warn('Browser timezone detection failed:', error)
  }
  
  // Fallback to Australia/Sydney (user's location)
  return 'Australia/Sydney'
}

/**
 * Validate if a timezone string is a valid IANA timezone
 * @param tz - Timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || tz === 'UTC' || tz === 'GMT') {
    // Reject UTC/GMT as they're not real user locations
    return false
  }
  
  try {
    // Test if timezone is valid by trying to format with it
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Get a reliable timezone using fallback chain
 * @param userTimezone - User's stored timezone preference
 * @returns Reliable IANA timezone string
 */
export function getReliableTimezone(userTimezone?: string | null): string {
  // Priority fallback chain
  const candidates = [
    userTimezone,                    // User's stored preference
    detectBrowserTimezone(),         // Browser detection
    'Australia/Sydney'               // Final fallback (user's location)
  ]
  
  for (const candidate of candidates) {
    if (candidate && isValidTimezone(candidate)) {
      return candidate
    }
  }
  
  return 'Australia/Sydney'
}

/**
 * Check if user's stored timezone needs updating
 * @param userTimezone - User's current stored timezone
 * @returns true if update is needed, false otherwise
 */
export function shouldUpdateUserTimezone(userTimezone?: string | null): boolean {
  if (!userTimezone || userTimezone === 'UTC' || userTimezone === 'GMT') {
    // Always update if user has no timezone or has invalid UTC/GMT
    return true
  }
  
  const browserTimezone = detectBrowserTimezone()
  
  // Update if browser detected a different, valid timezone
  return browserTimezone !== userTimezone && isValidTimezone(browserTimezone)
}

/**
 * Get timezone to use for calendar operations
 * Ensures we never use UTC for user operations
 * @param userTimezone - User's stored timezone
 * @returns Timezone safe for calendar operations
 */
export function getCalendarTimezone(userTimezone?: string | null): string {
  const reliable = getReliableTimezone(userTimezone)
  
  // Extra safety: never return UTC for calendar operations
  if (reliable === 'UTC' || reliable === 'GMT') {
    return 'Australia/Sydney'
  }
  
  return reliable
}