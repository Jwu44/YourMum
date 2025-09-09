/**
 * @file calendar-health-service.test.tsx
 * @description Tests for Calendar Health Service
 * Following dev-guide.md TDD principles - tests first, then implementation
 */

import { CalendarHealthService } from '@/lib/services/calendar-health'
import { auth } from '@/auth/firebase'

// Mock dependencies
jest.mock('@/auth/firebase')
jest.mock('@/lib/api/users')

// Mock fetch globally
global.fetch = jest.fn()

describe('CalendarHealthService', () => {
  let service: CalendarHealthService
  const mockUser = {
    getIdToken: jest.fn().mockResolvedValue('mock-token'),
    uid: 'test-user'
  }

  beforeEach(() => {
    service = new CalendarHealthService()
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
    ;(auth as any).currentUser = mockUser
    mockUser.getIdToken.mockResolvedValue('mock-token') // Reset mock
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('validateCalendarHealth', () => {
    it('should return early if already validated', async () => {
      // First call should validate
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await service.validateCalendarHealth()
      
      // Second call should return early
      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ healthy: true, skipReason: 'already_validated' })
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should skip validation during OAuth flows', async () => {
      const result = await service.validateCalendarHealth('connecting')
      
      expect(result).toEqual({ 
        healthy: true, 
        skipReason: 'oauth_in_progress' 
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should skip validation when no authenticated user', async () => {
      ;(auth as any).currentUser = null
      
      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ 
        healthy: true, 
        skipReason: 'no_user' 
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should skip validation when token is invalid', async () => {
      mockUser.getIdToken.mockRejectedValueOnce(new Error('Token error'))
      
      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ 
        healthy: true, 
        skipReason: 'invalid_token' 
      })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should return healthy when calendar API works', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      const result = await service.validateCalendarHealth()
      
      expect(result).toEqual({ healthy: true })
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/calendar/events'),
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer mock-token' }
        })
      )
      expect(mockUser.getIdToken).toHaveBeenCalled()
    })

    it('should return unhealthy when calendar API fails with auth error', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
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

    it('should return unhealthy when calendar API fails with other error', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
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
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

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
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })
      
      await service.validateCalendarHealth()
      expect(fetch).toHaveBeenCalledTimes(1)

      // Reset and validate again
      service.reset()
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })
      
      await service.validateCalendarHealth()
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})