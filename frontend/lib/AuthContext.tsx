"use client"; 
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, signInWithGoogle, signOut, handleRedirectResult } from '@/lib/firebase';
import { tokenService } from './tokenService';
import { calendarApi } from './calendarApi';
import { 
  AuthContextType, 
  AuthState,  
  AuthResponse
} from '@/lib/types';

// Update interface to include calendar-specific state
interface CalendarAuthState {
  connected: boolean;
  syncStatus: 'never' | 'in_progress' | 'completed' | 'failed';
  lastSyncTime: string | null;
  selectedCalendars: string[];
}

// Extended context type to include calendar state
interface ExtendedAuthContextType extends AuthContextType {
  calendarState: CalendarAuthState;
  connectCalendar: (selectedCalendars: string[]) => Promise<void>;  // Updated signature
  disconnectCalendar: () => Promise<void>;
  refreshCalendarToken: () => Promise<void>;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  
  // Add calendar-specific state
  const [calendarState, setCalendarState] = useState<CalendarAuthState>({
    connected: false,
    syncStatus: 'never',
    lastSyncTime: null,
    selectedCalendars: []
  });

  const router = useRouter();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          // User successfully signed in
          const token = await result.user.getIdToken(true);
          sessionStorage.setItem('authToken', token);
          
          // Store calendar access token if available
          if (result.credentials) {
            await tokenService.storeCalendarTokens(
              result.user.uid, 
              result.credentials
            );
          }
          
          // Get or create user in MongoDB
          const response = await fetch('/api/auth/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              googleId: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName,
              photoURL: result.user.photoURL,
              hasCalendarAccess: Boolean(result.credentials) // Update based on actual credentials
            })
          });
    
          if (!response.ok) {
            throw new Error('Failed to sync user with database');
          }
    
          const userData = await response.json();
          
          setAuthState({
            user: userData.user,
            loading: false,
            error: null
          });
    
          // Only redirect if we have a user
          if (userData.user) {
            router.push('/work-times');
          }
        }
      } catch (error) {
        console.error('Auth redirect result error:', error);
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        }));
      }
    };

    handleAuthRedirect();
  }, [router]);

  // Add calendar token refresh interval
  useEffect(() => {
    if (!authState.user?.googleId) return;

    const refreshInterval = setInterval(async () => {
      try {
        if (await tokenService.needsRefresh(authState.user!.googleId)) {
          await refreshCalendarToken();
        }
      } catch (error) {
        console.error('Calendar token refresh error:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [authState.user]);

  const handleSignIn = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await signInWithGoogle();
      // The redirect will happen here, and the rest will be handled
      // by the redirect handler when the user returns
    } catch (error) {
      console.error('Sign-in error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to sign in'
      }));
    }
  };
  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in, handle the auth state
          const token = await firebaseUser.getIdToken(true);
          sessionStorage.setItem('authToken', token);
          
          // Get or create user in MongoDB
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

          const userData: AuthResponse = await response.json();
          
          setAuthState({
            user: userData.user,
            loading: false,
            error: null
          });

        } else {
          // No user is signed in - just update state without redirect
          setAuthState({
            user: null,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        });
      }
    });

    return () => unsubscribe();
  }, []);

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

  const connectCalendar = async (selectedCalendars: string[]) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      if (!authState.user?.googleId) {
        throw new Error('User not authenticated');
      }

      // First verify permissions
      const token = await tokenService.getValidAccessToken(authState.user.googleId);
      if (!token) {
        throw new Error('No valid calendar token');
      }

      const permissionsResult = await calendarApi.verifyCalendarPermissions(token);
      
      if (!permissionsResult.hasPermissions) {
        throw new Error('Calendar permissions not granted');
      }

      // Connect calendar with selected calendars
      const result = await calendarApi.connectCalendar(
        authState.user.googleId,
        selectedCalendars
      );

      setCalendarState({
        connected: true,
        syncStatus: result.status,
        lastSyncTime: new Date().toISOString(),
        selectedCalendars
      });

    } catch (error) {
      console.error('Calendar connection error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect calendar'
      }));
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const disconnectCalendar = async () => {
    try {
      if (!authState.user?.googleId) return;
      
      await calendarApi.disconnectCalendar(authState.user.googleId);
      await tokenService.clearTokens(authState.user.googleId);
      
      setCalendarState({
        connected: false,
        syncStatus: 'never',
        lastSyncTime: null,
        selectedCalendars: []
      });
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect calendar'
      }));
    }
  };

  // Add calendar status polling
  useEffect(() => {
    if (!authState.user?.googleId || !calendarState.connected) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await calendarApi.getCalendarStatus(authState.user!.googleId);
        setCalendarState(prev => ({
          ...prev,
          ...status
        }));
      } catch (error) {
        console.error('Calendar status check error:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [authState.user?.googleId, calendarState.connected]);


  const refreshCalendarToken = async () => {
    try {
      if (!authState.user?.googleId) return;
      const newToken = await tokenService.getValidAccessToken(authState.user.googleId);
      if (!newToken) {
        throw new Error('Failed to refresh calendar token');
      }
      // Token is automatically stored by the token service
    } catch (error) {
      console.error('Token refresh error:', error);
      // On critical token errors, disconnect calendar
      await disconnectCalendar();
    }
  };

  const value: ExtendedAuthContextType = {
    ...authState,
    signIn: handleSignIn,
    signOut: handleSignOut,
    clearError: () => setAuthState(prev => ({ ...prev, error: null })),
    calendarState,
    connectCalendar,
    disconnectCalendar,
    refreshCalendarToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Updated hook to include calendar functionality
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}