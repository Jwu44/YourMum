'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, provider } from './firebase';
import { signInWithPopup, getRedirectResult } from 'firebase/auth';
import { AuthContextType } from '@/lib/types';
import { calendarApi } from '@/lib/api/calendar';

const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use the auth context
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

  // Handle Firebase auth state changes
  useEffect(() => {
    console.log("Setting up auth state change listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. User:", user ? `${user.displayName} (${user.email})` : "null");
      
      // Set user state immediately to prevent UI blocking
      setUser(user);
      setLoading(false);
      
      if (user) {
        try {
          // Get the token
          const idToken = await user.getIdToken();
          console.log("Got ID token");
          
          // Check if NEXT_PUBLIC_API_URL is set correctly
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://yourdai.be';
          console.log("API Base URL from env:", apiBaseUrl);
          
          // Now try the user endpoint
          const apiUrl = `${apiBaseUrl}/api/auth/user`;
          console.log("Attempting to store user at:", apiUrl);
          
          // Create a longer timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.error("Request to user endpoint timed out after 20 seconds");
            controller.abort();
          }, 20000);
          
          // Try to store the user
          fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              googleId: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              hasCalendarAccess: true
            }),
            signal: controller.signal
          })
          .then(response => {
            clearTimeout(timeoutId);
            console.log("User endpoint status:", response.status);
            if (!response.ok) {
              return response.text().then(text => {
                console.error('Error storing user:', text);
                throw new Error(text);
              });
            }
            return response.json();
          })
          .then(data => {
            console.log("User stored successfully:", data);
          })
          .catch(error => {
            // Only log the error but don't prevent the user from using the app
            console.error("Error storing user (non-blocking):", error);
            
            // Fall back to using the application without server-side user storage
            console.log("Continuing without server-side user storage");
          });
          
          // Continue authentication flow without waiting for user storage
          console.log("Authentication completed successfully");
        } catch (error) {
          console.error("Authentication process error:", error);
        }
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
        
          // Get credentials from result.credential
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (!credential || !credential.accessToken) {
            console.error("Missing credential or access token");
            window.location.href = '/dashboard';
            return;
          }
          
          // Get scopes and check for calendar access
          const scopes = await getScopes(credential.accessToken);
          const hasCalendarAccess = scopes.some(scope => 
            scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
          );
          
          console.log("Has calendar access:", hasCalendarAccess);
          
          if (hasCalendarAccess) {
            try {
              // Connect to Google Calendar with credentials
              console.log("Connecting to Google Calendar...");
              const credentials = {
                accessToken: credential.accessToken,
                expiresAt: Date.now() + 3600000, // 1 hour expiry as a fallback
                scopes: scopes
              };
              
              await calendarApi.connectCalendar(credentials);
              console.log("Connected to Google Calendar");
              
              // Fetch events for current day
              const today = new Date().toISOString().split('T')[0];
              await calendarApi.fetchEvents(today);
              
              // Navigate to dashboard
              console.log("Navigating to dashboard");
              window.location.href = '/dashboard';
            } catch (calendarError) {
              console.error("Error connecting to calendar:", calendarError);
              window.location.href = '/dashboard';
            }
          } else {
            // No calendar access, go to dashboard with empty schedule
            console.log("No calendar access, navigating to dashboard");
            window.location.href = '/dashboard';
          }
        } else {
          console.log("No redirect result found");
        }
      } catch (error) {
        console.error("Redirect sign-in error:", error);
        setError('Failed to sign in with Google');
      }
    };
    
    handleRedirectResult();
  }, []);

  // Sign in function with Google Calendar scopes
  const signIn = async (redirectTo = '/dashboard') => {
    try {
      setError(null);
      console.log("Starting sign in process, redirect destination:", redirectTo);
      
      // Store the intended destination to access after authentication completes
      localStorage.setItem('authRedirectDestination', redirectTo);
      console.log("Stored redirect destination in localStorage");
      
      // Configure provider to request calendar access
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
      
      console.log("Initiating signInWithPopup");
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful:", result.user ? `${result.user.displayName} (${result.user.email})` : "No user");
      
      // Get credentials from result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        // Get scopes and check for calendar access
        const scopes = await getScopes(credential.accessToken);
        const hasCalendarAccess = scopes.some(scope => 
          scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
        );
        
        if (hasCalendarAccess) {
          try {
            // Connect to Google Calendar with credentials
            const credentials = {
              accessToken: credential.accessToken,
              expiresAt: Date.now() + 3600000, // 1 hour expiry as a fallback
              scopes: scopes
            };
            
            await calendarApi.connectCalendar(credentials);
            
            // Fetch events for current day
            const today = new Date().toISOString().split('T')[0];
            await calendarApi.fetchEvents(today);
            
            // Navigate to dashboard
            window.location.href = '/dashboard';
            return;
          } catch (calendarError) {
            console.error("Error connecting to calendar:", calendarError);
          }
        }
      }
      
      // If calendar connection failed or no access, go to dashboard with empty schedule
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in with Google');
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
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

// Helper function to get scopes
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