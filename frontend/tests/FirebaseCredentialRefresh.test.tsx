import { render, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { calendarApi } from '@/lib/api/calendar'

// Mock Firebase auth with inline mock user
jest.mock('firebase/auth', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    getIdToken: jest.fn(() => Promise.resolve('mock-firebase-token'))
  }
  
  return {
    getAuth: jest.fn(() => ({ currentUser: mockUser })),
    onAuthStateChanged: jest.fn((auth, callback) => {
      callback(mockUser)
      return jest.fn() // unsubscribe function
    }),
    signOut: jest.fn(),
    GoogleAuthProvider: Object.assign(
      jest.fn().mockImplementation(() => ({
        addScope: jest.fn(),
        setCustomParameters: jest.fn()
      })), 
      {
        credentialFromResult: jest.fn(() => ({ 
          accessToken: 'fresh-access-token',
          refreshToken: 'refresh-token'
        }))
      }
    ),
    signInWithPopup: jest.fn(() => Promise.resolve({
      user: mockUser,
      credential: { accessToken: 'fresh-access-token', refreshToken: 'refresh-token' }
    })),
    signInWithRedirect: jest.fn(),
    getRedirectResult: jest.fn(() => Promise.resolve(null))
  }
})

// Mock calendar API
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    connectCalendar: jest.fn(() => Promise.resolve({ success: true }))
  }
}))

// Mock timezone utilities
jest.mock('@/lib/utils/timezone', () => ({
  detectBrowserTimezone: jest.fn(() => 'America/New_York'),
  shouldUpdateUserTimezone: jest.fn(() => false),
  isValidTimezone: jest.fn(() => true)
}))

const TestComponent = () => {
  const { reconnectCalendar } = useAuth()
  return (
    <button 
      data-testid="refresh-button"
      onClick={() => reconnectCalendar()}
    >
      Refresh Calendar
    </button>
  )
}

describe('Firebase Credential Refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should refresh Firebase credentials when calendar tokens expire', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const refreshButton = document.querySelector('[data-testid="refresh-button"]') as HTMLButtonElement
    refreshButton.click()

    await waitFor(() => {
      // Should not trigger backend OAuth redirect
      expect(window.location.href).not.toContain('yourmum-production.up.railway.app')
      
      // Should call Firebase signInWithPopup to refresh tokens
      expect(require('firebase/auth').signInWithPopup).toHaveBeenCalled()
      
      // Should call backend /connect with fresh credentials
      expect(calendarApi.connectCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'fresh-access-token',
          refreshToken: 'refresh-token'
        })
      )
    })
  })

  it('should handle Firebase credential refresh errors gracefully', async () => {
    // Mock Firebase error
    const mockSignInWithPopup = require('firebase/auth').signInWithPopup
    mockSignInWithPopup.mockRejectedValueOnce(new Error('Firebase auth failed'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const refreshButton = document.querySelector('[data-testid="refresh-button"]') as HTMLButtonElement
    refreshButton.click()

    await waitFor(() => {
      // Should not crash the application
      expect(mockSignInWithPopup).toHaveBeenCalled()
      // Error should be handled gracefully
    })
  })

  it('should extract Google tokens from Firebase credential result', async () => {
    const mockCredential = {
      accessToken: 'google-access-token-123',
      refreshToken: 'google-refresh-token-456'
    }

    const mockCredentialFromResult = require('firebase/auth').GoogleAuthProvider.credentialFromResult
    mockCredentialFromResult.mockReturnValueOnce(mockCredential)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const refreshButton = document.querySelector('[data-testid="refresh-button"]') as HTMLButtonElement
    refreshButton.click()

    await waitFor(() => {
      expect(calendarApi.connectCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'google-access-token-123',
          refreshToken: 'google-refresh-token-456'
        })
      )
    })
  })
})