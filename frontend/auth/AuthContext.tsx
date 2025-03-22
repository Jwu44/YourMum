'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, provider } from './firebase';
import { signInWithPopup, getRedirectResult } from 'firebase/auth';
import { AuthContextType } from '@/lib/types';

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
          
          // Try to store the user, but don't block the UI flow
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
              hasCalendarAccess: false
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
  // Add this to your useEffect to handle the redirect result
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log("Checking redirect result...");
        const result = await getRedirectResult(auth);
        console.log("Redirect result:", result);
        
        if (result) {
          // User successfully signed in after redirect
          console.log("Redirect sign-in successful");
          
          // Get the intended destination from localStorage (if set)
          const intendedRoute = localStorage.getItem('authRedirectDestination');
          console.log("Intended route from localStorage:", intendedRoute);
          
          // Clear the stored route regardless of what happens next
          localStorage.removeItem('authRedirectDestination');
          
          // Navigate to the intended route if one was saved, otherwise default to /priorities
          if (intendedRoute) {
            console.log("Navigating to intended route:", intendedRoute);
            window.location.href = intendedRoute;
          } else {
            console.log("Navigating to default route: /priorities");
            window.location.href = '/priorities';
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

  // Also add logging to the signIn function
  const signIn = async (redirectTo = '/priorities') => {
    try {
      setError(null);
      console.log("Starting sign in process, redirect destination:", redirectTo);
      
      // Store the intended destination to access after authentication completes
      localStorage.setItem('authRedirectDestination', redirectTo);
      console.log("Stored redirect destination in localStorage");
      
      console.log("Initiating signInWithPopup");
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful:", result.user ? `${result.user.displayName} (${result.user.email})` : "No user");
      
      // The user state will be updated by the onAuthStateChanged listener,
      // but we can navigate right away since we have confirmation of success
      const intendedRoute = localStorage.getItem('authRedirectDestination') || '/work-times';
      console.log("Navigating to:", intendedRoute);
      localStorage.removeItem('authRedirectDestination');
      window.location.href = intendedRoute;
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