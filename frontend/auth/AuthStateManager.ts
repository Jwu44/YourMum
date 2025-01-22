import { isBrowser } from './firebase';

/**
 * Manages authentication state during OAuth flows
 * Handles state validation and storage for secure redirects
 */
class AuthStateManager {
    private static readonly STATE_KEY = 'firebase_auth_state';
    private static readonly RETURN_URL_KEY = 'auth_return_url';
    private static readonly STATE_EXPIRY = 30 * 60 * 1000; // 30 minutes
  
    /**
     * Generates and stores a secure state parameter
     * @returns string Generated state value
     */
    static generateState(): string {
      if (!isBrowser()) return '';
  
      const state = crypto.randomUUID();
      const stateData = {
        value: state,
        timestamp: Date.now(),
        origin: window.location.origin
      };
  
      try {
        sessionStorage.setItem(this.STATE_KEY, JSON.stringify(stateData));
        return state;
      } catch (error) {
        console.error('Error storing auth state:', error);
        return state;
      }
    }

  /**
   * Validates the authentication state from URL parameters
   * @param urlParams - URL search parameters
   * @returns boolean indicating if state is valid
   */
  static validateState(urlParams: URLSearchParams): boolean {
    try {
      // Log all URL parameters for debugging
      console.log('URL Parameters:', Object.fromEntries(urlParams.entries()));
      
      // Get state from URL, checking multiple possible parameter names
      const returnedState = urlParams.get('state') || 
                          urlParams.get('firebase_auth_state') ||
                          urlParams.get('authuser'); // Sometimes Firebase uses this
      
      console.log('Returned state:', returnedState);

      if (!returnedState) {
        // Check if we're on the initial auth page
        const currentUrl = window.location.href;
        if (currentUrl.includes('/__/auth/handler')) {
          console.log('On auth handler page, allowing initial request');
          return true;
        }
        console.error('No state parameter in URL');
        return false;
      }

      const storedStateJson = sessionStorage.getItem(this.STATE_KEY);
      console.log('Stored state:', storedStateJson);

      if (!storedStateJson) {
        // If we're in the Firebase auth handler, this might be expected
        if (window.location.pathname.includes('/__/auth/handler')) {
          console.log('No stored state found but on auth handler - allowing');
          return true;
        }
        console.error('No stored state found');
        return false;
      }

      const storedState = JSON.parse(storedStateJson);
      
      // Validate timestamp
      const now = Date.now();
      const elapsed = now - storedState.timestamp;
      console.log('State timing:', {
        stored: new Date(storedState.timestamp).toISOString(),
        now: new Date(now).toISOString(),
        elapsed,
        maxAge: this.STATE_EXPIRY
      });

      if (elapsed > this.STATE_EXPIRY) {
        console.error('State has expired');
        return false;
      }

      // Extract state from Firebase format if necessary
      const extractedState = this.extractStateFromFirebaseState(returnedState);
      
      console.log('State comparison:', {
        stored: storedState.value,
        returned: extractedState,
        origin: storedState.origin,
        currentOrigin: window.location.origin,
        match: storedState.value === extractedState
      });

      return storedState.value === extractedState;
    } catch (error) {
      console.error('Error validating state:', error);
      return false;
    }
  }

  /**
   * Extracts original state value from Firebase's modified state
   * @param firebaseState - State parameter from redirect
   * @returns string Original state value
   */
  private static extractStateFromFirebaseState(firebaseState: string): string {
    try {
      console.log('Extracting state from:', firebaseState);
      
      // If it's a Firebase-modified state, it will be a longer string
      if (firebaseState.length > 36) {
        // Try multiple regex patterns as Firebase might modify the state format
        const patterns = [
          /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
          /state=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
        ];

        for (const pattern of patterns) {
          const match = firebaseState.match(pattern);
          if (match) {
            console.log('Found state match:', match[1]);
            return match[1];
          }
        }
      }
      return firebaseState;
    } catch (error) {
      console.error('Error extracting state:', error);
      return firebaseState;
    }
  }
  
    /**
     * Stores return URL for post-auth redirect
     * @param url - URL to redirect to after auth
     */
    static storeReturnUrl(url: string): void {
      if (isBrowser()) {
        sessionStorage.setItem(this.RETURN_URL_KEY, url);
      }
    }
  
    /**
     * Retrieves stored return URL
     * @returns string | null Stored URL or null
     */
    static getReturnUrl(): string | null {
      return isBrowser() ? sessionStorage.getItem(this.RETURN_URL_KEY) : null;
    }
  
    /**
     * Clears all stored auth state
     */
    static clearState(): void {
      if (isBrowser()) {
        sessionStorage.removeItem(this.STATE_KEY);
        sessionStorage.removeItem(this.RETURN_URL_KEY);
      }
    }
  }
  
  export default AuthStateManager;