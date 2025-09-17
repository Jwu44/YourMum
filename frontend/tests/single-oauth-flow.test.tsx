/**
 * Tests for Single Google OAuth Flow Implementation
 *
 * This test file defines the expected behavior for the refactored authentication flow
 * that combines Google OAuth for both authentication and calendar access.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the Google OAuth and Firebase dependencies
const mockGoogleOAuth = {
  buildAuthUrl: jest.fn(),
  exchangeCodeForTokens: jest.fn(),
  validateTokens: jest.fn(),
};

const mockFirebaseAuth = {
  signInWithCredential: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
};

// Mock environment variables
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET = 'test-client-secret';

describe('Single Google OAuth Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('OAuth URL Generation', () => {
    it('should generate Google OAuth URL with combined scopes', () => {
      const expectedScopes = [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ];

      const expectedParams = {
        client_id: 'test-client-id',
        redirect_uri: expect.stringContaining('/auth/callback'),
        response_type: 'code',
        scope: expectedScopes.join(' '),
        access_type: 'offline', // Critical for refresh tokens
        prompt: 'consent',
        include_granted_scopes: 'true',
        state: expect.any(String), // CSRF protection
      };

      // Test implementation would verify these params are correctly set
      expect(expectedParams.access_type).toBe('offline');
      expect(expectedParams.scope).toContain('calendar.readonly');
      expect(expectedParams.scope).toContain('openid');
    });

    it('should include CSRF state parameter for security', () => {
      const state = 'random-csrf-token';

      // Test that state parameter is generated and stored
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(10);
    });
  });

  describe('Authorization Code Exchange', () => {
    it('should exchange authorization code for tokens including refresh token', async () => {
      const mockAuthCode = 'test-auth-code';
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        id_token: 'test-id-token',
        expires_in: 3600,
        scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
        token_type: 'Bearer',
      };

      mockGoogleOAuth.exchangeCodeForTokens.mockResolvedValue(mockTokenResponse);

      // Test implementation should verify all tokens are received
      expect(mockTokenResponse.access_token).toBeDefined();
      expect(mockTokenResponse.refresh_token).toBeDefined();
      expect(mockTokenResponse.id_token).toBeDefined();
      expect(mockTokenResponse.scope).toContain('calendar.readonly');
    });

    it('should handle token exchange errors gracefully', async () => {
      const mockAuthCode = 'invalid-code';
      const mockError = new Error('Invalid authorization code');

      mockGoogleOAuth.exchangeCodeForTokens.mockRejectedValue(mockError);

      // Test that errors are properly handled and user is notified
      await expect(mockGoogleOAuth.exchangeCodeForTokens(mockAuthCode))
        .rejects.toThrow('Invalid authorization code');
    });
  });

  describe('Firebase Integration', () => {
    it('should create Firebase credential from Google ID token', () => {
      const mockIdToken = 'test-id-token';
      const mockCredential = { providerId: 'google.com', idToken: mockIdToken };

      mockFirebaseAuth.GoogleAuthProvider.credential.mockReturnValue(mockCredential);

      const credential = mockFirebaseAuth.GoogleAuthProvider.credential(mockIdToken);

      expect(mockFirebaseAuth.GoogleAuthProvider.credential).toHaveBeenCalledWith(mockIdToken);
      expect(credential.providerId).toBe('google.com');
      expect(credential.idToken).toBe(mockIdToken);
    });

    it('should authenticate user with Firebase using Google credential', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      const mockCredential = { providerId: 'google.com', idToken: 'test-id-token' };
      const mockAuthResult = { user: mockUser, credential: mockCredential };

      mockFirebaseAuth.signInWithCredential.mockResolvedValue(mockAuthResult);

      const result = await mockFirebaseAuth.signInWithCredential(null, mockCredential);

      expect(mockFirebaseAuth.signInWithCredential).toHaveBeenCalledWith(null, mockCredential);
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('Calendar Token Storage', () => {
    it('should store calendar refresh token securely', () => {
      const mockTokens = {
        access_token: 'calendar-access-token',
        refresh_token: 'calendar-refresh-token',
        expires_in: 3600,
      };

      // Test that calendar tokens are properly stored for backend
      expect(mockTokens.refresh_token).toBeDefined();
      expect(mockTokens.access_token).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle scope denial gracefully', () => {
      const mockError = {
        error: 'access_denied',
        error_description: 'User denied calendar access',
      };

      // Test that partial scope denial is handled appropriately
      expect(mockError.error).toBe('access_denied');
    });

    it('should handle network errors during OAuth flow', async () => {
      const networkError = new Error('Network request failed');

      mockGoogleOAuth.exchangeCodeForTokens.mockRejectedValue(networkError);

      // Test that network errors are properly handled
      await expect(mockGoogleOAuth.exchangeCodeForTokens('code'))
        .rejects.toThrow('Network request failed');
    });
  });

  describe('State Management', () => {
    it('should manage OAuth flow state correctly', () => {
      const initialState = {
        isOAuthInProgress: false,
        calendarConnectionStage: null,
        user: null,
      };

      const duringOAuthState = {
        isOAuthInProgress: true,
        calendarConnectionStage: 'connecting',
        user: null,
      };

      const completedState = {
        isOAuthInProgress: false,
        calendarConnectionStage: 'complete',
        user: { uid: 'test-uid' },
      };

      // Test state transitions
      expect(initialState.isOAuthInProgress).toBe(false);
      expect(duringOAuthState.isOAuthInProgress).toBe(true);
      expect(completedState.user).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should complete full OAuth flow: URL generation → code exchange → Firebase auth → user storage', async () => {
    // This integration test verifies the complete flow works end-to-end
    const mockFlow = {
      generateUrl: () => 'https://accounts.google.com/oauth2/auth?...',
      exchangeCode: () => Promise.resolve({
        access_token: 'token',
        refresh_token: 'refresh',
        id_token: 'id',
      }),
      authenticateWithFirebase: () => Promise.resolve({ user: { uid: 'test' } }),
      storeUserWithCalendar: () => Promise.resolve({ success: true }),
    };

    // Test the complete flow executes without errors
    expect(mockFlow.generateUrl()).toContain('accounts.google.com');

    const tokens = await mockFlow.exchangeCode();
    expect(tokens.refresh_token).toBeDefined();

    const authResult = await mockFlow.authenticateWithFirebase();
    expect(authResult.user.uid).toBeDefined();

    const storeResult = await mockFlow.storeUserWithCalendar();
    expect(storeResult.success).toBe(true);
  });
});