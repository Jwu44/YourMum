'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface LoadingManagerOptions {
  reason?: 'calendar' | 'schedule'
  minDisplayTime?: number
  redirectPath?: string
}

export interface LoadingManagerState {
  isLoading: boolean
  canNavigate: boolean
  timeRemaining: number
}

/**
 * Custom hook for managing loading states with minimum display time
 *
 * Provides centralized loading state management ensuring users see loading
 * animation for at least the specified minimum time (default 1.5s) and
 * handles navigation logic once content is ready.
 *
 * Following dev-guide.md principles: simple, centralized, error-handled
 */
export const useLoadingManager = (options: LoadingManagerOptions = {}): LoadingManagerState & {
  reason: 'calendar' | 'schedule'
  markContentReady: () => void
  progress: number
} => {
  const {
    reason = 'calendar',
    minDisplayTime = 1500, // 1.5 seconds as per task requirements
    redirectPath = '/dashboard'
  } = options

  const router = useRouter()
  const startTimeRef = useRef<number>(Date.now())
  const [state, setState] = useState<LoadingManagerState>({
    isLoading: true,
    canNavigate: false,
    timeRemaining: minDisplayTime
  })

  // Content ready detection state
  const [isContentReady, setIsContentReady] = useState(false)
  const contentReadyRef = useRef(false)

  /**
   * Mark content as ready for display
   * This should be called when dashboard/target content is fully loaded
   */
  const markContentReady = useCallback(() => {
    contentReadyRef.current = true
    setIsContentReady(true)
  }, [])

  /**
   * Check if minimum display time has elapsed
   */
  const hasMinTimeElapsed = useCallback((): boolean => {
    const elapsed = Date.now() - startTimeRef.current
    return elapsed >= minDisplayTime
  }, [minDisplayTime])

  /**
   * Navigate to target destination when both conditions are met:
   * 1. Minimum display time has elapsed
   * 2. Content is ready for display
   */
  const attemptNavigation = useCallback(() => {
    if (hasMinTimeElapsed() && contentReadyRef.current) {
      setState(prev => ({ ...prev, canNavigate: true, isLoading: false }))

      // Small delay to ensure state updates are processed
      setTimeout(() => {
        router.push(redirectPath)
      }, 100)
    }
  }, [hasMinTimeElapsed, redirectPath, router])

  /**
   * Force navigation after timeout (fallback safety mechanism)
   * Ensures users don't get stuck on loading page indefinitely
   */
  const forceNavigation = useCallback(() => {
    console.warn('Loading manager: Force navigation triggered after timeout')
    setState(prev => ({ ...prev, canNavigate: true, isLoading: false }))
    router.push(redirectPath)
  }, [redirectPath, router])

  // Effect to update time remaining and handle navigation
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, minDisplayTime - elapsed)

      setState(prev => ({
        ...prev,
        timeRemaining: remaining
      }))

      // Attempt navigation when minimum time is reached
      if (remaining === 0) {
        attemptNavigation()
      }
    }, 100) // Update every 100ms for smooth progress indication

    return () => clearInterval(interval)
  }, [minDisplayTime, attemptNavigation])

  // Effect to attempt navigation when content becomes ready
  useEffect(() => {
    if (isContentReady) {
      attemptNavigation()
    }
  }, [isContentReady, attemptNavigation])

  // Safety timeout - force navigation after 15 seconds maximum
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (state.isLoading) {
        forceNavigation()
      }
    }, 15000)

    return () => clearTimeout(timeout)
  }, [state.isLoading, forceNavigation])

  return {
    ...state,
    reason,
    markContentReady,
    // Utility functions for external use
    progress: Math.min(100, ((minDisplayTime - state.timeRemaining) / minDisplayTime) * 100)
  }
}

/**
 * Hook specifically for dashboard readiness detection
 * Monitors common dashboard loading states and automatically marks content as ready
 */
export const useDashboardReadiness = (): {
  isDashboardReady: boolean
  markScheduleLoaded: () => void
  markInitialDataReady: () => void
  isScheduleLoaded: boolean
  hasInitialData: boolean
} => {
  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false)
  const [hasInitialData, setHasInitialData] = useState(false)

  /**
   * Mark schedule as loaded (no skeleton state)
   */
  const markScheduleLoaded = useCallback(() => {
    setIsScheduleLoaded(true)
  }, [])

  /**
   * Mark initial data as available
   */
  const markInitialDataReady = useCallback(() => {
    setHasInitialData(true)
  }, [])

  // Dashboard is ready when both schedule is loaded and initial data is available
  const isDashboardReady = isScheduleLoaded && hasInitialData

  return {
    isDashboardReady,
    markScheduleLoaded,
    markInitialDataReady,
    isScheduleLoaded,
    hasInitialData
  }
}