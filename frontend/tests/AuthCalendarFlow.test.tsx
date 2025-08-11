import React, { useEffect } from 'react'
import { render } from '@testing-library/react'

// Mock firebase auth provider and methods used in AuthContext
jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: {
    credentialFromResult: jest.fn(() => ({ accessToken: 'token' })),
  },
  signInWithPopup: jest.fn(async () => { throw Object.assign(new Error('popup blocked'), { code: 'auth/popup-blocked' }) }),
  signInWithRedirect: jest.fn(async () => Promise.resolve()),
  getRedirectResult: jest.fn(async () => null),
  onAuthStateChanged: jest.fn(() => () => {}),
}))

// Mock internal firebase instance
jest.mock('@/auth/firebase', () => ({
  auth: {},
  provider: { addScope: jest.fn(), setCustomParameters: jest.fn() },
}))

// Mock calendar api to avoid network
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: { connectCalendar: jest.fn(async () => ({})) },
}))

// Import after mocks
import { AuthProvider, useAuth } from '@/auth/AuthContext'

const InvokeSignIn: React.FC<{ dest?: string }> = ({ dest = '/dashboard' }) => {
  const { signIn } = useAuth()
  useEffect(() => { void signIn(dest) }, [signIn, dest])
  return null
}

describe('Auth calendar flow - redirect destinations', () => {
  beforeEach(() => { localStorage.clear() })

  test('signIn stores final redirect to /dashboard and auth redirect to /connecting', async () => {
    render(
      <AuthProvider>
        <InvokeSignIn dest="/dashboard" />
      </AuthProvider>
    )

    // finalRedirectDestination should be the intended target
    expect(localStorage.getItem('finalRedirectDestination')).toBe('/dashboard')
    // authRedirectDestination should be set to /connecting
    expect(localStorage.getItem('authRedirectDestination')).toBe('/connecting')
  })
})


