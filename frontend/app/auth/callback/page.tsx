/**
 * OAuth Callback Page
 *
 * Handles the Google OAuth redirect with authorization code and completes
 * the authentication + calendar access flow.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { processOAuthCallback } from './oauth-utils';
import { LoadingPage } from '@/components/parts/LoadingPage';
import { autogenerateTodaySchedule } from '@/lib/ScheduleHelper';
import { formatDateToString } from '@/lib/helper';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('processing');
        setProgress(10);

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

        setProgress(30);

        // Process OAuth callback with Firebase UID fix
        const result = await processOAuthCallback(code, state);

        setProgress(60);

        console.log('✅ OAuth callback completed successfully');
        console.log('🎯 User authenticated with Firebase UID:', result.user.uid);

        // Generate today's schedule automatically
        console.log('📋 Starting schedule autogeneration...');
        setProgress(70);

        const today = formatDateToString(new Date());
        const autogenResult = await autogenerateTodaySchedule(today);

        if (autogenResult.success) {
          console.log('✅ Schedule generation completed:', autogenResult);
        } else {
          console.warn('⚠️ Schedule generation had issues but continuing:', autogenResult.error);
          // Don't throw error - allow user to proceed to dashboard even if schedule generation fails
        }

        // Set success status
        setStatus('success');
        setProgress(100);

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

    handleCallback();
  }, [searchParams, router]);

  // Determine loading message and reason based on status and progress
  const getLoadingConfig = () => {
    switch (status) {
      case 'processing':
        if (progress >= 60) {
          return {
            reason: 'schedule' as const,
            message: 'Setting up your schedule for today...'
          }
        } else {
          return {
            reason: 'calendar' as const,
            message: 'Completing sign in and setting up calendar access...'
          }
        }
      case 'success':
        return {
          reason: 'schedule' as const,
          message: 'All set! Taking you to your dashboard...'
        }
      case 'error':
        return {
          reason: 'calendar' as const,
          message: error || 'Sign in failed. Redirecting to home page...'
        }
      default:
        return {
          reason: 'calendar' as const,
          message: 'Setting up your account...'
        }
    }
  }

  const loadingConfig = getLoadingConfig()

  return (
    <LoadingPage
      reason={loadingConfig.reason}
      message={loadingConfig.message}
      loadingManager={{
        isLoading: status === 'processing',
        canNavigate: status === 'success',
        timeRemaining: 0,
        reason: loadingConfig.reason,
        markContentReady: () => {}, // Not used in OAuth flow
        progress
      }}
    />
  );
}