import { initializeApp, FirebaseError } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  OAuthCredential,
  // connectAuthEmulator,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import AuthStateManager from './AuthStateManager';

import { RedirectResult } from '../lib/types';

// Your existing Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Auth Provider with Calendar scopes
const googleProvider = new GoogleAuthProvider();

// Add required Google Calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

/**
 * Enhanced sign-in with Google
 * Handles state management and includes comprehensive error handling
 * @returns Promise<boolean> indicating success
 * @throws Error if sign-in fails
 */
export const signInWithGoogle = async () => {
  try {
    console.log("Starting sign-in process...");
    
    if (!isBrowser()) {
      throw new Error('Sign in can only be initiated in browser environment');
    }

    // Clear any existing auth state and sign out
    AuthStateManager.clearState();
    await firebaseSignOut(auth).catch(() => {});

    // Generate and store state
    const state = AuthStateManager.generateState();
    
    // Store current URL as return destination
    const currentUrl = window.location.origin;
    AuthStateManager.storeReturnUrl(currentUrl);

    console.log('Starting auth with state:', {
      state,
      returnUrl: currentUrl,
      timestamp: new Date().toISOString()
    });

    // Update the provider config with enhanced security parameters
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline',
      state,
      include_granted_scopes: 'true'
    });

    await signInWithRedirect(auth, googleProvider);
    return true;
  } catch (error) {
    AuthStateManager.clearState(); // Clean up on error
    if (error instanceof FirebaseError) {
      console.error('Google sign-in error:', error);
      throw error;
    }
    console.error('Unexpected error during sign-in:', error);
    throw new Error('Failed to sign in with Google');
  }
};

/**
 * Handle redirect result with enhanced error handling and state validation
 * @returns Promise<RedirectResult | null> Auth result or null if no redirect
 * @throws Error if redirect handling fails or state is invalid
 */
export const handleRedirectResult = async (): Promise<RedirectResult | null> => {
  try {
    console.log("Getting redirect result...");
    console.log("Current URL:", window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // Add more context to state validation
    const isValidState = AuthStateManager.validateState(urlParams);
    console.log('State validation result:', isValidState);
    
    if (!isValidState) {
      // Check if we're in an expected redirect flow
      if (window.location.pathname.includes('/__/auth/handler')) {
        console.log('Proceeding with auth handler despite state mismatch');
      } else {
        console.error('Invalid authentication state');
        AuthStateManager.clearState();
        throw new Error('Invalid authentication state');
      }
    }

    const result = await getRedirectResult(auth);
    console.log("Redirect result:", result ? "exists" : "null");
    
    if (!result) {
      console.log("No redirect result - user hasn't completed sign-in");
      return null;
    }

    // Get Google OAuth access token from the credential
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential) {
      throw new Error('No credential received from Google');
    }

    const accessToken = credential.accessToken;
    
    if (!accessToken) {
      throw new Error('No access token received from Google');
    }

    // Get and validate scopes granted by the user
    const grantedScopes = ((credential as OAuthCredential & { scope?: string })?.scope) || '';
    const scopesArray = grantedScopes.split(' ').filter(Boolean);
    
    // Validate required scopes
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
    ];
    
    const hasRequiredScopes = requiredScopes.every(scope => 
      scopesArray.includes(scope)
    );

    if (!hasRequiredScopes) {
      console.warn('Missing required calendar scopes:', {
        required: requiredScopes,
        granted: scopesArray
      });
    }

    // Get return URL before clearing state
    const returnUrl = AuthStateManager.getReturnUrl() || window.location.origin;
    
    // Clear auth state after successful authentication
    AuthStateManager.clearState();

    console.log("Auth successful:", {
      uid: result.user.uid,
      email: result.user.email,
      hasToken: Boolean(accessToken),
      scopes: scopesArray,
      hasRequiredScopes,
      returnUrl
    });

    // Return the authentication result with necessary information
    return { 
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        getIdToken: (forceRefresh: boolean) => result.user.getIdToken(forceRefresh)
      },
      credentials: {
        accessToken,
        expiresAt: Date.now() + 3600 * 1000, // Token expires in 1 hour
        scopes: scopesArray
      },
      hasCalendarAccess: hasRequiredScopes,
      scopes: scopesArray
    };

  } catch (error) {
    AuthStateManager.clearState(); // Clean up on error
    console.error('Redirect result error:', {
      code: error instanceof FirebaseError ? error.code : 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    throw error instanceof Error ? error : new Error('Failed to handle redirect result');
  }
};

/**
 * Enhanced sign out function with better error handling
 * Clears all auth state and session data
 * @throws Error if sign out fails
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    AuthStateManager.clearState();
  } catch (error) {
    console.error('Sign out error:', {
      code: error instanceof FirebaseError ? error.code : 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to sign out. Please try again.');
  }
};

export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};


// Export auth and app instances for use in other parts of the application
export { auth, app };