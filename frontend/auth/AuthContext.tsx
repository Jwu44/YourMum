'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, provider } from './firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { AuthContextType, CalendarCredentials } from '@/lib/types';
import { detectBrowserTimezone, shouldUpdateUserTimezone, isValidTimezone } from '@/lib/utils/timezone';
import { PostOAuthHandler } from '@/components/parts/PostOAuthHandler';
import { apiClient } from '@/lib/api/client';
import { calendarApi } from '@/lib/api/calendar';
import { categorizeAuthError, storeCalendarError } from '@/lib/utils/auth-errors';

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
  const [calendarConnectionStage, setCalendarConnectionStage] = useState<'connecting' | 'verifying' | 'complete' | null>(null);
  const [showPostOAuthHandler, setShowPostOAuthHandler] = useState(false);
  const [postOAuthCredential, setPostOAuthCredential] = useState<any>(null);

  // Initialize API client on mount
  useEffect(() => {
    console.log('🚀 AuthProvider: Initializing centralized API client');
    apiClient.initialize();
  }, []);

  /**
   * Handle errors using centralized error categorization
   */
  const handleError = (error: any, context: string): void => {
    const categorizedError = categorizeAuthError(error, context)
    
    if (categorizedError.shouldShowToUser) {
      setError(categorizedError.message)
    }
    
    if (categorizedError.shouldStoreForRouting) {
      storeCalendarError(categorizedError.message)
    }
  };

  /**
   * Process calendar access using PostOAuthHandler orchestrator
   * @param credential Google Auth credential
   */
  const processCalendarAccess = async (credential: any): Promise<void> => {
    try {
      console.log("🎬 Starting simplified processCalendarAccess with PostOAuthHandler...");
      
      // Get scopes and check for calendar access
      const scopes = await getScopes(credential.accessToken);
      const hasCalendarAccess = scopes.some(scope => 
        scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
      );
      
      console.log("Has calendar access:", hasCalendarAccess);
      
      // Store user with correct calendar access flag (simplified - no calendar connection here)
      if (auth.currentUser) {
        console.log("Storing user with calendar access flag:", hasCalendarAccess);
        await storeUserInBackend(auth.currentUser, hasCalendarAccess);
      }
      
      if (hasCalendarAccess) {
        console.log("✅ Calendar access granted - triggering PostOAuthHandler");
        
        // Set credential for PostOAuthHandler and show it
        setPostOAuthCredential(credential);
        setShowPostOAuthHandler(true);
        
        // Keep OAuth in progress - PostOAuthHandler will handle completion
        setCalendarConnectionStage('connecting');
        
      } else {
        console.log("❌ No calendar access granted - RouteGuard will handle navigation");
        setIsOAuthInProgress(false);
        setCalendarConnectionStage(null);
      }
      
    } catch (error) {
      console.error("Error in simplified processCalendarAccess:", error);
      setIsOAuthInProgress(false);
      setCalendarConnectionStage(null);
      
      // Use centralized error handling
      handleError(error, 'processCalendarAccess');
    }
  };

  /**
   * Store user information in the backend using centralized API client
   * @param user Firebase user object
   * @param hasCalendarAccess Optional flag indicating if user has granted calendar access
   */
  const storeUserInBackend = async (user: User, hasCalendarAccess: boolean = false): Promise<void> => {
    try {
      console.log("Storing user in backend with calendar access:", hasCalendarAccess);
      
      // Use API client instead of direct fetch - it handles token refresh automatically
      const response = await apiClient.post('/api/auth/user', {
        googleId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        hasCalendarAccess: hasCalendarAccess
      });

      if (response.ok) {
        console.log("✅ User stored in backend successfully with calendar access:", hasCalendarAccess);
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to store user in backend:", response.status, errorText);
      }
    } catch (error) {
      console.error("❌ Error storing user in backend:", error);
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
      
      // IMPORTANT: Do not store user during OAuth flow to prevent race condition
      // The OAuth flow (processCalendarAccess) will handle user storage with correct calendar access
      if (user && !isOAuthInProgress) {
        console.log("Storing user from auth state change (non-OAuth)");
        await storeUserInBackend(user, false); // Explicitly set no calendar access for non-OAuth
        console.log("Authentication completed successfully");
      } else if (user && isOAuthInProgress) {
        console.log("Skipping user storage during OAuth flow to prevent race condition");
      }
    });
  
    // Cleanup subscription
    return () => unsubscribe();
  }, []); // Empty dependency array - setup once on mount

  // Enhanced timezone sync when user becomes available and not in OAuth flow
  useEffect(() => {
    const syncTimezoneIfNeeded = async () => {
      if (!user || isOAuthInProgress) return
      
      try {
        const browserTz = detectBrowserTimezone()
        const tzKey = 'tzSyncedFor'
        const cached = localStorage.getItem(tzKey)
        
        // Skip if already synced for this browser timezone
        if (cached === browserTz) return

        // Fetch current user to read stored timezone using API client
        const res = await apiClient.get('/api/auth/user')
        if (!res.ok) return
        
        const data = await res.json()
        const serverTz: string | undefined = data?.user?.timezone
        
        // Check if update is needed using robust detection
        if (!shouldUpdateUserTimezone(serverTz)) {
          localStorage.setItem(tzKey, browserTz)
          return
        }

        console.log(`🌍 Timezone sync needed: ${serverTz || 'none'} → ${browserTz}`)

        // Update timezone via API client - handles token refresh automatically
        const updateRes = await apiClient.put('/api/user/timezone', { timezone: browserTz })
        
        if (updateRes.ok) {
          const result = await updateRes.json()
          console.log(`✅ Timezone updated successfully to: ${result.timezone}`)
          localStorage.setItem(tzKey, browserTz)
        } else {
          console.warn('⚠️ Failed to update timezone:', await updateRes.text())
        }
      } catch (error) {
        console.warn('Timezone sync failed (non-critical):', error)
      }
    }
    
    syncTimezoneIfNeeded()
  }, [user, isOAuthInProgress])

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
          
          // Set OAuth in progress to prevent race condition with auth state change
          setIsOAuthInProgress(true);
        
          // Get credentials from result
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (!credential || !credential.accessToken) {
            console.error("Missing credential or access token");
            setIsOAuthInProgress(false); // Reset OAuth state
            console.log("Missing credential - RouteGuard will handle navigation");
            return;
          }
          
          await processCalendarAccess(credential);
        } else {
          console.log("No redirect result found");
        }
      } catch (error) {
        console.error("Redirect sign-in error:", error);
        setIsOAuthInProgress(false); // Reset OAuth state on error
        setError('Failed to sign in with Google');
        console.log("Redirect sign-in error - RouteGuard will handle navigation");
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
        console.log("User already authenticated - RouteGuard will handle navigation");
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
      
      // Set OAuth in progress BEFORE popup to prevent race condition
      setIsOAuthInProgress(true);
      
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
          // No calendar access - let RouteGuard handle navigation
          console.log("No calendar access from popup - RouteGuard will handle navigation");
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
      setIsOAuthInProgress(false); // Reset OAuth state on error
      setError('Failed to sign in with Google');
      console.log("Sign in error - RouteGuard will handle navigation");
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
      
      // Use popup for calendar reconnection (no redirect needed)
      const result = await signInWithPopup(auth, provider);
      console.log("Calendar reconnection successful");
      
      // Get credentials from result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential || !credential.accessToken) {
        throw new Error('No calendar access token received');
      }
      
      // Get scopes and connect to calendar
      const scopes = await getScopes(credential.accessToken);
      const hasCalendarAccess = scopes.some(scope => 
        scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
      );
      
      if (!hasCalendarAccess) {
        throw new Error('Calendar access not granted');
      }
      
      // Create credentials and connect
      const credentials: CalendarCredentials = {
        accessToken: credential.accessToken,
        expiresAt: Date.now() + 3600000, // 1 hour expiry as a fallback
        scopes: scopes
      };
      
      await calendarApi.connectCalendar(credentials);
      console.log("Calendar reconnected successfully");
      
    } catch (error) {
      console.error('Calendar reconnection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reconnect calendar';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Refresh calendar credentials using Firebase OAuth without redirecting to backend
   * This replaces the backend OAuth flow for token refresh scenarios
   */
  const refreshCalendarCredentials = async () => {
    try {
      setError(null);
      console.log("Starting calendar credential refresh process");
      
      if (!user) {
        throw new Error('User must be authenticated to refresh calendar credentials');
      }
      
      // Configure provider for calendar access with offline access
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
      provider.setCustomParameters({
        prompt: 'consent',      // Force consent to get fresh tokens
        access_type: 'offline', // Request refresh tokens
        include_granted_scopes: 'true'
      });
      
      console.log("Refreshing Firebase credentials with popup");
      
      // Use popup to refresh credentials
      const result = await signInWithPopup(auth, provider);
      console.log("Firebase credential refresh successful");
      
      // Extract Google OAuth credentials from Firebase result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential || !credential.accessToken) {
        throw new Error('No access token received from Firebase refresh');
      }
      
      // Get scopes and validate calendar access
      const scopes = await getScopes(credential.accessToken);
      const hasCalendarAccess = scopes.some(scope => 
        scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
      );
      
      if (!hasCalendarAccess) {
        throw new Error('Calendar access not granted in refreshed credentials');
      }
      
      // Create credentials object with both access and refresh tokens
      const credentials: CalendarCredentials = {
        accessToken: credential.accessToken,
        refreshToken: (credential as any).refreshToken, // Firebase may not expose this in types
        expiresAt: Date.now() + 3600000, // 1 hour expiry as fallback
        scopes: scopes
      };
      
      // Update backend with refreshed credentials
      await calendarApi.connectCalendar(credentials);
      console.log("Calendar credentials refreshed and updated in backend");
      
    } catch (error) {
      console.error('Calendar credential refresh error:', error);
      
      // Use centralized error handling
      handleError(error, 'refreshCalendarCredentials');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh calendar credentials';
      throw new Error(errorMessage);
    }
  };

  /**
   * Handle successful completion of PostOAuthHandler
   */
  const handlePostOAuthComplete = () => {
    console.log("✅ PostOAuthHandler completed successfully");
    
    // Reset all OAuth-related state
    setIsOAuthInProgress(false);
    setCalendarConnectionStage(null);
    setShowPostOAuthHandler(false);
    setPostOAuthCredential(null);
    setError(null);
    
    console.log("🎯 OAuth flow completed - user should be navigated to dashboard");
  };

  /**
   * Handle PostOAuthHandler error
   */
  const handlePostOAuthError = (errorMessage: string) => {
    console.error("❌ PostOAuthHandler failed:", errorMessage);
    
    // Reset OAuth state and set error
    setIsOAuthInProgress(false);
    setCalendarConnectionStage(null);
    setShowPostOAuthHandler(false);
    setPostOAuthCredential(null);
    setError(errorMessage);
    
    // Store error for routing logic using centralized utility
    storeCalendarError(errorMessage);
  };

  const value: AuthContextType = {
    user,                // Add this to satisfy AuthState
    currentUser: user,   // This is your renamed property
    loading,
    error,
    calendarConnectionStage,
    signIn,
    signOut,
    reconnectCalendar,
    refreshCalendarCredentials,
  };

  // Show PostOAuthHandler overlay if in post-OAuth flow
  if (showPostOAuthHandler && postOAuthCredential) {
    return (
      <AuthContext.Provider value={value}>
        <PostOAuthHandler
          credential={postOAuthCredential}
          onComplete={handlePostOAuthComplete}
          onError={handlePostOAuthError}
        />
      </AuthContext.Provider>
    );
  }

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