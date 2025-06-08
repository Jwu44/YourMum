'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, provider } from './firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { AuthContextType, CalendarCredentials } from '@/lib/types';
import { calendarApi } from '@/lib/api/calendar';

/**
 * Auth Context for managing user authentication state
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Custom hook to access auth context
 * @returns The current auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Process calendar access and connect to Google Calendar
   * @param credential Google Auth credential
   */
  const processCalendarAccess = async (credential: any): Promise<void> => {
    try {
      // Get scopes and check for calendar access
      const scopes = await getScopes(credential.accessToken);
      const hasCalendarAccess = scopes.some(scope => 
        scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
      );
      
      console.log("Has calendar access:", hasCalendarAccess);
      
      if (hasCalendarAccess) {
        try {
          // Small delay to ensure Firebase auth state is fully established
          console.log("Waiting for auth state to stabilize before connecting to Google Calendar...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Create credentials object
          console.log("Connecting to Google Calendar...");
          const credentials: CalendarCredentials = {
            accessToken: credential.accessToken,
            expiresAt: Date.now() + 3600000, // 1 hour expiry as a fallback
            scopes: scopes
          };
          
          // Connect to calendar with retry mechanism
          await calendarApi.connectCalendar(credentials);
          console.log("Connected to Google Calendar");
          
          // Fetch events for current day
          const today = new Date().toISOString().split('T')[0];
          await calendarApi.fetchEvents(today);
        } catch (calendarError) {
          console.error("Error connecting to calendar:", calendarError);
          // Continue to dashboard even if calendar connection fails
        }
      }
      
      // Get intended redirect destination
      const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard';
      localStorage.removeItem('authRedirectDestination');
      
      // Navigate to intended destination
      console.log("Navigating to:", redirectTo);
      window.location.href = redirectTo;
    } catch (error) {
      console.error("Error processing calendar access:", error);
      // Fallback to dashboard
      const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard';
      localStorage.removeItem('authRedirectDestination');
      window.location.href = redirectTo;
    }
  };

  /**
   * Store user information in the backend
   * @param user Firebase user object
   */
  const storeUserInBackend = async (user: User): Promise<void> => {
    try {
      // Get the token
      const idToken = await user.getIdToken();
      console.log("Got ID token for backend storage");
      
      // Check if NEXT_PUBLIC_API_URL is set correctly
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://yourdai.be';
      console.log("API Base URL:", apiBaseUrl);

      const response = await fetch(`${apiBaseUrl}/api/auth/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          googleId: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          hasCalendarAccess: false // Will be updated when calendar is connected
        }),
      });

      if (response.ok) {
        console.log("User stored in backend successfully");
      } else {
        console.error("Failed to store user in backend:", response.status);
      }
    } catch (error) {
      console.error("Error storing user in backend:", error);
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. User:", user ? `${user.displayName} (${user.email})` : "null");
      
      // Set user state immediately to prevent UI blocking
      setUser(user);
      setLoading(false);
      
      if (user) {
        await storeUserInBackend(user);
        console.log("Authentication completed successfully");
      }
    });
  
    // Cleanup subscription
    return () => unsubscribe();
  }, []);
  
  // Handle redirect result and check for calendar access
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log("Checking redirect result...");
        const result = await getRedirectResult(auth);
        console.log("Redirect result:", result);
        
        if (result) {
          // User successfully signed in after redirect
          console.log("Redirect sign-in successful");
        
          // Get credentials from result
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (!credential || !credential.accessToken) {
            console.error("Missing credential or access token");
            // Get intended redirect destination
            const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard';
            localStorage.removeItem('authRedirectDestination');
            window.location.href = redirectTo;
            return;
          }
          
          await processCalendarAccess(credential);
        } else {
          console.log("No redirect result found");
        }
      } catch (error) {
        console.error("Redirect sign-in error:", error);
        setError('Failed to sign in with Google');
        // Get intended redirect destination
        const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard';
        localStorage.removeItem('authRedirectDestination');
        window.location.href = redirectTo;
      }
    };
    
    handleRedirectResult();
  }, []);

  /**
   * Sign in with Google and request calendar access
   * @param redirectTo Destination after successful sign-in
   */
  const signIn = async (redirectTo = '/dashboard') => {
    try {
      setError(null);
      console.log("Starting sign in process, redirect destination:", redirectTo);
      
      // Check if user is already authenticated
      if (user) {
        console.log("User already authenticated, redirecting to:", redirectTo);
        window.location.href = redirectTo;
        return;
      }
      
      // Store the intended destination
      localStorage.setItem('authRedirectDestination', redirectTo);
      console.log("Stored redirect destination in localStorage");
      
      // Configure provider to request calendar access and force consent screen
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
      provider.setCustomParameters({
        prompt: 'consent'  // Force the consent screen to appear
      });
      
      console.log("Initiating signInWithPopup");
      
      try {
        // Try popup first
        const result = await signInWithPopup(auth, provider);
        console.log("Sign in successful:", result.user ? 
          `${result.user.displayName} (${result.user.email})` : "No user");
        
        // Get credentials from result
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential && credential.accessToken) {
          await processCalendarAccess(credential);
        } else {
          // No calendar access, redirect anyway
          const destination = localStorage.getItem('authRedirectDestination') || '/dashboard';
          localStorage.removeItem('authRedirectDestination');
          window.location.href = destination;
        }
      } catch (popupError: any) {
        // If popup fails, try redirect as fallback
        console.log("Popup failed, falling back to redirect:", popupError.message);
        
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/cancelled-popup-request' ||
            popupError.code === 'auth/popup-closed-by-user') {
          
          console.log("Using signInWithRedirect as fallback");
          await signInWithRedirect(auth, provider);
          // Note: signInWithRedirect doesn't return immediately
          // The result will be handled by getRedirectResult in the useEffect
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in with Google');
      // Clean up localStorage on error
      localStorage.removeItem('authRedirectDestination');
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Clear any stored redirect destinations
      localStorage.removeItem('authRedirectDestination');
      // Note: User state will be automatically set to null by onAuthStateChanged
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,                // Add this to satisfy AuthState
    currentUser: user,   // This is your renamed property
    loading,
    error,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Get scopes associated with an access token
 * @param accessToken Google OAuth access token
 * @returns Array of scope strings
 */
const getScopes = async (accessToken: string): Promise<string[]> => {
  try {
    // This endpoint will return the scopes associated with the token
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.scope ? data.scope.split(' ') : [];
  } catch (error) {
    console.error('Error getting token scopes:', error);
    return [];
  }
};