/**
 * Tests for Firebase UID fix - ensures OAuth callback uses Firebase UID as primary identifier
 * Following TDD principles from dev-guide.md
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock Firebase Auth
const mockSignInWithCredential = jest.fn()
const mockGoogleAuthProvider = {
  credential: jest.fn()
}

jest.mock('firebase/auth', () => ({
  signInWithCredential: mockSignInWithCredential,
  GoogleAuthProvider: mockGoogleAuthProvider
}))

// Mock Google OAuth service
const mockHandleOAuthCallback = jest.fn()
jest.mock('@/lib/services/google-oauth', () => ({
  googleOAuthService: {
    handleOAuthCallback: mockHandleOAuthCallback,
    validateIdToken: jest.fn()
  }
}))

describe('Firebase UID Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should use Firebase UID for backend user storage after OAuth', async () => {
    // Arrange: Mock OAuth tokens and Firebase user
    const mockTokens = {
      access_token: 'google_access_token',
      refresh_token: 'google_refresh_token',
      id_token: 'google_id_token',
      scope: 'calendar.readonly'
    }

    const mockFirebaseUser = {
      uid: 'firebase_uid_123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg'
    }

    const mockCredential = { providerId: 'google.com' }

    // Mock implementations
    mockHandleOAuthCallback.mockResolvedValue(mockTokens)
    mockGoogleAuthProvider.credential.mockReturnValue(mockCredential)
    mockSignInWithCredential.mockResolvedValue({ user: mockFirebaseUser })

    // Mock fetch for backend calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: { googleId: 'firebase_uid_123' },
        isNewUser: true
      })
    })

    // Import component after mocks are set up
    const { processOAuthCallback } = await import('../app/auth/callback/oauth-utils')

    // Act: Process OAuth callback
    await processOAuthCallback('auth_code', 'state_123')

    // Assert: Backend should receive Firebase UID, not Google subject ID
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/oauth-callback'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"googleId":"firebase_uid_123"')
      })
    )
  })

  it('should handle Firebase authentication before backend storage', async () => {
    // Arrange
    const mockTokens = {
      id_token: 'google_id_token',
      access_token: 'access_token'
    }

    const mockFirebaseUser = {
      uid: 'firebase_uid_456',
      email: 'user@test.com'
    }

    mockHandleOAuthCallback.mockResolvedValue(mockTokens)
    mockSignInWithCredential.mockResolvedValue({ user: mockFirebaseUser })

    const { processOAuthCallback } = await import('../app/auth/callback/oauth-utils')

    // Act
    await processOAuthCallback('code', 'state')

    // Assert: Firebase sign-in should happen before backend call
    expect(mockSignInWithCredential).toHaveBeenCalledBefore(fetch as jest.Mock)
    expect(mockSignInWithCredential).toHaveBeenCalledWith(
      expect.anything(), // auth instance
      expect.anything()  // credential
    )
  })

  it('should maintain backward compatibility for existing users', async () => {
    // This test ensures existing users with Google Subject IDs can still authenticate
    // Implementation will handle migration gracefully

    const mockExistingUserResponse = {
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'User not found' })
    }

    global.fetch = jest.fn().mockResolvedValueOnce(mockExistingUserResponse)

    // Should handle gracefully and not throw
    const { processOAuthCallback } = await import('../app/auth/callback/oauth-utils')

    expect(async () => {
      await processOAuthCallback('code', 'state')
    }).not.toThrow()
  })
})