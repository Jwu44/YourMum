import { type UserDocument } from '../types'
import { apiClient } from './client'

// Create a cache for categorization results
const categoryCache = new Map<string, Promise<{ categories: string[] }>>()

export const categorizeTask = async (taskText: string) => {
  const cacheKey = taskText.toLowerCase().trim()

  // Return cached promise if it exists
  if (categoryCache.has(cacheKey)) {
    return await categoryCache.get(cacheKey)
  }

  // Create new promise for categorization
  const categorizationPromise = (async () => {
    try {
      // Use API client with skipAuth since this endpoint doesn't require authentication
      const response = await apiClient.post('/api/categorize_task', 
        { task: taskText }, 
        { skipAuth: true }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Network response was not ok')
      }

      const data = await response.json()
      return { categories: data.categories || ['Uncategorized'] }
    } catch (error) {
      console.error('Error categorizing task:', error)
      return { categories: ['Uncategorized'] }
    }
  })()

  // Cache the promise
  categoryCache.set(cacheKey, categorizationPromise)

  return await categorizationPromise
}

// Optional: Add a method to clear the cache if needed
export const clearCategorizationCache = () => {
  categoryCache.clear()
}

/**
 * User API helper functions using centralized API client
 */
export const userApi = {
  /**
   * Get current authenticated user data including creation date
   */
  async getCurrentUser (): Promise<UserDocument> {
    try {
      const response = await apiClient.get('/api/auth/user')

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch user profile' }))
        throw new Error(error.error || 'Failed to fetch user profile')
      }

      const result = await response.json()
      return result.user
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw new Error('Failed to fetch user profile')
    }
  },

  /**
   * Get user creation date as a Date object
   */
  async getUserCreationDate (): Promise<Date> {
    try {
      const userData = await this.getCurrentUser()
      if (!userData.createdAt) {
        // Fallback to a default early date if createdAt is not available
        return new Date('2024-01-01')
      }
      return new Date(userData.createdAt)
    } catch (error) {
      console.error('Error getting user creation date:', error)
      // Fallback to a default early date on error
      return new Date('2024-01-01')
    }
  },

  /**
   * Update the user's timezone (one-off call when browser timezone differs)
   */
  async updateTimezone (timezone: string): Promise<{ success: boolean, timezone?: string, error?: string }> {
    try {
      const response = await apiClient.put('/api/user/timezone', { timezone })

      const result = await response.json().catch(() => ({} as any))
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update timezone' }
      }
      return { success: true, timezone: result.timezone }
    } catch (error) {
      console.error('Error updating timezone:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
