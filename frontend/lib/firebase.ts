import { initializeApp, FirebaseError } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  OAuthCredential,
  // connectAuthEmulator,
  signOut as firebaseSignOut 
} from 'firebase/auth';

import { RedirectResult } from './types';

// Your existing Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Connect to emulator if in development
// if (process.env.NODE_ENV === 'development') {
//   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   console.log('Connected to Auth Emulator');
// }

/**
 * Check if code is running in browser environment
 * @returns boolean indicating if window is defined
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Manages authentication state and URL handling across the auth flow
 * Provides methods for state generation, storage, and validation
 */
class AuthStateManager {
  private static readonly STATE_KEY = 'firebase_auth_state';
  private static readonly RETURN_URL_KEY = 'firebase_auth_return_url';
  private static readonly STATE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Generates and stores a new auth state token
   * @returns string UUID for state verification
   */
  static generateState(): string {
    const state = crypto.randomUUID();
    if (isBrowser()) {
      const stateData = {
        value: state,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STATE_KEY, JSON.stringify(stateData));
    }
    return state;
  }

  /**
   * Retrieves stored state if valid and not expired
   * @returns string | null Stored state or null if invalid/expired
   */
  static getStoredState(): string | null {
    try {
      if (!isBrowser()) return null;
      
      const storedData = localStorage.getItem(this.STATE_KEY);
      if (!storedData) return null;

      const { value, timestamp } = JSON.parse(storedData);
      
      // Check if state has expired
      if (Date.now() - timestamp > this.STATE_TIMEOUT) {
        this.clearState();
        return null;
      }

      return value;
    } catch (error) {
      console.error('Error retrieving stored state:', error);
      this.clearState();
      return null;
    }
  }

  /**
   * Clears all auth-related storage
   */
  static clearState(): void {
    if (isBrowser()) {
      localStorage.removeItem(this.STATE_KEY);
      localStorage.removeItem(this.RETURN_URL_KEY);
    }
  }

  /**
   * Stores return URL for post-auth redirect
   * @param url - URL to redirect to after auth
   */
  static storeReturnUrl(url: string): void {
    if (isBrowser()) {
      localStorage.setItem(this.RETURN_URL_KEY, url);
    }
  }

  /**
   * Retrieves stored return URL
   * @returns string | null Stored URL or null
   */
  static getReturnUrl(): string | null {
    return isBrowser() ? localStorage.getItem(this.RETURN_URL_KEY) : null;
  }

  /**
   * Validates the authentication state from URL parameters
   * Handles both Firebase and Google auth state formats
   * @param urlParams - URL search parameters
   * @returns boolean indicating if state is valid
   */
  static validateState(urlParams: URLSearchParams): boolean {
    try {
      // Get state from URL, handling both Firebase and Google auth formats
      const returnedState = urlParams.get('state') || 
                          urlParams.get('firebase_auth_state');
      
      const storedState = this.getStoredState();
      
      console.log('Auth State Validation:', {
        returnedState,
        storedState,
        urlParams: Object.fromEntries(urlParams.entries())
      });

      // If no stored state, might be initial auth request
      if (!storedState) return true;

      // If we have stored state, must match returned state
      return storedState === returnedState;
    } catch (error) {
      console.error('Error validating auth state:', error);
      return false;
    }
  }
}

/**
 * Get redirect URL based on environment and context
 * Handles development, preview, and production environments
 * @returns string URL for auth redirect
 * @throws Error if Firebase auth domain is not configured
 */
const getRedirectUrl = (): string => {
  try {
    if (!isBrowser()) {
      return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
    }

    const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (!firebaseAuthDomain) {
      throw new Error('Firebase auth domain not configured');
    }

    // Store current URL as return destination
    const currentUrl = window.location.origin;
    AuthStateManager.storeReturnUrl(currentUrl);

    // For preview deployments, ensure domain is authorized
    if (currentUrl.includes('vercel.app')) {
      console.log('Vercel preview deployment detected:', {
        currentUrl,
        firebaseAuthDomain,
        nodeEnv: process.env.NODE_ENV
      });
    }

    return `https://${firebaseAuthDomain}`;
  } catch (error) {
    console.error('Error determining redirect URL:', error);
    throw error;
  }
};

// Configure Google Auth Provider with Calendar scopes
const googleProvider = new GoogleAuthProvider();

// Add required Google Calendar scopes
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

