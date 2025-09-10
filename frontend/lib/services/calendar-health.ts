/**
 * @file calendar-health.ts
 * @description Calendar Health Service - Isolated calendar connectivity testing
 * Following dev-guide.md: Single responsibility, simple implementation, comprehensive error handling
 */

import { auth } from '@/auth/firebase'
import { apiClient } from '@/lib/api/client'

export interface CalendarHealthResult {
  healthy: boolean
  skipReason?: 'already_validated' | 'oauth_in_progress' | 'no_user' | 'invalid_token'
  error?: 'calendar_auth_failed' | 'calendar_api_error' | 'network_error'
  needsReauth?: boolean
}

export type CalendarConnectionStage = 'connecting' | 'verifying' | 'complete' | null

/**
 * Service for testing Google Calendar API connectivity
 * Extracted from dashboard's complex validateCalendarHealth function
 * Follows single responsibility principle
 */
export class CalendarHealthService {
  private hasValidated = false

  /**
   * Test calendar API connectivity with comprehensive error handling
   * @param calendarStage - Current OAuth/connection stage
   * @param postOAuthActive - Whether post-OAuth handler is active
   * @returns Health status with specific error categorization
   */
  async validateCalendarHealth(
    calendarStage: CalendarConnectionStage = null,
    postOAuthActive = false
  ): Promise<CalendarHealthResult> {
    try {
      // Skip if already validated (prevents redundant calls)
      if (this.hasValidated) {
        return { healthy: true, skipReason: 'already_validated' }
      }

      // Skip during OAuth/calendar connection flows to prevent race conditions
      if (calendarStage || postOAuthActive) {
        return { healthy: true, skipReason: 'oauth_in_progress' }
      }

      // Wait for user authentication to be fully established
      const currentUser = auth.currentUser
      if (!currentUser) {
        return { healthy: true, skipReason: 'no_user' }
      }

      // Test calendar API connectivity using API Client (handles authentication automatically)
      const result = await this.testCalendarApi()
      
      // Mark as validated on successful test
      if (result.healthy) {
        this.hasValidated = true
      }
      
      return result

    } catch (error) {
      console.error('Calendar health validation error:', error)
      return {
        healthy: false,
        error: 'network_error',
        needsReauth: false
      }
    }
  }

  /**
   * Test actual calendar API endpoint using API Client
   * @returns API test result
   */
  private async testCalendarApi(): Promise<CalendarHealthResult> {
    try {
      const testDate = new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD

      // Use API Client for automatic token refresh and retry logic
      const response = await apiClient.get(`/api/calendar/events?date=${testDate}`)

      if (response.ok) {
        console.log('Calendar API working fine, no re-auth needed')
        return { healthy: true }
      }

      // Handle different error types
      if (response.status === 401 || response.status === 400) {
        console.log('Calendar API failed with auth error, needs re-authentication')
        return {
          healthy: false,
          error: 'calendar_auth_failed',
          needsReauth: true
        }
      }

      console.log('Calendar API failed with non-auth error:', response.status)
      return {
        healthy: false,
        error: 'calendar_api_error',
        needsReauth: false
      }

    } catch (error) {
      console.error('Calendar API test network error:', error)
      return {
        healthy: false,
        error: 'network_error',
        needsReauth: false
      }
    }
  }

  /**
   * Reset validation state (useful after calendar reconnection)
   */
  reset(): void {
    this.hasValidated = false
  }

  /**
   * Check if validation has already been performed
   */
  get isValidated(): boolean {
    return this.hasValidated
  }
}

// Export singleton instance
export const calendarHealthService = new CalendarHealthService()