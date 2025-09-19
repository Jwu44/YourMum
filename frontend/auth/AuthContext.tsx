'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from './firebase'
import { type AuthContextType } from '@/lib/types'
import { detectBrowserTimezone, shouldUpdateUserTimezone } from '@/lib/utils/timezone'
import { apiClient } from '@/lib/api/client'

/**
 * Auth Context for managing user authentication state
 */
const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Custom hook to access auth context
 * @returns The current auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Add this constant at the top after imports
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

export function AuthProvider ({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Simplified state - removed complex OAuth flags

  // Initialize API client on mount
  useEffect(() => {
    console.log('🚀 AuthProvider: Initializing centralized API client')
    apiClient.initialize()
  }, [])

  // Removed complex OAuth processing methods - handled by callback page

  // Removed storeUserInBackend - handled by OAuth callback page

  // Listen for authentication state changes
  useEffect(() => {
    console.log('Setting up auth state listener')

    // If in development mode with bypass enabled, create a mock user
    if (IS_DEVELOPMENT && BYPASS_AUTH) {
      console.log('Development mode: bypassing authentication')
      const mockUser = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        displayName: 'Dev User',
        photoURL: null,
        getIdToken: async () => 'mock-token-for-development'
      } as User

      setUser(mockUser)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('✅ Auth state changed. User:', user ? `${user.displayName} (${user.email})` : 'null')

      // Simple state update - OAuth callback page handles user storage
      setUser(user)
      setLoading(false)

      if (user) {
        console.log('✅ User authenticated successfully')
      } else {
        console.log('👋 User signed out')
      }
    })

    // Cleanup subscription
    return () => { unsubscribe() }
  }, []) // Empty dependency array - setup once on mount

  // Simple timezone sync when user becomes available
  useEffect(() => {
    const syncTimezoneIfNeeded = async () => {
      if (!user) return

      try {
        const browserTz = detectBrowserTimezone()
        const tzKey = 'tzSyncedFor'
        const cached = localStorage.getItem(tzKey)

        // Skip if already synced for this browser timezone
        if (cached === browserTz) return

        // Fetch current user to read stored timezone using API client
        const res = await apiClient.get('/api/auth/user')
        if (!res.ok) return

        const data = await res.json()
        const serverTz: string | undefined = data?.user?.timezone

        // Check if update is needed using robust detection
        if (!shouldUpdateUserTimezone(serverTz)) {
          localStorage.setItem(tzKey, browserTz)
          return
        }

        console.log(`🌍 Timezone sync needed: ${serverTz || 'none'} → ${browserTz}`)

        // Update timezone via API client
        const updateRes = await apiClient.put('/api/user/timezone', { timezone: browserTz })

        if (updateRes.ok) {
          const result = await updateRes.json()
          console.log(`✅ Timezone updated successfully to: ${result.timezone}`)
          localStorage.setItem(tzKey, browserTz)
        } else {
          console.warn('⚠️ Failed to update timezone:', await updateRes.text())
        }
      } catch (error) {
        console.warn('Timezone sync failed (non-critical):', error)
      }
    }

    syncTimezoneIfNeeded()
  }, [user])

  // Removed complex redirect result handling - OAuth callback page handles redirects

  /**
   * Sign in with Google using single OAuth flow for authentication + calendar access
   * @param redirectTo Destination after successful sign-in
   */
  const signIn = async (redirectTo = '/dashboard') => {
    try {
      setError(null)
      console.log('🚀 Starting single OAuth flow for auth + calendar access')
      console.log('Redirect destination:', redirectTo)

      // Check if user is already authenticated
      if (user) {
        console.log('User already authenticated - RouteGuard will handle navigation')
        return
      }

      // Store the intended destination
      localStorage.setItem('authRedirectDestination', redirectTo)
      console.log('Stored redirect destination in localStorage')

      // Import the Google OAuth service
      const { googleOAuthService } = await import('@/lib/services/google-oauth')

      // Initiate single OAuth flow (redirects to Google)
      // This will handle both authentication and calendar access in one step
      googleOAuthService.initiateOAuthFlow()

    } catch (error) {
      console.error('❌ Single OAuth flow initiation failed:', error)
      setError('Failed to start sign in process')
      throw error
    }
  }

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      // Clear any stored redirect destinations
      localStorage.removeItem('authRedirectDestination')
      // Note: User state will be automatically set to null by onAuthStateChanged
    } catch (error) {
      console.error('Sign out error:', error)
      setError('Failed to sign out')
      throw error
    }
  }

  // Removed complex OAuth methods - handled by OAuth callback page

  const value: AuthContextType = {
    user,
    currentUser: user, // Alias for compatibility
    loading,
    error,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Get scopes associated with an access token
 * @param accessToken Google OAuth access token
 * @returns Array of scope strings
 */
const getScopes = async (accessToken: string): Promise<string[]> => {
  try {
    // This endpoint will return the scopes associated with the token
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken)
    if (!response.ok) return []

    const data = await response.json()
    return data.scope ? data.scope.split(' ') : []
  } catch (error) {
    console.error('Error getting token scopes:', error)
    return []
  }
}
