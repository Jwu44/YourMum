import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Auth Provider with Calendar scopes
const googleProvider = new GoogleAuthProvider();

// Define return type interface
interface RedirectResult {
  user: any;
  credentials: CalendarCredentials;
  hasCalendarAccess: boolean;
  scopes: string;
}

// Add required Google Calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');        // Read calendar events
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly'); // Read event details
googleProvider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly'); // Read list of calendars
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Optional: Add settings scope if you want to manage calendar settings
// googleProvider.addScope('https://www.googleapis.com/auth/calendar.settings.readonly');

// Configure sign in with custom parameters
// Let Firebase handle the redirect URI internally
googleProvider.setCustomParameters({
  prompt: 'select_account',  // Force account selection every time
  access_type: 'offline'     // Request refresh token for long-term access
});

// Enhanced sign in function that initiates redirect to Google sign-in page
export const signInWithGoogle = async () => {
  try {
    // Clear any existing auth states
    sessionStorage.clear();

    console.log("Initiating Google sign-in with config:", {
      scopes: googleProvider.getScopes()
    });

    // Initiate the redirect sign-in
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Function to handle redirect result
export const handleRedirectResult = async (): Promise<RedirectResult | null> => {
  try {
    console.log("Getting redirect result...");
    
    // Get the redirect result from Firebase
    const result = await getRedirectResult(auth);
    
    if (!result) {
      console.log("No redirect result - user hasn't completed sign-in");
      return null;
    }

    // Get Google OAuth access token from the credential
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    if (!accessToken) {
      console.error('No access token received from Google');
      throw new Error('Failed to get access token');
    }

    // Get scopes granted by the user
    const grantedScopes = ((credential as any)?.scope as string) || '';
    const scopesArray = grantedScopes.split(' ');
    
    console.log("Auth successful:", {
      uid: result.user.uid,
      email: result.user.email,
      hasToken: Boolean(accessToken),
      scopes: scopesArray
    });

    // Return the authentication result with necessary information
    return { 
      user: result.user,
      credentials: {
        accessToken,
        expiresAt: Date.now() + 3600 * 1000, // Token expires in 1 hour
        scopes: scopesArray
      },
      hasCalendarAccess: scopesArray.some(scope => 
        scope.includes('calendar')),
      scopes: grantedScopes
    };

  } catch (error: any) {
    console.error('Redirect result error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Sign out function
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
};

// Export auth and app instances for use in other parts of the application
export { auth, app };