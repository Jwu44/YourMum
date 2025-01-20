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
 * Get the appropriate redirect URL based on environment and context.
 * Handles preview deployments, development, and production environments.
 */
const getRedirectUrl = (): string => {
  try {
    // Get the current hostname and full URL for logging
    const currentHostname = window.location.hostname;
    const currentUrl = window.location.href;
    
    console.log('Determining redirect URL:', {
      hostname: currentHostname,
      fullUrl: currentUrl,
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL
    });

    // For Vercel preview deployments
    if (currentHostname.includes('vercel.app')) {
      return `https://${currentHostname}`;
    }

    // For local development
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:8000';
    }

    // For production
    const prodDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (!prodDomain) {
      console.error('Production domain not configured');
      throw new Error('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not configured');
    }

    return `https://${prodDomain}`;
  } catch (error) {
    console.error('Error determining redirect URL:', error);
    // Fallback to current origin as last resort
    return window.location.origin;
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
    sessionStorage.clear();
    await firebaseSignOut(auth).catch(() => {});

    // Get the current URL for dynamic redirect
    const currentUrl = window.location.origin;
    
    // Update the redirect URL in the provider
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline',
      // Set redirect to our auth handler instead of Firebase's
      redirect_uri: `${currentUrl}/auth/handler`
    });

    // Configure auth instance
    auth.config.authDomain = window.location.host;

    console.log('Auth Configuration:', {
      redirectUrl: `${currentUrl}/auth/handler`,
      authDomain: auth.config.authDomain
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
    console.log("Getting redirect result...");
    console.log("Current URL:", window.location.href);
    
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