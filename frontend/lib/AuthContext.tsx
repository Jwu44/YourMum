// contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth, signInWithGoogle, signOut } from '@/lib/firebase';
import { 
  AuthContextType, 
  AuthState, 
  UserDocument, 
  ApiResponse, 
  AuthResponse 
} from '@/lib/types';

// Extend Firebase User type with our custom fields
interface AuthUserType extends User {
  accessToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with typed values
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  const router = useRouter();

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get fresh token
          const token = await firebaseUser.getIdToken(true);
          
          // Save token to sessionStorage for API calls
          sessionStorage.setItem('authToken', token);
          
          // Get or create user in MongoDB via Next.js API
          const response = await fetch('/api/auth/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              googleId: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL
            })
          });

          if (!response.ok) {
            throw new Error('Failed to sync user with database');
          }

          const userData: ApiResponse<UserDocument> = await response.json();
          
          // Set user in state with proper typing
          setAuthState(prev => ({
            ...prev,
            user: userData.data || null
          }));
        } else {
          // Clear session data on sign out
          sessionStorage.removeItem('authToken');
          setAuthState(prev => ({ ...prev, user: null }));
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Authentication error'
        }));
      } finally {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Token refresh setup - every 30 minutes
  useEffect(() => {
    if (!authState.user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken(true);
          sessionStorage.setItem('authToken', token);
        }
      } catch (error) {
        console.error('Token refresh error:', error);
        // Force sign out on token refresh failure
        handleSignOut();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [authState.user]);

  const handleSignIn = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
  
      // 1. Sign in with Google through Firebase
      const { user: firebaseUser, accessToken } = await signInWithGoogle();
      
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }
  
      // 2. Sync user with backend through Next.js API
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          googleId: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: 'free' // Default role for new users
        })
      });
  
      if (!response.ok) {
        const errorData: ApiResponse<never> = await response.json();
        throw new Error(errorData.error || 'Failed to sync user data');
      }
  
      // 3. Process response data with proper typing
      const authResponse: AuthResponse = await response.json();
  
      // 4. Store auth data in session
      sessionStorage.setItem('authToken', accessToken);
      sessionStorage.setItem('userId', firebaseUser.uid);
  
      // 5. Set user in state
      setAuthState(prev => ({
        ...prev,
        user: authResponse.user,
        error: null
      }));
  
      // 6. Handle routing based on new/existing user
      if (authResponse.isNewUser) {
        router.push('/work-times');
      } else {
        router.push('/dashboard');
      }
  
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Handle specific error cases with type checking
      if (error instanceof Error) {
        switch (error.message) {
          case 'Sign-in cancelled by user':
          case 'popup-closed-by-user':
            setAuthState(prev => ({ ...prev, error: 'Sign-in was cancelled' }));
            break;
          case 'popup-blocked':
            setAuthState(prev => ({ ...prev, error: 'Please enable popups to sign in with Google' }));
            break;
          case 'Failed to sync user data':
            setAuthState(prev => ({ ...prev, error: 'Unable to connect to server. Please try again.' }));
            break;
          default:
            setAuthState(prev => ({ ...prev, error: error.message }));
        }
      } else {
        setAuthState(prev => ({ ...prev, error: 'An unexpected error occurred' }));
      }
  
      // Clear any partial auth state
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userId');
  
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Call Firebase sign out
      await signOut();
      
      // Clear auth state
      setAuthState({
        user: null,
        loading: false,
        error: null
      });
      
      // Clear session storage
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userId');
      
      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to sign out'
      }));
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  // Construct context value with proper typing
  const contextValue: AuthContextType = {
    ...authState,
    signIn: handleSignIn,
    signOut: handleSignOut,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context with proper typing
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}