import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut 
} from 'firebase/auth';

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
  // Request access to calendars immediately
  prompt: 'consent',
  // Include calendar access in initial permissions request
  access_type: 'offline'
});

// Enhanced sign in function that returns calendar access token
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Get Google OAuth access token and calendar-specific credentials
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    // Get scopes granted by user
    const grantedScopes = (result.user as any)._delegate.accessToken?.scope || '';
    
    // Check if calendar scope was granted
    const hasCalendarAccess = grantedScopes.includes('calendar');
    
    return { 
      user: result.user,
      accessToken,
      hasCalendarAccess,
      scopes: grantedScopes
    };
  } catch (error: any) {
    // Handle specific error cases
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        throw new Error('Sign-in cancelled by user');
      case 'auth/popup-blocked':
        throw new Error('Sign-in popup was blocked. Please enable popups');
      case 'auth/cancelled-popup-request':
        throw new Error('Another sign-in attempt is in progress');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled');
      default:
        console.error('Google sign-in error:', error);
        throw new Error('Failed to sign in with Google');
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