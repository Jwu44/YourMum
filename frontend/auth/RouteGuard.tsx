'use client';
import { useAuth } from '@/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';

// Add paths that don't require authentication
const publicPaths = ['/', '/home'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRedirect = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const url = window.location.href;
    return url.includes('__/auth/handler') || 
           url.includes('accounts.google.com') || 
           url.includes('code=') || 
           url.includes('state=') ||
           url.includes('oauth') ||
           url.includes('firebase') ||
           pathname.includes('/__/auth/iframe') ||
           pathname.includes('/__/auth/handler');
  }, []);
  
  useEffect(() => {
    if (!loading) {
      const isPublicPath = publicPaths.includes(pathname);
      const inAuthFlow = isAuthRedirect();
      
      // Check for calendar connection in progress
      const calendarConnectionInProgress = typeof window !== 'undefined' && 
        localStorage.getItem('calendarConnectionProgress');
      
      console.log("RouteGuard State:", {
        user: user ? `${user.displayName} (${user.email})` : null,
        loading,
        pathname,
        isPublicPath,
        inAuthFlow,
        calendarConnectionInProgress,
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'server'
      });
      
      // If authenticated user and calendar connection is in progress, redirect to /connecting
      if (user && calendarConnectionInProgress && pathname !== '/connecting') {
        console.log("Calendar connection in progress, redirecting to /connecting");
        router.push('/connecting');
        return;
      }
      
      // Don't redirect if in auth flow or if user is authenticated
      if (!user && !isPublicPath && !inAuthFlow) {
        console.log("Redirecting unauthenticated user to home");
        router.push('/');
      }
    }
  }, [user, loading, pathname, router, isAuthRedirect]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-yourdai-dark">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}