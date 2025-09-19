import React from 'react'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { apiClient } from '@/lib/api/client'
import { auth } from '@/auth/firebase'

// Mock Firebase auth
jest.mock('@/auth/firebase', () => ({
  auth: {
    currentUser: null
  },
  provider: {}
}))

// Mock API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    initialize: jest.fn(),
    startBackgroundRefresh: jest.fn(),
    get: jest.fn(),
    post: jest.fn()
  }
}))

// Mock Firebase functions
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()), // Return unsubscribe function
  signOut: jest.fn(),
  GoogleAuthProvider: {
    credentialFromResult: jest.fn()
  },
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
  getRedirectResult: jest.fn().mockResolvedValue(null)
}))

// Note: PostOAuthHandler was removed - OAuth flows now handled directly in callback and dashboard

// Mock timezone utilities
jest.mock('@/lib/utils/timezone', () => ({
  detectBrowserTimezone: () => 'America/New_York',
  shouldUpdateUserTimezone: () => false,
  isValidTimezone: () => true
}))

// Mock calendar API
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    connectCalendar: jest.fn()
  }
}))

// Test component that uses useAuth
const TestComponent = () => {
  const { user, loading, error } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (user) return <div>User: {user.email}</div>
  return <div>No user</div>
}

describe('AuthContext Integration with API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize API client when AuthProvider mounts', () => {
    // Act
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Assert
    expect(apiClient.initialize).toHaveBeenCalled()
  })

  it('should render loading state initially', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should provide auth context methods', () => {
    let contextValue: any
    
    const TestHook = () => {
      contextValue = useAuth()
      return <div>Test</div>
    }

    render(
      <AuthProvider>
        <TestHook />
      </AuthProvider>
    )

    // Assert - all auth methods should be available
    expect(typeof contextValue.signIn).toBe('function')
    expect(typeof contextValue.signOut).toBe('function')
    expect(typeof contextValue.reconnectCalendar).toBe('function')
  })

  it('should handle development mode', () => {
    // Set development environment
    const originalEnv = process.env.NODE_ENV
    const originalBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH
    
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
      configurable: true
    })
    process.env.NEXT_PUBLIC_BYPASS_AUTH = 'true'

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(apiClient.initialize).toHaveBeenCalled()

    // Cleanup
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true
    })
    process.env.NEXT_PUBLIC_BYPASS_AUTH = originalBypass
  })
})