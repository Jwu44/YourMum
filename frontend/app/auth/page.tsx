'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { handleRedirectResult } from '@/lib/firebase';
import { isBrowser } from '@/lib/utils';

export default function AuthHandler() {
  const router = useRouter();
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (!isBrowser() || redirectAttempted.current) return;
    redirectAttempted.current = true;

    const processAuth = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          // Get return URL from state if present
          let returnTo = '/work-times'; // default
          try {
            const state = JSON.parse(
              decodeURIComponent(
                new URLSearchParams(window.location.search).get('state') || '{}'
              )
            );
            if (state.returnTo) {
              returnTo = state.returnTo;
            }
          } catch (e) {
            console.error('Error parsing state:', e);
          }

          router.push(returnTo);
        } else {
          router.push('/home');
        }
      } catch (error) {
        console.error('Auth handling error:', error);
        router.push('/home');
      }
    };

    processAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin" />
    </div>
  );
}