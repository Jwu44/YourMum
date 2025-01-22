'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function AuthHandler() {
  const router = useRouter();
  const { loading, error } = useAuth();

  useEffect(() => {
    // handleRedirectResult is now handled in AuthContext
    // This component just needs to show loading/error states

    if (error) {
      console.error('Auth handler error:', error);
      router.push('/home?error=' + encodeURIComponent(error));
    }
  }, [error, router]);

  if (loading) {
    return (
      <div className="auth-loading">
        <p>Completing sign in...</p>
        {/* Add your loading spinner component */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-error">
        <p>Failed to complete sign in</p>
        <button onClick={() => router.push('/home')}>
          Return Home
        </button>
      </div>
    );
  }

  return null;
}