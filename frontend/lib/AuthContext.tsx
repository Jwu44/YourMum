import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth, signInWithGoogle, signOut } from '@/lib/firebase';
import { tokenService } from './tokenService';
import { 
  AuthContextType, 
  AuthState, 
  UserDocument, 
  CalendarCredentials ,
  ApiResponse,
  AuthResponse
} from '@/lib/types';

interface AuthUserType extends User {
  accessToken?: string;
}

interface CalendarAuthState {
  connected: boolean;
  syncStatus: 'never' | 'in_progress' | 'completed' | 'failed';
  lastSyncTime: string | null;
}

// Extended context type to include calendar state
interface ExtendedAuthContextType extends AuthContextType {
  calendarState: CalendarAuthState;
  connectCalendar: () => Promise<void>;
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
    lastSyncTime: null
  });

  const router = useRouter();

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get fresh token
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

          const userData = await response.json();
          
          // Update calendar state if credentials exist
          if (userData.user?.calendar?.credentials) {
            const calendarTokens = await tokenService.getCalendarTokens(firebaseUser.uid);
            setCalendarState({
              connected: !!calendarTokens,
              syncStatus: userData.user.calendar.syncStatus || 'never',
              lastSyncTime: userData.user.calendar.lastSyncTime
            });
          }

          setAuthState(prev => ({
            ...prev,
            user: userData.user
          }));
        } else {
          // Clear all session data
          sessionStorage.removeItem('authToken');
          await tokenService.clearTokens(authState.user?.googleId || '');
          setAuthState(prev => ({ ...prev, user: null }));
          setCalendarState({
            connected: false,
            syncStatus: 'never',
            lastSyncTime: null
          });
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

    return () => unsubscribe();
  }, []);

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

    // 1. Sign in with Google through Firebase
    const { user: firebaseUser, accessToken, hasCalendarAccess, scopes } = await signInWithGoogle();
    
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    // Store calendar credentials if access was granted
    if (hasCalendarAccess) {
      const calendarCreds: CalendarCredentials = {
        accessToken,
        refreshToken: firebaseUser.refreshToken,  // Changed from user to firebaseUser
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scopes: scopes  // Use the scopes from signInWithGoogle response
      };
      await tokenService.storeCalendarTokens(firebaseUser.uid, calendarCreds);
    }

    // Update calendar state
    setCalendarState(prev => ({
      ...prev,
      connected: hasCalendarAccess
    }));
  
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

  const connectCalendar = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      // Implement calendar connection logic
      // This would typically involve requesting calendar permissions
      // and storing the resulting tokens
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
      await tokenService.clearTokens(authState.user.googleId);
      setCalendarState({
        connected: false,
        syncStatus: 'never',
        lastSyncTime: null
      });
    } catch (error) {
      console.error('Calendar disconnect error:', error);
    }
  };

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