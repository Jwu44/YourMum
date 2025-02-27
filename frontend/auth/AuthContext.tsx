'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';

// Define types for our context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
});

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If user exists, store in state
        setUser(user);
        try {
          // Send user data to your backend
          const idToken = await user.getIdToken();
          const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`; 
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

          if (!response.ok) {
            console.error('Failed to store user in database');
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

  const signIn = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      // Replace popup with redirect
      await signInWithRedirect(auth, provider);
      // The result will be handled in useEffect with getRedirectResult
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in with Google');
      throw error;
    }
  };
  
  // Add this to your useEffect to handle the redirect result
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully signed in after redirect
          console.log("Redirect sign-in successful");
        }
      } catch (error) {
        console.error("Redirect sign-in error:", error);
        setError('Failed to sign in with Google');
      }
    };
    
    handleRedirectResult();
  }, []);

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

  const value = {
    user,
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