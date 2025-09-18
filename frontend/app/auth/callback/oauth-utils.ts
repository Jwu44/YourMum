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
 * TEMPORARY: For now, let the backend handle token exchange (old format)
 * but immediately get Firebase UID for future API calls
 */
export async function processOAuthCallback(code: string, state: string) {
  console.log('🔄 Processing OAuth callback with Firebase UID fix...')

  // Step 1: Let backend handle token exchange (temporary old format)
  const tokens = await googleOAuthService.handleOAuthCallback(code, state)
  console.log('✅ Received OAuth tokens:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    hasIdToken: !!tokens.id_token,
    scopes: tokens.scope,
  })

  // Step 2: CRITICAL FIX - Sign in to Firebase with Google credential to get Firebase UID
  console.log('🔄 Signing in to Firebase with Google credential...')
  const credential = GoogleAuthProvider.credential(tokens.id_token)
  const firebaseResult = await signInWithCredential(auth, credential)
  const firebaseUser = firebaseResult.user

  console.log('✅ Firebase authentication successful:', firebaseUser.email)
  console.log('🔑 Firebase UID (primary identifier):', firebaseUser.uid)

  // Step 3: Ensure Firebase auth is ready for API calls
  console.log('🔄 Verifying auth readiness...')
  await firebaseUser.getIdToken(true)
  console.log('✅ Auth state confirmed ready')

  // Step 4: Update user in backend with Firebase UID (migration step)
  console.log('🔄 Updating user record with Firebase UID for consistency...')
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/migrate-user-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
      },
      body: JSON.stringify({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email
      }),
    })
    console.log('✅ User ID migration completed')
  } catch (error) {
    console.warn('⚠️ User ID migration failed (non-critical):', error)
  }

  return {
    user: firebaseUser,
    isNewUser: false // Will be determined by backend during migration
  }
}