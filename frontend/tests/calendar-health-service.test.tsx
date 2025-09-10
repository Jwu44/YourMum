/**
 * @file calendar-health-service.test.tsx
 * @description Tests for Calendar Health Service
 * Following dev-guide.md TDD principles - tests first, then implementation
 */

import { CalendarHealthService } from '@/lib/services/calendar-health'
import { auth } from '@/auth/firebase'
import { apiClient } from '@/lib/api/client'

// Mock dependencies
jest.mock('@/auth/firebase')
jest.mock('@/lib/api/users')
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn()
  }
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('CalendarHealthService', () => {
  let service: CalendarHealthService
  const mockUser = {
    getIdToken: jest.fn().mockResolvedValue('mock-token'),
    uid: 'test-user'
  }
  
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

  beforeEach(() => {
    service = new CalendarHealthService()
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
    mockApiClient.get.mockClear()
    ;(auth as any).currentUser = mockUser
    mockUser.getIdToken.mockResolvedValue('mock-token') // Reset mock
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('validateCalendarHealth', () => {
    it('should return early if already validated', async () => {
      // First call should validate
      mockApiClient.get.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await service.validateCalendarHealth()
      
      // Second call should return early
      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ healthy: true, skipReason: 'already_validated' })
      expect(mockApiClient.get).toHaveBeenCalledTimes(1)
    })

    it('should skip validation during OAuth flows', async () => {
      const result = await service.validateCalendarHealth('connecting')
      
      expect(result).toEqual({ 
        healthy: true, 
        skipReason: 'oauth_in_progress' 
      })
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should skip validation when no authenticated user', async () => {
      ;(auth as any).currentUser = null
      
      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ 
        healthy: true, 
        skipReason: 'no_user' 
      })
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should use API Client for calendar API requests', async () => {
      // Mock successful API Client response
      mockApiClient.get.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ healthy: true })
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/calendar/events?date=')
      )
      expect(fetch).not.toHaveBeenCalled() // Should not use direct fetch
      expect(mockUser.getIdToken).not.toHaveBeenCalled() // API Client handles auth
    })

    it('should return unhealthy when API Client returns auth error', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        ok: false,
        status: 401
      })

      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ 
        healthy: false, 
        error: 'calendar_auth_failed',
        needsReauth: true 
      })
    })

    it('should return unhealthy when API Client returns other error', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ 
        healthy: false, 
        error: 'calendar_api_error',
        needsReauth: false 
      })
    })

    it('should handle network errors gracefully', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ 
        healthy: false, 
        error: 'network_error',
        needsReauth: false 
      })
    })
  })

  describe('reset', () => {
    it('should reset validation state', async () => {
      // First validation
      mockApiClient.get.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })
      
      await service.validateCalendarHealth()
      expect(mockApiClient.get).toHaveBeenCalledTimes(1)

      // Reset and validate again
      service.reset()
      
      mockApiClient.get.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })
      
      await service.validateCalendarHealth()
      expect(mockApiClient.get).toHaveBeenCalledTimes(2)
    })
  })
})