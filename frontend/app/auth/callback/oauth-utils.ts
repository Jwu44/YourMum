/**
 * OAuth callback utility functions
 *
 * Handles the Firebase UID fix - ensures Firebase UID is used as primary identifier
 * instead of Google Subject ID, following Firebase best practices.
 */

import { auth } from '@/auth/firebase'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { googleOAuthService } from '@/lib/services/google-oauth'

/**
 * Process OAuth callback with Firebase UID as primary identifier
 *
 * Key fix: Uses Firebase UID from signInWithCredential instead of Google Subject ID
 * This ensures backend user lookup works correctly.
 */
export async function processOAuthCallback(code: string, state: string) {
  console.log('🔄 Processing OAuth callback with Firebase UID fix...')

  // Step 1: Exchange authorization code for Google tokens
  const tokens = await googleOAuthService.handleOAuthCallback(code, state)
  console.log('✅ Received OAuth tokens:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    hasIdToken: !!tokens.id_token,
    scopes: tokens.scope,
  })

  // Step 2: Validate Google ID token
  const idTokenPayload = googleOAuthService.validateIdToken(tokens.id_token)
  console.log('✅ ID token validated for user:', idTokenPayload.email)

  // Step 3: Sign in to Firebase with Google credential
  console.log('🔄 Signing in to Firebase with Google credential...')
  const credential = GoogleAuthProvider.credential(tokens.id_token)
  const firebaseResult = await signInWithCredential(auth, credential)
  const firebaseUser = firebaseResult.user

  console.log('✅ Firebase authentication successful:', firebaseUser.email)
  console.log('🔑 Firebase UID (primary identifier):', firebaseUser.uid)

  // Step 4: Prepare user data with Firebase UID as primary identifier
  const userData = {
    googleId: firebaseUser.uid, // KEY FIX: Use Firebase UID instead of Google Subject ID
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL || '',
    hasCalendarAccess: true,
    calendarTokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      scope: tokens.scope
    }
  }

  // Step 5: Store user in backend with Firebase UID
  console.log('🔄 Storing user in backend with Firebase UID as primary key...')
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/oauth-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userData,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        token_type: 'Bearer'
      }
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Backend storage failed: ${errorData.error || 'Unknown error'}`)
  }

  const result = await response.json()
  console.log('✅ User stored in backend with Firebase UID:', firebaseUser.uid)

  // Step 6: Ensure Firebase auth is ready for API calls
  console.log('🔄 Verifying auth readiness...')
  await firebaseUser.getIdToken(true)
  console.log('✅ Auth state confirmed ready')

  return {
    user: firebaseUser,
    isNewUser: result.isNewUser
  }
}