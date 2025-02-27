'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
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
      if (user) {
        // If user exists, store in state
        setUser(user);
        try {
          // Send user data to your backend
          const idToken = await user.getIdToken();
          console.log("Got ID token, sending to backend");
          const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`; 
          console.log("API URL:", apiUrl);
          
          const response = await fetch(apiUrl, {
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
              hasCalendarAccess: false, // Default value
            }),
          });
  
          console.log("Backend response status:", response.status);
          if (!response.ok) {
            console.error('Failed to store user in database');
            const errorText = await response.text();
            console.error('Error details:', errorText);
          } else {
            console.log("User successfully stored in database");
          }
        } catch (error) {
          console.error('Error storing user:', error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
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
    
    // Store the intended destination to access after redirect completes
    localStorage.setItem('authRedirectDestination', redirectTo);
    console.log("Stored redirect destination in localStorage");
    
    const provider = new GoogleAuthProvider();
    // Replace popup with redirect
    console.log("Initiating signInWithRedirect");
    await signInWithRedirect(auth, provider);
    // The result will be handled in useEffect with getRedirectResult
    console.log("signInWithRedirect called"); // This might not show if redirect happens immediately
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