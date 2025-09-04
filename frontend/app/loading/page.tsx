'use client'

import React, { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoadingPage } from '@/components/parts/LoadingPage'
import { useLoadingManager } from '@/hooks/useLoadingManager'

/**
 * Loading page route - shown during long operations
 * Replaces /connecting page with Lottie animation and better UX
 *
 * Triggered by:
 * - Google Calendar connection (?reason=calendar)
 * - Auto-generating daily schedule (?reason=schedule)
 */
export default function LoadingRoute (): React.ReactElement {
  const searchParams = useSearchParams()
  const reason = (searchParams.get('reason') as 'calendar' | 'schedule') ?? 'calendar'
  const fromCalendar = searchParams.get('from') === 'calendar'

  // Initialize loading manager with reason-based configuration
  const loadingManager = useLoadingManager({
    reason,
    minDisplayTime: 1500, // 1.5 seconds minimum display
    redirectPath: '/dashboard'
  })

  // Handle actual content generation/loading based on reason
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let hasStarted = false

    const startGeneration = () => {
      if (hasStarted) return
      hasStarted = true

      if (reason === 'calendar') {
        // For calendar connections, simulate the connection process
        console.log('Starting calendar connection simulation...')
        timeoutId = setTimeout(() => {
          console.log('Calendar connection simulation complete, marking content ready')
          loadingManager.markContentReady()
        }, 2000) // 2 seconds to simulate calendar connection
      } else if (reason === 'schedule') {
        console.log('Setting up schedule generation timeout...')
        // For schedule generation, perform actual autogeneration
        const performScheduleGeneration = async (): Promise<void> => {
          try {
            console.log('Starting schedule autogeneration process...')
            const { autogenerateTodaySchedule } = await import('@/lib/ScheduleHelper')
            
            // Check if this is for a specific date from navigation
            const pendingDate = sessionStorage.getItem('pendingNavigationDate')
            const targetDate = pendingDate ?? new Date().toISOString().split('T')[0]
            console.log('Performing schedule autogeneration for date:', targetDate)
            console.log('Calling autogenerateTodaySchedule with targetDate:', targetDate)
            
            const result = await autogenerateTodaySchedule(targetDate)
            console.log('autogenerateTodaySchedule result:', result)
            
            if (result.success) {
              console.log('Schedule generation successful, marking content ready')
              
              // Don't clean up session storage here - let dashboard handle navigation
              // The dashboard will read pendingNavigationDate/Index and navigate to correct day
              console.log('Keeping session storage for dashboard navigation')
              loadingManager.markContentReady()
            } else {
              console.error('Schedule generation failed:', result.error)
              // Still mark as ready to prevent infinite loading
              setTimeout(() => { loadingManager.markContentReady() }, 1000)
            }
          } catch (error) {
            console.error('Error during schedule generation:', error)
            console.error('Stack trace:', error)
            // Still mark as ready to prevent infinite loading
            setTimeout(() => { loadingManager.markContentReady() }, 1000)
          }
        }

        // Add a small delay to show the animation before starting generation
        timeoutId = setTimeout(() => {
          console.log('Schedule generation timeout triggered')
          performScheduleGeneration()
        }, 800)
      }
    }

    // Start generation immediately
    startGeneration()

    return () => {
      if (timeoutId) {
        console.log('Cleaning up timeout...')
        clearTimeout(timeoutId)
      }
    }
  }, [reason]) // Remove loadingManager from dependencies to prevent re-renders

  return (
    <LoadingPage
      reason={reason}
      loadingManager={loadingManager}
      message={fromCalendar ? 'Calendar connected successfully! Generating your schedule...' : undefined}
    />
  )
}