'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleRedirectResult } from '@/lib/firebase';
import { isBrowser } from '@/lib/utils';
import type { RedirectResult } from '@/lib/types';

export default function AuthHandler(): JSX.Element {
  const router = useRouter();
  const redirectAttempted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent multiple redirect attempts
    if (redirectAttempted.current) return;
    redirectAttempted.current = true;

    const processRedirect = async () => {
      try {
        // Ensure we're in browser environment
        if (!isBrowser()) {
          throw new Error('Auth handler must run in browser environment');
        }

        console.log("Processing auth redirect...");
        console.log("URL parameters:", new URLSearchParams(window.location.search));

        const result = await handleRedirectResult();
        
        if (result) {
          // Type guard to ensure result matches RedirectResult interface
          const isValidResult = (result: unknown): result is RedirectResult => {
            return result !== null && 
                   typeof result === 'object' && 
                   'user' in result && 
                   'credentials' in result;
          };

          if (!isValidResult(result)) {
            throw new Error('Invalid redirect result format');
          }

          console.log("Auth successful:", {
            uid: result.user.uid,
            hasCredentials: !!result.credentials,
            hasCalendarAccess: result.hasCalendarAccess
          });

          // Store necessary auth data
          sessionStorage.setItem('auth_state', JSON.stringify({
            authenticated: true,
            timestamp: Date.now()
          }));

          // Redirect to appropriate page
          router.push('/work-times');
        } else {
          console.warn("No redirect result, returning to home");
          router.push('/home');
        }
      } catch (error) {
        console.error("Auth redirect error:", error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        
        // Add small delay before redirect to ensure error is logged
        setTimeout(() => {
          router.push('/home');
        }, 100);
      }
    };

    processRedirect();

    // Cleanup function
    return () => {
      redirectAttempted.current = false;
    };
  }, [router]);

  // Show error state if present
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">Authentication failed: {error}</div>
        <button 
          onClick={() => router.push('/home')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin mb-4" />
      <div className="text-gray-600">Completing authentication...</div>
    </div>
  );
}