'use client';
import { useAuth } from '@/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';

// Add paths that don't require authentication
const publicPaths = ['/', '/home', '/privacy', '/terms'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = publicPaths.includes(pathname);

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
      const inAuthFlow = isAuthRedirect();
      
      // Check for calendar connection in progress with stale flag cleanup
      const calendarConnectionRaw = typeof window !== 'undefined' && 
        localStorage.getItem('calendarConnectionProgress');
      
      let calendarConnectionInProgress = false;
      
      // Defensive cleanup: Remove stale calendar connection flags
      if (calendarConnectionRaw) {
        // Check if there's a timestamp for the connection progress
        const connectionTimestamp = typeof window !== 'undefined' && 
          localStorage.getItem('calendarConnectionTimestamp');
        
        if (connectionTimestamp) {
          const timeDiff = Date.now() - parseInt(connectionTimestamp, 10);
          // If flag is older than 30 seconds, consider it stale and clean up
          if (timeDiff > 30000) {
            console.log("Cleaning up stale calendar connection flag");
            localStorage.removeItem('calendarConnectionProgress');
            localStorage.removeItem('calendarConnectionTimestamp');
            calendarConnectionInProgress = false;
          } else {
            calendarConnectionInProgress = true;
          }
        } else {
          // No timestamp means it's an old flag, clean it up
          console.log("Cleaning up calendar connection flag without timestamp");
          localStorage.removeItem('calendarConnectionProgress');
          calendarConnectionInProgress = false;
        }
      }
      
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
  if (loading && !isPublicPath) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}