/**
 * Enhanced sign-in with Google
 * Handles state management and includes comprehensive error handling
 * @returns Promise<boolean> indicating success
 * @throws Error if sign-in fails
 */
export const signInWithGoogle = async () => {
  try {
    console.log("Starting sign-in process...");
    
    if (!isBrowser()) {
      throw new Error('Sign in can only be initiated in browser environment');
    }

    // Clear any existing auth state and sign out
    AuthStateManager.clearState();
    await firebaseSignOut(auth).catch(() => {});

    const state = AuthStateManager.generateState();
    
    // Update the provider config with enhanced security parameters
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline',
      redirect_uri: `${getRedirectUrl()}/__/auth/handler`,
      state,
      include_granted_scopes: 'true'
    });

    console.log('Auth Configuration:', {
      redirectUri: `${getRedirectUrl()}/__/auth/handler`,
      state,
      timestamp: new Date().toISOString()
    });

    await signInWithRedirect(auth, googleProvider);
    return true;
  } catch (error) {
    AuthStateManager.clearState(); // Clean up on error
    if (error instanceof FirebaseError) {
      console.error('Google sign-in error:', error);
      throw error;
    }
    console.error('Unexpected error during sign-in:', error);
    throw new Error('Failed to sign in with Google');
  }
};

/**
 * Handle redirect result with enhanced error handling and state validation
 * @returns Promise<RedirectResult | null> Auth result or null if no redirect
 * @throws Error if redirect handling fails or state is invalid
 */
export const handleRedirectResult = async (): Promise<RedirectResult | null> => {
  try {
    console.log("Getting redirect result...");
    console.log("Current URL:", window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // Validate state before proceeding
    if (!AuthStateManager.validateState(urlParams)) {
      console.error('Invalid authentication state');
      AuthStateManager.clearState();
      throw new Error('Invalid authentication state');
    }

    const result = await getRedirectResult(auth);
    console.log("Redirect result:", result ? "exists" : "null");
    
    if (!result) {
      console.log("No redirect result - user hasn't completed sign-in");
      return null;
    }

    // Get Google OAuth access token from the credential
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential) {
      throw new Error('No credential received from Google');
    }

    const accessToken = credential.accessToken;
    
    if (!accessToken) {
      throw new Error('No access token received from Google');
    }

    // Get and validate scopes granted by the user
    const grantedScopes = ((credential as OAuthCredential & { scope?: string })?.scope) || '';
    const scopesArray = grantedScopes.split(' ').filter(Boolean);
    
    // Validate required scopes
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
    ];
    
    const hasRequiredScopes = requiredScopes.every(scope => 
      scopesArray.includes(scope)
    );

    if (!hasRequiredScopes) {
      console.warn('Missing required calendar scopes:', {
        required: requiredScopes,
        granted: scopesArray
      });
    }

    // Get return URL before clearing state
    const returnUrl = AuthStateManager.getReturnUrl();
    
    // Clear auth state after successful authentication
    AuthStateManager.clearState();

    console.log("Auth successful:", {
      uid: result.user.uid,
      email: result.user.email,
      hasToken: Boolean(accessToken),
      scopes: scopesArray,
      hasRequiredScopes
    });

    // Handle redirect to return URL if available
    if (returnUrl) {
      window.location.href = `${returnUrl}/work-times`;
    }

    // Return the authentication result with necessary information
    return { 
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        getIdToken: (forceRefresh: boolean) => result.user.getIdToken(forceRefresh)
      },
      credentials: {
        accessToken,
        expiresAt: Date.now() + 3600 * 1000, // Token expires in 1 hour
        scopes: scopesArray
      },
      hasCalendarAccess: hasRequiredScopes,
      scopes: scopesArray
    };

  } catch (error) {
    AuthStateManager.clearState(); // Clean up on error
    console.error('Redirect result error:', {
      code: error instanceof FirebaseError ? error.code : 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    throw error instanceof Error ? error : new Error('Failed to handle redirect result');
  }
};

/**
 * Enhanced sign out function with better error handling
 * Clears all auth state and session data
 * @throws Error if sign out fails
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    AuthStateManager.clearState();
  } catch (error) {
    console.error('Sign out error:', {
      code: error instanceof FirebaseError ? error.code : 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to sign out. Please try again.');
  }
};

// Export auth and app instances for use in other parts of the application
export { auth, app };