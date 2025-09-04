'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * DEPRECATED Loading route - now handled by PostOAuthHandler
 * 
 * This route is no longer used for post-OAuth flows. 
 * PostOAuthHandler now handles all calendar connection and schedule generation.
 * 
 * This route now simply redirects to dashboard for any legacy references.
 */
export default function LoadingRoute(): React.ReactElement {
  const router = useRouter()

  useEffect(() => {
    console.log('⚠️ Loading route accessed - this is deprecated. Redirecting to dashboard...')
    
    // Clean up any legacy session storage
    sessionStorage.removeItem('pendingNavigationDate')
    sessionStorage.removeItem('pendingNavigationIndex')
    sessionStorage.removeItem('calendarJustConnected')
    
    // Redirect to dashboard immediately
    router.replace('/dashboard')
  }, [router])

  // Show a simple loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}