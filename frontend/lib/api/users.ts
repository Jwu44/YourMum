import { auth } from '@/auth/firebase'
import { type UserDocument } from '../types'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// Add development bypass constants
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

/**
 * Get the current user's Firebase ID token for API authentication
 */
async function getAuthToken (): Promise<string> {
  // In development mode with bypass enabled, return a mock token
  if (IS_DEVELOPMENT && BYPASS_AUTH) {
    return 'mock-token-for-development'
  }

  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('User not authenticated')
  }
  return await currentUser.getIdToken()
}

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
      const response = await fetch(`${API_BASE_URL}/api/categorize_task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: taskText }),
        // Add credentials to ensure cookies are sent with the request if needed
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
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
 * User API helper functions
 */
export const userApi = {
  /**
   * Get current authenticated user data including creation date
   */
  async getCurrentUser (): Promise<UserDocument> {
    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get user data')
      }

      const result = await response.json()
      return result.user
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw error
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
  }
}
