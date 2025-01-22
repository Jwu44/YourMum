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
        // Get state from URL, handling both Firebase and Google auth formats
        const returnedState = urlParams.get('state') || 
                            urlParams.get('firebase_auth_state');
        
        if (!returnedState) {
          console.error('No state parameter in URL');
          return false;
        }
  
        const storedStateJson = sessionStorage.getItem(this.STATE_KEY);
        if (!storedStateJson) {
          console.warn('No stored state found - might be initial auth request');
          return true; // Allow initial auth requests
        }
  
        const storedState = JSON.parse(storedStateJson);
        
        // Validate timestamp
        if (Date.now() - storedState.timestamp > this.STATE_EXPIRY) {
          console.error('State has expired');
          return false;
        }
  
        // Extract state from Firebase format if necessary
        const extractedState = this.extractStateFromFirebaseState(returnedState);
        
        console.log('State validation:', {
          stored: storedState.value,
          returned: extractedState,
          origin: storedState.origin,
          currentOrigin: window.location.origin,
          timestamp: new Date(storedState.timestamp).toISOString()
        });
  
        return storedState.value === extractedState;
      } catch (error) {
        console.error('Error validating auth state:', error);
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
        // If it's a Firebase-modified state, it will be a longer string
        if (firebaseState.length > 36) {
          const uuidMatch = firebaseState.match(
            /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
          );
          return uuidMatch ? uuidMatch[1] : firebaseState;
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