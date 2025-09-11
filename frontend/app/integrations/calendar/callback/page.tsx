'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/auth/AuthContext';
import { LoadingPage } from '@/components/parts/LoadingPage';

/**
 * Google OAuth callback page for calendar integration
 * 
 * This page handles the redirect from Google OAuth and exchanges
 * the authorization code for access and refresh tokens via our backend.
 */
export default function CalendarOAuthCallback() {
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Get authorization code from URL parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from Google');
        }

        console.log('📅 Processing Google OAuth callback for calendar');
        
        // Exchange authorization code for tokens via AuthContext
        await handleOAuthCallback(code);
        
        setStatus('success');
        
      } catch (err) {
        console.error('Calendar OAuth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setStatus('error');
      }
    };

    processOAuthCallback();
  }, [searchParams, handleOAuthCallback]);

  const getLoadingMessage = () => {
    switch (status) {
      case 'processing':
        return 'Connecting your Google Calendar...';
      case 'success':
        return 'Calendar connected successfully! Redirecting...';
      case 'error':
        return `Failed to connect calendar: ${error}`;
      default:
        return 'Processing calendar connection...';
    }
  };

  const getLoadingReason = (): 'calendar' | 'schedule' => {
    return 'calendar';
  };

  return (
    <LoadingPage
      reason={getLoadingReason()}
      message={getLoadingMessage()}
      loadingManager={{
        isLoading: status === 'processing',
        canNavigate: status === 'success',
        timeRemaining: 0,
        reason: getLoadingReason(),
        markContentReady: () => {}, // Not used here
        progress: status === 'success' ? 100 : (status === 'error' ? 0 : 50)
      }}
    />
  );
}