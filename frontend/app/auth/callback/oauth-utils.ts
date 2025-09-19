/**
 * OAuth callback utility functions
 *
 * NEW IMPLEMENTATION: Uses Firebase UID as primary identifier from the start,
 * sending NEW format to backend to prevent Google Subject ID storage entirely.
 */

import { auth } from '@/auth/firebase'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { googleOAuthService } from '@/lib/services/google-oauth'

/**
 * Process OAuth callback with Firebase UID as primary identifier
 *
 * NEW APPROACH: Exchange tokens on frontend, sign into Firebase, then send
 * NEW format to backend with Firebase UID as primary identifier.
 */
export async function processOAuthCallback(code: string, state: string): Promise<{ user: any; isNewUser: boolean }> {
  console.log('🔄 Processing OAuth callback with NEW format (Firebase UID primary)...')

  // Step 1: Exchange authorization code for tokens directly (bypass old backend flow)
  console.log('🔄 Exchanging authorization code for tokens...')
  const tokens = await exchangeCodeForTokensDirectly(code, state)
  console.log('✅ Received OAuth tokens:', {
    hasAccessToken: Boolean(tokens.access_token),
    hasRefreshToken: Boolean(tokens.refresh_token),
    hasIdToken: Boolean(tokens.id_token),
    scopes: tokens.scope
  })

  // Step 2: Sign in to Firebase with Google credential to get Firebase UID
  console.log('🔄 Signing in to Firebase with Google credential...')
  const credential = GoogleAuthProvider.credential(tokens.id_token)
  const firebaseResult = await signInWithCredential(auth, credential)
  const firebaseUser = firebaseResult.user

  console.log('✅ Firebase authentication successful:', firebaseUser.email)
  console.log('🔑 Firebase UID (primary identifier):', firebaseUser.uid)

  // Step 3: Prepare user data with Firebase UID as primary identifier
  const userData = {
    googleId: firebaseUser.uid, // KEY FIX: Use Firebase UID as primary identifier
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL ?? '',
    hasCalendarAccess: true,
    calendarTokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? '',
      expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      tokenType: tokens.token_type ?? 'Bearer',
      scope: tokens.scope
    }
  }

  // Step 4: Send NEW format to backend OAuth callback
  console.log('🔄 Sending NEW format to backend with Firebase UID...')
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/oauth-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userData,
      tokens
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Backend OAuth processing failed: ${errorData.error}`)
  }

  const backendResult = await response.json()
  console.log('✅ Backend OAuth processing successful:', {
    isNewUser: backendResult.isNewUser,
    userEmail: backendResult.user?.email
  })

  // Step 5: Ensure Firebase auth is ready for API calls
  console.log('🔄 Verifying auth readiness...')
  await firebaseUser.getIdToken(true)
  console.log('✅ Auth state confirmed ready')

  return {
    user: firebaseUser,
    isNewUser: Boolean(backendResult.isNewUser)
  }
}

/**
 * Exchange authorization code for tokens directly using Google OAuth API
 * This bypasses the backend's old format processing
 */
async function exchangeCodeForTokensDirectly(code: string, state: string): Promise<any> {
  // Validate state parameter
  if (!googleOAuthService.validateState(state)) {
    throw new Error('Invalid OAuth state parameter')
  }

  // Get Google OAuth credentials from environment
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
  const redirectUri = `${window.location.origin}/auth/callback`

  if (clientId == null || clientId === '' || clientSecret == null || clientSecret === '') {
    throw new Error('Google OAuth credentials not configured')
  }

  // Exchange authorization code for tokens with Google
  const tokenUrl = 'https://oauth2.googleapis.com/token'
  const tokenData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenData
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google OAuth token exchange failed: ${errorText}`)
  }

  const tokens = await response.json()

  // Validate that we received all required tokens
  if (tokens.access_token == null || tokens.id_token == null) {
    throw new Error('Incomplete token response from Google')
  }

  // Check if we got calendar scope
  if (tokens.scope != null && !tokens.scope.includes('calendar.readonly')) {
    console.warn('Calendar scope not granted by user')
  }

  console.log('✅ Direct OAuth token exchange successful:', {
    hasRefreshToken: Boolean(tokens.refresh_token),
    scopes: tokens.scope,
    expiresIn: tokens.expires_in
  })

  return tokens
}
