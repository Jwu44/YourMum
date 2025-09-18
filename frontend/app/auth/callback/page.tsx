/**
 * OAuth Callback Page
 *
 * Handles the Google OAuth redirect with authorization code and completes
 * the authentication + calendar access flow.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { googleOAuthService } from '@/lib/services/google-oauth';
import { auth } from '@/auth/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { apiClient } from '@/lib/api/client';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        setStatus('processing');

        // Extract parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle OAuth error
        if (error) {
          const errorDescription = searchParams.get('error_description') || error;
          throw new Error(`OAuth error: ${errorDescription}`);
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        console.log('🔄 Processing OAuth callback with code and state');

        // Exchange authorization code for tokens
        const tokens = await googleOAuthService.handleOAuthCallback(code, state);

        console.log('✅ Received OAuth tokens:', {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          hasIdToken: !!tokens.id_token,
          scopes: tokens.scope,
        });

        // Validate ID token
        const idTokenPayload = googleOAuthService.validateIdToken(tokens.id_token);
        console.log('✅ ID token validated for user:', idTokenPayload.email);

        // Create Firebase credential from Google ID token
        const credential = GoogleAuthProvider.credential(tokens.id_token);

        // Sign in to Firebase with Google credential
        console.log('🔄 Signing in to Firebase with Google credential...');
        const firebaseResult = await signInWithCredential(auth, credential);
        const user = firebaseResult.user;

        console.log('✅ Firebase authentication successful:', user.email);

        // Ensure Firebase auth is ready for API calls
        console.log('🔄 Verifying auth readiness...');
        await user.getIdToken(true);
        console.log('✅ Auth state confirmed ready');

        // User data is already stored by the backend OAuth endpoint
        console.log('✅ User already stored by backend OAuth flow with calendar access');

        // Set success status
        setStatus('success');

        // Redirect to dashboard after short delay
        setTimeout(() => {
          const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard';
          localStorage.removeItem('authRedirectDestination');
          router.push(redirectTo);
        }, 1500);

      } catch (error) {
        console.error('❌ OAuth callback processing failed:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setStatus('error');

        // Redirect to home page after error delay
        setTimeout(() => {
          router.push('/?error=oauth_failed');
        }, 5000);
      }
    };

    processCallback();
  }, [searchParams, router]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Completing Sign In
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Setting up your account and calendar access...
            </p>
            <div className="space-y-2 text-sm text-left text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Validating Google authentication
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Connecting to Firebase
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                Setting up calendar access
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Successfully Signed In!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your account and calendar have been connected. Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Sign In Failed
            </h1>
            <p className="text-red-600 dark:text-red-400 mb-4 text-sm">
              {error}
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Redirecting to home page...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}