import { type UserDocument, type Task } from '../types'
import { apiClient } from './client'
import { auth } from '@/auth/firebase'

// Use the calendar part of UserDocument type
type CalendarStatus = NonNullable<UserDocument['calendar']>

/**
 * Detect user's timezone using browser API with UTC fallback
 * @returns IANA timezone string (e.g., 'America/New_York', 'Australia/Sydney')
 */
function detectUserTimezone (): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.warn('Failed to detect timezone, falling back to UTC:', error)
    return 'UTC'
  }
}

export const calendarApi = {
  /**
   * Connect user's Google Calendar with stored credentials
   */
  async connectCalendar (credentials: {
    accessToken: string
    refreshToken?: string
    expiresAt: number
    scopes: string[]
  }) {
    const userTimezone = detectUserTimezone()

    const response = await apiClient.post('/api/calendar/connect', {
      credentials,
      timezone: userTimezone
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to connect calendar' }))
      throw new Error(error.error || 'Failed to connect calendar')
    }

    return await response.json()
  },

  /**
   * Disconnect user's Google Calendar
   */
  async disconnectCalendar (userId?: string) {
    // Backend expects { userId } in body
    const uid = userId || auth.currentUser?.uid
    if (!uid) {
      throw new Error('User not authenticated')
    }

    const response = await apiClient.post('/api/calendar/disconnect', { userId: uid })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to disconnect calendar' }))
      throw new Error(error.error || 'Failed to disconnect calendar')
    }

    return await response.json()
  },

  /**
   * Get calendar connection status for a user
   */
  async getCalendarStatus (userId: string): Promise<CalendarStatus> {
    const response = await apiClient.get(`/api/calendar/status/${userId}`, { skipAuth: true })

    if (!response.ok) {
      throw new Error('Failed to get calendar status')
    }

    const result = await response.json()
    // Backend returns calendar status directly, not nested under 'data'
    return result
  },

  /**
   * Fetch Google Calendar events for a specific date and convert them to tasks
   * @param date - Date in YYYY-MM-DD format or Date object
   * @returns Promise containing tasks created from calendar events
   */
  async fetchEvents (date: string | Date): Promise<{
    success: boolean
    tasks: Task[]
    count: number
    date: string
    error?: string
    notConnected?: boolean
  }> {
    // Convert Date object to string if needed
    const dateString = date instanceof Date
      ? this.formatDateString(date)
      : date

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return {
        success: false,
        tasks: [],
        count: 0,
        date: dateString,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }
    }

    try {
      const userTimezone = detectUserTimezone()

      const response = await apiClient.get(
        `/api/calendar/events?date=${encodeURIComponent(dateString)}&timezone=${encodeURIComponent(userTimezone)}`
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        // Check for specific calendar not connected error
        const isNotConnected = result.error?.includes('Google Calendar not connected')

        return {
          success: false,
          tasks: [],
          count: 0,
          date: dateString,
          error: result.error || `Failed to fetch calendar events (${response.status})`,
          notConnected: isNotConnected
        }
      }

      return {
        success: true,
        tasks: result.tasks || [],
        count: result.count || 0,
        date: result.date || dateString,
        notConnected: false
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      return {
        success: false,
        tasks: [],
        count: 0,
        date: dateString,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        notConnected: false
      }
    }
  },

  /**
   * Check if user has calendar connected and credentials are valid
   */
  async hasValidCalendarConnection (): Promise<boolean> {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) return false

      const status = await this.getCalendarStatus(currentUser.uid)
      return status.connected && Boolean(status.credentials)
    } catch (error) {
      console.error('Error checking calendar connection:', error)
      return false
    }
  },

  /**
   * Format date for API calls
   */
  formatDateForAPI (date: Date): string {
    return date.toISOString().split('T')[0]
  },

  /**
   * Get today's date formatted for API
   */
  getTodayFormatted (): string {
    return this.formatDateForAPI(new Date())
  },

  /**
   * Format a date to YYYY-MM-DD string for API calls
   * @param date - Optional Date object (defaults to today if not provided)
   * @returns Date string in YYYY-MM-DD format
   */
  formatDateString (date?: Date): string {
    const targetDate = date || new Date()
    return targetDate.toISOString().split('T')[0]
  }
}
