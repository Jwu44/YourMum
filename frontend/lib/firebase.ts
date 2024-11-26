import React from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut 
} from 'firebase/auth';

// Your Firebase configuration
// Get these values from Firebase Console -> Project Settings -> General
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase (only if no apps exist)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const analytics = getAnalytics(app);

// Configure additional scopes for Google Calendar access
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');

// Custom hook for auth state
export const useFirebaseAuth = () => {
  const [user, setUser] = React.useState(auth.currentUser);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return { user, loading };
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Get Google OAuth access token for Calendar API
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    
    // Return both user and access token
    return { 
      user: result.user,
      accessToken 
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
      default:
        console.error('Google sign-in error:', error);
        throw new Error('Failed to sign in with Google');
    }
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
};

export { auth, app };