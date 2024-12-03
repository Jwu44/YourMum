import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,  // Changed from signInWithPopup
  getRedirectResult,   // Added to handle redirect results
  signOut as firebaseSignOut 
} from 'firebase/auth';

import { CalendarCredentials } from './types';

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Configure Google Auth Provider with Calendar scopes
const googleProvider = new GoogleAuthProvider();

// Add required Google Calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');        // Read calendar events
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly'); // Read event details
googleProvider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly'); // Read list of calendars
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Optional: Add settings scope if you want to manage calendar settings
// googleProvider.addScope('https://www.googleapis.com/auth/calendar.settings.readonly');

// Configure sign in with custom parameters
googleProvider.setCustomParameters({
  // Force account selection every time
  prompt: 'select_account',
  // Include calendar access in initial permissions request
  access_type: 'offline'
});

// Enhanced sign in function that initiates redirect to Google sign-in page
export const signInWithGoogle = async () => {
  try {
    // Redirect to Google sign-in page
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error('Google sign-in redirect error:', error);
    throw new Error('Failed to initiate Google sign-in');
  }
};

// New function to handle redirect result
export const handleRedirectResult = async () => {
  try {
    // Get the result of the redirect operation
    const result = await getRedirectResult(auth);
    
    // If no result, user hasn't completed sign-in yet
    if (!result) return null;
    
    // Get Google OAuth access token and calendar-specific credentials
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    if (!accessToken) {
      console.error('No access token received from Google');
      throw new Error('Failed to get access token');
    }

        // Get scopes granted by user from the credential
    // Cast credential to any to access non-standard properties
    const grantedScopes = ((credential as any)?.scope as string) || '';
    
    // Convert space-separated scope string to array for type compatibility
    const scopesArray = grantedScopes.split(' ');
    
    // Check if calendar scope was granted - check for specific calendar scopes
    const hasCalendarAccess = scopesArray.some((scope: string) => 
      scope.includes('calendar.readonly') || 
      scope.includes('calendar.events.readonly') ||
      scope.includes('calendar.calendarlist.readonly')
    );
    
    // Create properly typed calendar credentials
    const calendarCredentials: CalendarCredentials = {
      accessToken,
      expiresAt: Date.now() + 3600 * 1000, // Set expiration to 1 hour from now
      scopes: scopesArray
    };
    
    // Log for debugging
    console.log('Auth Result:', {
      user: result.user,
      hasToken: Boolean(accessToken),
      scopes: scopesArray,
      hasCalendarAccess
    });
    
    return { 
      user: result.user,
      credentials: calendarCredentials,
      hasCalendarAccess,
      scopes: grantedScopes
    };
  } catch (error: any) {
    console.error('Full redirect result error:', error);
    // Handle specific error cases
    switch (error.code) {
      case 'auth/account-exists-with-different-credential':
        throw new Error('Account exists with different credentials');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled');
      case 'auth/operation-not-allowed':
        throw new Error('Google sign-in is not enabled');
      default:
        throw new Error(error.message || 'Failed to complete Google sign-in');
    }
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
};

export { auth, app };