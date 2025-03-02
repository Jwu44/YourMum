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
            
            // Test the base domain first
            try {
              console.log("Testing base domain...");
              const baseResponse = await fetch('https://yourdai.be', {
                method: 'GET',
                mode: 'no-cors' // Try with no-cors to at least verify connectivity
              });
              console.log("Base domain response type:", baseResponse.type);
            } catch (baseError) {
              console.error("Base domain test failed:", baseError);
            }
            
            // Test API root
            try {
              console.log("Testing API root...");
              const apiRootResponse = await fetch('https://yourdai.be/api', {
                method: 'GET',
                mode: 'no-cors'
              });
              console.log("API root response type:", apiRootResponse.type);
            } catch (apiRootError) {
              console.error("API root test failed:", apiRootError);
            }
            
            // Try the actual endpoint with a timeout
            console.log("Testing actual endpoint...");
            const apiUrl = 'https://yourdai.be/api/auth/user';
            console.log("API URL:", apiUrl);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            try {
              // First try a GET request to see if the endpoint exists
              console.log("Trying GET request to endpoint...");
              const getResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${idToken}`
                },
                signal: controller.signal
              }).catch(e => {
                console.error("GET request failed:", e);
                return null;
              });
              
              if (getResponse) {
                console.log("GET response status:", getResponse.status);
              }
              
              // Now try the POST request
              console.log("Trying POST request to endpoint...");
              const userData = {
                googleId: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                hasCalendarAccess: false
              };
              
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify(userData),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              console.log("POST response status:", response.status);
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Error details:', errorText);
              } else {
                console.log("User successfully stored in database");
              }
            } catch (fetchError) {
              clearTimeout(timeoutId);
              console.error('Fetch error:', fetchError);
              
              // Try alternative API URL formats
              console.log("Trying alternative API URL formats...");
              
              // Try with api subdomain
              try {
                console.log("Trying api.yourdai.be...");
                const altResponse = await fetch(`https://api.yourdai.be/auth/user`, {
                  method: 'GET',
                  mode: 'no-cors'
                });
                console.log("Alternative domain response type:", altResponse.type);
              } catch (altError) {
                console.error("Alternative domain test failed:", altError);
              }
            }
          } catch (error) {
            console.error('Error in auth flow:', error);
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
          
          // Navigate to the intended route if one was saved, otherwise default to /work-times
          if (intendedRoute) {
            console.log("Navigating to intended route:", intendedRoute);
            window.location.href = intendedRoute;
          } else {
            console.log("Navigating to default route: /work-times");
            window.location.href = '/work-times';
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
  const signIn = async (redirectTo = '/work-times') => {
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