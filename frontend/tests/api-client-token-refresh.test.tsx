import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '@/lib/api/client'
import { auth } from '@/auth/firebase'

// Mock Firebase auth
vi.mock('@/auth/firebase', () => ({
  auth: {
    currentUser: null
  }
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
global.localStorage = mockLocalStorage as any

describe('ApiClient Token Refresh', () => {
  const mockUser = {
    getIdToken: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    auth.currentUser = null
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Token Management', () => {
    it('should get fresh token for authenticated user', async () => {
      // Arrange
      const mockToken = 'mock-jwt-token.payload.signature'
      const mockPayload = { exp: Math.floor(Date.now() / 1000) + 3600 } // 1 hour from now
      
      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockResolvedValue(mockToken)
      
      // Mock JWT parsing (base64 decode)
      global.atob = vi.fn().mockReturnValue(JSON.stringify(mockPayload))

      // Act - make a request that needs auth
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })))
      
      await apiClient.get('/api/test')

      // Assert
      expect(mockUser.getIdToken).toHaveBeenCalledWith(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`
          })
        })
      )
    })

    it('should cache valid tokens and reuse them', async () => {
      // Arrange
      const mockToken = 'cached-token'
      const futureExpiry = Date.now() + 3600000 // 1 hour from now
      const mockPayload = { exp: Math.floor(futureExpiry / 1000) }
      
      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockResolvedValue(mockToken)
      global.atob = vi.fn().mockReturnValue(JSON.stringify(mockPayload))
      mockFetch.mockResolvedValue(new Response('{}'))

      // Act - make two requests
      await apiClient.get('/api/test1')
      await apiClient.get('/api/test2')

      // Assert - token should only be fetched once due to caching
      expect(mockUser.getIdToken).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should refresh expired cached tokens', async () => {
      // Arrange - start with expired cached token
      const expiredToken = 'expired-token'
      const newToken = 'fresh-token'
      const pastExpiry = Date.now() - 1000 // Already expired
      const futureExpiry = Date.now() + 3600000 // 1 hour from now
      
      // Setup expired cache
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        token: expiredToken,
        expiresAt: pastExpiry,
        refreshedAt: pastExpiry - 3600000
      }))

      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockResolvedValue(newToken)
      global.atob = vi.fn().mockReturnValue(JSON.stringify({ exp: Math.floor(futureExpiry / 1000) }))
      mockFetch.mockResolvedValue(new Response('{}'))

      // Act
      await apiClient.get('/api/test')

      // Assert
      expect(mockUser.getIdToken).toHaveBeenCalledWith(true) // Force refresh
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${newToken}`
          })
        })
      )
    })
  })

  describe('401 Error Recovery', () => {
    it('should automatically retry on 401 error with fresh token', async () => {
      // Arrange
      const oldToken = 'old-token'
      const newToken = 'new-token'
      const mockPayload = { exp: Math.floor((Date.now() + 3600000) / 1000) }
      
      auth.currentUser = mockUser as any
      mockUser.getIdToken
        .mockResolvedValueOnce(oldToken)
        .mockResolvedValueOnce(newToken)
      global.atob = vi.fn().mockReturnValue(JSON.stringify(mockPayload))

      // First request returns 401, second succeeds
      mockFetch
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })))

      // Act
      const response = await apiClient.get('/api/test')

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockUser.getIdToken).toHaveBeenCalledTimes(2)
      expect(response.ok).toBe(true)
      
      // Check that second request used new token
      const secondCall = mockFetch.mock.calls[1]
      expect(secondCall[1].headers.Authorization).toBe(`Bearer ${newToken}`)
    })

    it('should not retry more than once on repeated 401s', async () => {
      // Arrange
      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockResolvedValue('token')
      global.atob = vi.fn().mockReturnValue(JSON.stringify({ exp: Math.floor((Date.now() + 3600000) / 1000) }))

      // Always return 401
      mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

      // Act
      const response = await apiClient.get('/api/test')

      // Assert - should try twice maximum (original + 1 retry)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(response.status).toBe(401)
    })

    it('should clear token cache on 401 error', async () => {
      // Arrange
      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockResolvedValue('token')
      global.atob = vi.fn().mockReturnValue(JSON.stringify({ exp: Math.floor((Date.now() + 3600000) / 1000) }))
      mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

      // Act
      await apiClient.get('/api/test')

      // Assert
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase_token_cache')
    })
  })

  describe('Request Methods', () => {
    beforeEach(() => {
      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockResolvedValue('test-token')
      global.atob = vi.fn().mockReturnValue(JSON.stringify({ exp: Math.floor((Date.now() + 3600000) / 1000) }))
      mockFetch.mockResolvedValue(new Response('{}'))
    })

    it('should handle GET requests', async () => {
      await apiClient.get('/api/users')
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      )
    })

    it('should handle POST requests with data', async () => {
      const testData = { name: 'test' }
      
      await apiClient.post('/api/users', testData)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      )
    })

    it('should handle PUT requests', async () => {
      const updateData = { status: 'updated' }
      
      await apiClient.put('/api/users/123', updateData)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/123'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      )
    })

    it('should handle DELETE requests', async () => {
      await apiClient.delete('/api/users/123')
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/123'),
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should skip auth when skipAuth is true', async () => {
      await apiClient.get('/api/public', { skipAuth: true })
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String)
          })
        })
      )
      expect(mockUser.getIdToken).not.toHaveBeenCalled()
    })
  })

  describe('Development Mode', () => {
    it('should use mock token in development mode', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV
      const originalBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH
      
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_BYPASS_AUTH = 'true'
      mockFetch.mockResolvedValue(new Response('{}'))

      // Act
      await apiClient.get('/api/test')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-for-development'
          })
        })
      )
      expect(mockUser.getIdToken).not.toHaveBeenCalled()

      // Cleanup
      process.env.NODE_ENV = originalEnv
      process.env.NEXT_PUBLIC_BYPASS_AUTH = originalBypass
    })
  })

  describe('Error Handling', () => {
    it('should throw error when user is not authenticated', async () => {
      // Arrange
      auth.currentUser = null

      // Act & Assert
      await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication failed')
    })

    it('should handle token refresh failures gracefully', async () => {
      // Arrange
      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockRejectedValue(new Error('Token refresh failed'))

      // Act & Assert
      await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication failed')
    })

    it('should handle network errors', async () => {
      // Arrange
      auth.currentUser = mockUser as any
      mockUser.getIdToken.mockResolvedValue('token')
      global.atob = vi.fn().mockReturnValue(JSON.stringify({ exp: Math.floor((Date.now() + 3600000) / 1000) }))
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Act & Assert
      await expect(apiClient.get('/api/test')).rejects.toThrow('Network error')
    })
  })
})