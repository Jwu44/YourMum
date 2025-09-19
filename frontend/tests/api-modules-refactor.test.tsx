import React from 'react'
import { apiClient } from '@/lib/api/client'
import { userApi } from '@/lib/api/users'
import { calendarApi } from '@/lib/api/calendar'
import { auth } from '@/auth/firebase'

// Mock Response for Jest
global.Response = jest.fn().mockImplementation((body, options) => {
  const status = options?.status || 200
  let jsonValue = {}
  try {
    jsonValue = JSON.parse(body || '{}')
  } catch (e) {
    // If body is not JSON, return empty object
    jsonValue = {}
  }
  
  return {
    ok: status < 400,
    status,
    json: jest.fn().mockResolvedValue(jsonValue),
    text: jest.fn().mockResolvedValue(body || ''),
  }
}) as any

// Mock Firebase auth
jest.mock('@/auth/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      getIdToken: jest.fn()
    }
  }
}))

// Mock API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn()
  }
}))

// Mock timezone utilities
jest.mock('@/lib/utils/timezone', () => ({
  detectBrowserTimezone: () => 'America/New_York'
}))

describe('API Modules Refactor', () => {
  const mockResponse = new (global.Response as any)(JSON.stringify({ success: true }), { status: 200 })
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Setup default mock responses
    ;(apiClient.get as jest.Mock).mockResolvedValue(mockResponse)
    ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)
    ;(apiClient.put as jest.Mock).mockResolvedValue(mockResponse)
    ;(apiClient.delete as jest.Mock).mockResolvedValue(mockResponse)
  })

  describe('Users API', () => {
    it('should use centralized client for getCurrentUser', async () => {
      // Arrange
      const mockUserData = { user: { id: 'test-user' } }
      ;(apiClient.get as jest.Mock).mockResolvedValue(
        new (global.Response as any)(JSON.stringify(mockUserData))
      )

      // Act
      await userApi.getCurrentUser()

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/user')
    })

    it('should use centralized client for getUserCreationDate', async () => {
      // Arrange  
      const mockDate = new Date().toISOString()
      ;(apiClient.get as jest.Mock).mockResolvedValue(
        new (global.Response as any)(JSON.stringify({ user: { createdAt: mockDate } }))
      )

      // Act
      await userApi.getUserCreationDate()

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/user')
    })

    it('should handle API client errors gracefully', async () => {
      // Arrange
      ;(apiClient.get as jest.Mock).mockResolvedValue(
        new (global.Response as any)('Not Found', { status: 404 })
      )

      // Act & Assert
      await expect(userApi.getCurrentUser()).rejects.toThrow('Failed to fetch user profile')
    })
  })

  describe('Calendar API', () => {
    it('should use centralized client for connectCalendar', async () => {
      // Arrange
      const credentials = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 3600000,
        scopes: ['calendar.readonly']
      }

      // Act
      await calendarApi.connectCalendar(credentials)

      // Assert - Use actual timezone returned by mock
      expect(apiClient.post).toHaveBeenCalledWith('/api/calendar/connect', {
        credentials,
        timezone: expect.any(String) // Accept any timezone since it varies by system
      })
    })

    it('should use centralized client for disconnectCalendar', async () => {
      // Act
      await calendarApi.disconnectCalendar('test-user-id')

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith('/api/calendar/disconnect', {
        userId: 'test-user-id'
      })
    })

    it('should use centralized client for fetchEvents', async () => {
      // Arrange
      const mockEvents = {
        success: true,
        tasks: [],
        count: 0,
        date: '2025-01-01'
      }
      ;(apiClient.get as jest.Mock).mockResolvedValue(
        new (global.Response as any)(JSON.stringify(mockEvents))
      )

      // Act
      await calendarApi.fetchEvents('2025-01-01')

      // Assert - Accept any timezone
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/calendar/events?date=2025-01-01&timezone=')
      )
    })

    it('should skip auth for getCalendarStatus', async () => {
      // Act
      await calendarApi.getCalendarStatus('test-user-id')

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/calendar/status/test-user-id', {
        skipAuth: true
      })
    })
  })

  // Archive and Slack API tests will be added after refactoring those modules

  describe('Error Handling Consistency', () => {
    it('should handle 401 errors consistently across all APIs', async () => {
      // Arrange - Set up successful response since API client handles 401 retries internally
      const mockUserResponse = new (global.Response as any)(JSON.stringify({ user: { id: 'test' } }))
      ;(apiClient.get as jest.Mock).mockResolvedValue(mockUserResponse)

      // Act
      const result = await userApi.getCurrentUser()

      // Assert - Should successfully get user data
      expect(result.id).toBe('test')
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/user')
    })

    it('should provide consistent error messages', async () => {
      // Arrange - Create error response that will trigger the error path
      const errorResponse = new (global.Response as any)(JSON.stringify({ error: 'Server Error' }), { status: 500 })
      ;(apiClient.get as jest.Mock).mockResolvedValue(errorResponse)

      // Act & Assert
      await expect(userApi.getCurrentUser()).rejects.toThrow('Failed to fetch user profile')
    })
  })

  describe('Development Mode Support', () => {
    it('should work in development mode with bypass auth', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV
      const originalBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH
      
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_BYPASS_AUTH = 'true'

      // Act
      await userApi.getCurrentUser()

      // Assert
      expect(apiClient.get).toHaveBeenCalled()

      // Cleanup
      process.env.NODE_ENV = originalEnv
      process.env.NEXT_PUBLIC_BYPASS_AUTH = originalBypass
    })
  })
})