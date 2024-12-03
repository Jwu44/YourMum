'use client';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Add paths that don't require authentication
const publicPaths = ['/', '/home'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {  // Only run after initial auth check
      const isPublicPath = publicPaths.includes(pathname);
      const isAuthRedirect = window.location.href.includes('accounts.google.com');
      
      // Don't redirect if we're in the middle of auth flow
      if (!user && !isPublicPath && !isAuthRedirect) {
        router.push('/home');
      }
    }
  }, [user, loading, pathname, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}