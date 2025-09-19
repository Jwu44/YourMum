/**
 * Google OAuth Service for Single Authentication + Calendar Flow
 *
 * This service handles the complete OAuth flow to get both user authentication
 * and calendar access in a single step, providing proper refresh tokens.
 */

import { nanoid } from 'nanoid';

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  scope: string;
  token_type: 'Bearer';
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export class GoogleOAuthService {
  private config: GoogleOAuthConfig;

  constructor() {
    // Check if we're in browser environment
    const isClient = typeof window !== 'undefined';

    this.config = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || '',
      redirectUri: isClient ? `${window.location.origin}/auth/callback` : '/auth/callback',
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ]
    };

    if (!this.config.clientId && isClient) {
      throw new Error('Google Client ID is required');
    }
  }

  /**
   * Generate Google OAuth authorization URL with combined scopes
   * @returns Object containing authorization URL and state for CSRF protection
   */
  generateAuthUrl(): { url: string; state: string } {
    const state = nanoid(32); // Generate secure random state for CSRF protection

    // Store state in localStorage for verification after redirect
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_timestamp', Date.now().toString());

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline', // Critical for refresh tokens
      prompt: 'consent', // Force consent screen to get refresh tokens
      include_granted_scopes: 'true',
      state: state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return { url: authUrl, state };
  }

  /**
   * Validate state parameter to prevent CSRF attacks
   * @param returnedState State parameter from OAuth callback
   * @returns boolean indicating if state is valid
   */
  validateState(returnedState: string): boolean {
    const storedState = localStorage.getItem('oauth_state');
    const timestamp = localStorage.getItem('oauth_timestamp');

    // Clean up stored state
    localStorage.removeItem('oauth_state');
    localStorage.removeItem('oauth_timestamp');

    if (!storedState || !timestamp) {
      console.error('OAuth state validation failed: Missing stored state');
      return false;
    }

    // Check if state is too old (older than 10 minutes)
    const stateAge = Date.now() - parseInt(timestamp, 10);
    if (stateAge > 10 * 60 * 1000) {
      console.error('OAuth state validation failed: State expired');
      return false;
    }

    if (storedState !== returnedState) {
      console.error('OAuth state validation failed: State mismatch');
      return false;
    }

    return true;
  }


  /**
   * Validate and decode ID token (basic validation)
   * @param idToken JWT ID token from Google
   * @returns Decoded token payload
   */
  validateIdToken(idToken: string): any {
    try {
      // Basic JWT decode (payload only) - in production, verify signature
      const payload = JSON.parse(atob(idToken.split('.')[1]));

      // Basic validation
      if (!payload.iss?.includes('accounts.google.com')) {
        throw new Error('Invalid token issuer');
      }

      if (payload.aud !== this.config.clientId) {
        throw new Error('Invalid token audience');
      }

      if (payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      return payload;

    } catch (error) {
      console.error('ID token validation failed:', error);
      throw new Error('Invalid ID token');
    }
  }

  /**
   * Initiate the OAuth flow by redirecting to Google
   */
  initiateOAuthFlow(): void {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('OAuth flow can only be initiated in browser environment');
      }

      const { url, state } = this.generateAuthUrl();

      console.log('🚀 Initiating single OAuth flow for auth + calendar access');
      console.log('Generated state:', state);

      // Redirect to Google OAuth
      window.location.href = url;

    } catch (error) {
      console.error('Failed to initiate OAuth flow:', error);
      throw error;
    }
  }

}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService();