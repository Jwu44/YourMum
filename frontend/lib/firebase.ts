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

import { RedirectResult } from './types';

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

// Connect to emulator if in development
// if (process.env.NODE_ENV === 'development') {
//   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   console.log('Connected to Auth Emulator');
// }
// ;

/**
 * Check if code is running in browser environment
 * Returns true if window is defined (client-side)
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Get the appropriate redirect URL based on environment and context.
 * Handles preview deployments, development, and production environments.
 */
const getRedirectUrl = (): string => {
  try {
    // Check if we're in the browser environment
    if (!isBrowser()) {
      return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
    }

    // Always use Firebase auth domain for auth handling
    const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (!firebaseAuthDomain) {
      throw new Error('Firebase auth domain not configured');
    }

    // Get the return URL (where to redirect after auth)
    let returnUrl;
    if (process.env.NODE_ENV === 'development') {
      returnUrl = 'http://localhost:8000';
    } else {
      // For preview and production, use the current URL
      returnUrl = window.location.origin;
    }

    // Store the return URL in localStorage before redirect
    if (isBrowser()) {
      localStorage.setItem('authReturnUrl', returnUrl);
    }

    // Always return Firebase auth domain
    return `https://${firebaseAuthDomain}`;
  } catch (error) {
    console.error('Error determining redirect URL:', error);
    return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
  }
};

// Update the Google Provider configuration while preserving existing scopes
const googleProvider = new GoogleAuthProvider();

// Preserve existing scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Update custom parameters with enhanced error handling
googleProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline',
  redirect_uri: `${getRedirectUrl()}/auth/handler`,
  // Add additional security parameters
  state: crypto.randomUUID(), // Prevent CSRF attacks
  include_granted_scopes: 'true' // Ensure we get all granted scopes
});

// Enhanced sign in function with better error handling and logging
export const signInWithGoogle = async () => {
  try {
    console.log("Starting sign-in process...");
    console.log('Local storage on sign-in:', {
      contents: { ...localStorage }
    });
    if (!isBrowser()) {
      throw new Error('Sign in can only be initiated in browser environment');
    }

    // Clear only auth-related storage
    localStorage.removeItem('firebase:authUser');
    await firebaseSignOut(auth).catch(() => {});

    const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (!firebaseAuthDomain) {
      throw new Error('Firebase auth domain not configured');
    }

    // Store current timestamp as state
    const stateToken = Date.now().toString();
    localStorage.setItem('authState', stateToken);

    // Update the provider config
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline',
      redirect_uri: `https://${firebaseAuthDomain}/__/auth/handler`,
      state: stateToken
    });

    console.log('Auth Configuration:', {
      firebaseAuthDomain,
      redirectUri: `https://${firebaseAuthDomain}/__/auth/handler`,
      stateToken
    });

    await signInWithRedirect(auth, googleProvider);
    return true;
  } catch (error) {
    if (error instanceof FirebaseError) {
      console.error('Google sign-in error:', error);
      throw error;
    }
    console.error('Unexpected error during sign-in:', error);
    throw new Error('Failed to sign in with Google');
  }
};

// Enhanced redirect result handler with better type safety and error handling
export const handleRedirectResult = async (): Promise<RedirectResult | null> => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('Auth state check:', {
      storedState: localStorage.getItem('authState'),
      returnedState: urlParams.get('state')
    });
    // Verify state token
    const stateToken = localStorage.getItem('authState');
    const returnedState = urlParams.get('state');

    if (!stateToken || stateToken !== returnedState) {
      console.error('State mismatch or missing');
      throw new Error('Invalid authentication state');
    }

    const result = await getRedirectResult(auth);
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
    const scopesArray = grantedScopes.split(' ').filter(Boolean); // Remove empty strings
    
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

    console.log("Auth successful:", {
      uid: result.user.uid,
      email: result.user.email,
      hasToken: Boolean(accessToken),
      scopes: scopesArray,
      hasRequiredScopes
    });

    // Clear auth state after successful authentication
    localStorage.removeItem('authState');

    // Get stored return URL
    const returnUrl = localStorage.getItem('authReturnUrl');
    if (returnUrl) {
      window.location.href = `${returnUrl}/work-times`;
      localStorage.removeItem('authReturnUrl');
    }

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

  } catch (error: unknown) {
    console.error('Redirect result error:', {
      code: error instanceof FirebaseError ? error.code : 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Enhanced error handling with specific error types
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/credential-already-in-use') {
        throw new Error('This Google account is already linked to another user.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Google sign-in is not enabled. Please contact support.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('The sign-in credential is invalid. Please try again.');
      }
      throw error;
    }

    // Handle non-Firebase errors
    throw new Error('Failed to handle redirect result');
  }
};

// Enhanced sign out function with better error handling
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    // Clear any stored tokens or state
    sessionStorage.clear();
  } catch (error: unknown) {
    console.error('Sign out error:', {
      code: error instanceof FirebaseError ? error.code : 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to sign out. Please try again.');
  }
};

// Export auth and app instances for use in other parts of the application
export { auth, app };