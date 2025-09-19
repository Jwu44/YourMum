'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

/**
 * Connecting page shown during calendar connection process
 * Redirects to /loading page with calendar reason for better UX
 * Also handles error cases with toast notifications and redirects to integrations
 */
export default function ConnectingPage () {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const handleCalendarConnection = async () => {
      try {
        // Check for error information first
        const errorInfo = localStorage.getItem('calendarConnectionError')
        if (errorInfo) {
          try {
            const errorData = JSON.parse(errorInfo)
            console.log('Calendar connection error detected:', errorData)

            // Clear the error flag
            localStorage.removeItem('calendarConnectionError')

            // Show error toast
            toast({
              title: 'Calendar Connection Failed',
              description: errorData.error || 'Failed to connect to Google Calendar',
              variant: 'destructive'
            })

            // Redirect based on error action
            if (errorData.action === 'redirect_to_integrations') {
              console.log('Redirecting to integrations page due to calendar connection error')
              setTimeout(() => {
                router.push('/dashboard/integrations')
              }, 2000) // Give time for user to see the toast
            } else {
              console.log('Redirecting to dashboard due to general error')
              setTimeout(() => {
                router.push('/dashboard')
              }, 2000)
            }
            return
          } catch (parseError) {
            console.error('Error parsing calendar connection error:', parseError)
            // Fall through to normal flow
          }
        }

        // For successful connections, immediately redirect to dashboard
        console.log('Redirecting to dashboard for calendar connection')
        router.push('/dashboard')
      } catch (error) {
        console.error('Error in connecting page:', error)
        // Fallback to dashboard on error
        localStorage.removeItem('calendarConnectionProgress')
        localStorage.removeItem('finalRedirectDestination')
        localStorage.removeItem('calendarConnectionError')

        // Show error toast
        toast({
          title: 'Connection Error',
          description: 'An unexpected error occurred during setup',
          variant: 'destructive'
        })

        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    }

    handleCalendarConnection()
  }, [router, toast])

  // Show minimal loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Redirecting...</p>
      </div>
    </div>
  )
}
