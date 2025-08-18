/**
 * Timezone Detection Hook
 * 
 * Automatically detects user's timezone and updates their profile if needed.
 * Runs once per session to ensure accurate timezone handling.
 */

import { useEffect, useState } from 'react'
import { userApi } from '@/lib/api/users'
import { detectBrowserTimezone, shouldUpdateUserTimezone } from '@/lib/utils/timezone'

interface TimezoneDetectionState {
  isDetecting: boolean
  detectedTimezone: string | null
  updateAttempted: boolean
  error: string | null
}

/**
 * Hook to automatically detect and update user timezone
 * @param userTimezone - Current user's stored timezone
 * @returns Detection state and utilities
 */
export function useTimezoneDetection(userTimezone?: string | null) {
  const [state, setState] = useState<TimezoneDetectionState>({
    isDetecting: false,
    detectedTimezone: null,
    updateAttempted: false,
    error: null
  })

  useEffect(() => {
    let isMounted = true

    async function detectAndUpdateTimezone() {
      // Only run once per session and only if update is needed
      if (state.updateAttempted || !shouldUpdateUserTimezone(userTimezone)) {
        return
      }

      setState(prev => ({ ...prev, isDetecting: true, error: null }))

      try {
        const detected = detectBrowserTimezone()
        
        if (!isMounted) return

        setState(prev => ({ ...prev, detectedTimezone: detected }))

        // Only update if it's different and valid
        if (detected !== userTimezone) {
          console.log(`🌍 Timezone detected: ${detected} (current: ${userTimezone || 'none'})`)
          
          const result = await userApi.updateTimezone(detected)
          
          if (!isMounted) return

          if (result.success) {
            console.log(`✅ User timezone updated to: ${result.timezone}`)
          } else {
            console.warn(`⚠️ Failed to update timezone: ${result.error}`)
            setState(prev => ({ ...prev, error: result.error || 'Update failed' }))
          }
        }
      } catch (error) {
        if (!isMounted) return
        
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Timezone detection error:', errorMsg)
        setState(prev => ({ ...prev, error: errorMsg }))
      } finally {
        if (isMounted) {
          setState(prev => ({ 
            ...prev, 
            isDetecting: false, 
            updateAttempted: true 
          }))
        }
      }
    }

    detectAndUpdateTimezone()

    return () => {
      isMounted = false
    }
  }, [userTimezone, state.updateAttempted])

  return {
    ...state,
    /**
     * Manually trigger timezone detection (for testing or retry)
     */
    retryDetection: () => {
      setState(prev => ({ ...prev, updateAttempted: false }))
    }
  }
}