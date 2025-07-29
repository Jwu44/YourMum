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

// Add this constant at the top after imports
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOAuthInProgress, setIsOAuthInProgress] = useState(false);

  /**
   * Process calendar access and connect to Google Calendar
   * @param credential Google Auth credential
   */
  const processCalendarAccess = async (credential: any): Promise<void> => {
    try {
      setIsOAuthInProgress(true);
      
      // Get scopes and check for calendar access
      const scopes = await getScopes(credential.accessToken);
      const hasCalendarAccess = scopes.some(scope => 
        scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
      );
      
      console.log("Has calendar access:", hasCalendarAccess);
      
      // Store user with correct calendar access flag
      if (auth.currentUser) {
        console.log("Storing user with calendar access flag:", hasCalendarAccess);
        await storeUserInBackend(auth.currentUser, hasCalendarAccess);
      }
      
      if (hasCalendarAccess) {
        try {
          console.log("Starting calendar connection process...");
          
          // Get intended final destination
          const finalDestination = localStorage.getItem('authRedirectDestination') || '/dashboard';
          localStorage.removeItem('authRedirectDestination');
          
          // Create credentials object and connect to calendar immediately
          console.log("Connecting to Google Calendar...");
          const credentials: CalendarCredentials = {
            accessToken: credential.accessToken,
            expiresAt: Date.now() + 3600000, // 1 hour expiry as a fallback
            scopes: scopes
          };
          
          // Connect to calendar - this should be atomic (success or failure)
          await calendarApi.connectCalendar(credentials);
          console.log("Connected to Google Calendar successfully");
          
          // Direct redirect to final destination - no intermediate connecting page
          console.log("Calendar connection complete, redirecting to:", finalDestination);
          setIsOAuthInProgress(false);
          window.location.href = finalDestination;
          
        } catch (calendarError) {
          console.error("Error connecting to calendar:", calendarError);
          setIsOAuthInProgress(false);
          
          // Simple error handling - redirect to dashboard with error flag
          const finalDestination = localStorage.getItem('authRedirectDestination') || '/dashboard';
          localStorage.removeItem('authRedirectDestination');
          
          const errorMessage = calendarError instanceof Error ? calendarError.message : 'Failed to connect to Google Calendar';
          localStorage.setItem('calendarConnectionError', errorMessage);
          
          console.log("Calendar connection failed, redirecting to dashboard with error");
          window.location.href = finalDestination;
        }
      } else {
        // No calendar access, redirect directly to dashboard
        const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard';
        localStorage.removeItem('authRedirectDestination');
        
        console.log("No calendar access, navigating to:", redirectTo);
        setIsOAuthInProgress(false);
        window.location.href = redirectTo;
      }
      
    } catch (error) {
      console.error("Error processing calendar access:", error);
      setIsOAuthInProgress(false);
      
      // Simple error handling - redirect to dashboard with error message
      const errorMessage = error instanceof Error ? error.message : 'Authentication process failed';
      localStorage.setItem('calendarConnectionError', errorMessage);
      
      // Fallback to dashboard
      const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard';
      localStorage.removeItem('authRedirectDestination');
      window.location.href = redirectTo;
    }
  };

  /**
   * Store user information in the backend
   * @param user Firebase user object
   * @param hasCalendarAccess Optional flag indicating if user has granted calendar access
   */
  const storeUserInBackend = async (user: User, hasCalendarAccess: boolean = false): Promise<void> => {
    try {
      // Force token refresh to ensure it's valid
      const idToken = await user.getIdToken(true); // Force refresh
      console.log("Got fresh ID token for backend storage");
      console.log("Calendar access status:", hasCalendarAccess);
      
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
          hasCalendarAccess: hasCalendarAccess // Pass the actual calendar access state
        }),
      });

      if (response.ok) {
        console.log("User stored in backend successfully with calendar access:", hasCalendarAccess);
      } else {
        const errorText = await response.text();
        console.error("Failed to store user in backend:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error storing user in backend:", error);
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // If in development mode with bypass enabled, create a mock user
    if (IS_DEVELOPMENT && BYPASS_AUTH) {
      console.log("Development mode: bypassing authentication");
      const mockUser = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        displayName: 'Dev User',
        photoURL: null,
        getIdToken: async () => 'mock-token-for-development'
      } as User;
      
      setUser(mockUser);
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. User:", user ? `${user.displayName} (${user.email})` : "null");
      console.log("OAuth in progress:", isOAuthInProgress);
      
      // Set user state immediately to prevent UI blocking
      setUser(user);
      setLoading(false);
      
      // Only store user in backend if not during OAuth flow
      // OAuth flow handles user creation with correct calendar access
      if (user && !isOAuthInProgress) {
        console.log("Storing user from auth state change (non-OAuth)");
        await storeUserInBackend(user, false); // Explicitly set no calendar access for non-OAuth
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

  /**
   * Reconnect Google Calendar for existing authenticated users
   * This triggers the OAuth flow specifically for calendar access
   */
  const reconnectCalendar = async () => {
    try {
      setError(null);
      console.log("Starting calendar reconnection process");
      
      if (!user) {
        throw new Error('User must be authenticated to reconnect calendar');
      }
      
      // Configure provider to request calendar access and force consent screen
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
      provider.setCustomParameters({
        prompt: 'consent'  // Force the consent screen to appear
      });
      
      console.log("Initiating calendar reconnection with popup");
      
      try {
        // Use popup for calendar reconnection (no redirect needed)
        const result = await signInWithPopup(auth, provider);
        console.log("Calendar reconnection successful");
        
        // Get credentials from result
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential && credential.accessToken) {
          await processCalendarAccess(credential);
        } else {
          throw new Error('No calendar access token received');
        }
      } catch (popupError: any) {
        console.error("Calendar reconnection popup failed:", popupError.message);
        throw new Error('Calendar reconnection failed. Please try again.');
      }
    } catch (error) {
      console.error('Calendar reconnection error:', error);
      setError('Failed to reconnect calendar');
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
    reconnectCalendar,
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