import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  connectAuthEmulator,
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

// Update getRedirectUrl to handle development environment properly
const getRedirectUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    // Use HTTPS localhost
    return 'https://localhost:8001';
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
};

// Configure Google Auth Provider with Calendar scopes
const googleProvider = new GoogleAuthProvider();

// Add required Google Calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');        // Read calendar events
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly'); // Read event details
googleProvider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly'); // Read list of calendars
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Configure Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline',
  redirect_uri: getRedirectUrl()
});

// Enhanced sign in function with better error handling and logging
export const signInWithGoogle = async () => {
  try {
    sessionStorage.clear();
    await firebaseSignOut(auth).catch(() => {});

    // Log the current configuration
    console.log('Auth Configuration:', {
      currentEnvironment: process.env.NODE_ENV,
      redirectUrl: getRedirectUrl(),
      authDomain: auth.config.authDomain
    });

    // Override auth domain for development
    // if (process.env.NODE_ENV === 'development') {
    //   auth.config.authDomain = 'localhost:8001';
    // }

    await signInWithRedirect(auth, googleProvider);
    return true;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
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
    const grantedScopes = ((credential as any)?.scope as string) || '';
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

  } catch (error: any) {
    console.error('Redirect result error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    // Enhanced error handling with specific error types
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error('This Google account is already linked to another user.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in is not enabled. Please contact support.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('The sign-in credential is invalid. Please try again.');
    }

    throw error;
  }
};

// Enhanced sign out function with better error handling
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    // Clear any stored tokens or state
    sessionStorage.clear();
  } catch (error: any) {
    console.error('Sign out error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw new Error('Failed to sign out. Please try again.');
  }
};

// Export auth and app instances for use in other parts of the application
export { auth, app };