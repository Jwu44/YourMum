'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingPage } from '@/components/parts/LoadingPage'
import { autogenerateTodaySchedule } from '@/lib/ScheduleHelper'
import { formatDateToString } from '@/lib/helper'

interface PostOAuthHandlerProps {
  credential: any // Google OAuth credential
  onComplete: () => void
  onError: (error: string) => void
}

type OrchestratorStage = 'generating' | 'complete' | 'error'

/**
 * Utility to detect if PostOAuthHandler should be active
 * Used by components to defer their logic while PostOAuthHandler is running
 */
export const isPostOAuthActive = (): boolean => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') return false

  // Check for various indicators that post-OAuth flow is active
  const hasOAuthRedirect = window.location.pathname === '/dashboard' &&
                          (window.location.search.includes('code=') ||
                           window.location.search.includes('state='))

  const hasSessionIndicator = sessionStorage.getItem('oauth-in-progress') === 'true'

  // CRITICAL: Check for fresh navigation to dashboard with authRedirectDestination
  // This catches the case where user just completed OAuth and was redirected to dashboard
  const justRedirectedFromAuth = localStorage.getItem('authRedirectDestination') === '/dashboard' &&
                                 !sessionStorage.getItem('dashboardFullyLoaded')

  return hasOAuthRedirect || hasSessionIndicator || justRedirectedFromAuth
}

/**
 * PostOAuthHandler - Single orchestrator for post-OAuth flow
 *
 * Eliminates race conditions by coordinating:
 * 1. Schedule autogeneration (if needed)
 * 2. Navigation to dashboard
 *
 * Shows single unified LoadingPage throughout entire process
 * Note: Calendar connection is handled separately via direct OAuth flow
 */
export const PostOAuthHandler: React.FC<PostOAuthHandlerProps> = ({
  credential,
  onComplete,
  onError
}) => {
  const router = useRouter()
  const [stage, setStage] = useState<OrchestratorStage>('generating')
  const [progress, setProgress] = useState(0)

  /**
   * Main orchestrator function - coordinates entire post-OAuth flow
   */
  const orchestratePostOAuthFlow = useCallback(async () => {
    try {
      console.log('🎬 Starting post-OAuth schedule orchestration...')

      // Calendar connection is handled separately via direct OAuth flow
      // This handler focuses only on schedule generation and navigation

      // Stage 1: Generate schedule if needed
      console.log('📋 Stage 1: Checking if schedule generation is needed...')
      setStage('generating')
      setProgress(25)

      const today = formatDateToString(new Date())
      console.log('Attempting schedule autogeneration for:', today)

      // Always attempt autogeneration - backend will handle checking if schedule exists
      const autogenResult = await autogenerateTodaySchedule(today)

      if (autogenResult.success) {
        console.log('✅ Schedule generation completed:', autogenResult)
      } else {
        console.warn('⚠️ Schedule generation had issues but continuing:', autogenResult.error)
        // Don't throw error - allow user to proceed to dashboard even if schedule generation fails
      }

      setProgress(100)

      // Stage 2: Complete and navigate
      console.log('🎯 Stage 2: Completing post-OAuth flow...')
      setStage('complete')

      // Small delay to show completion state
      await new Promise(resolve => setTimeout(resolve, 800))

      console.log('✅ Post-OAuth orchestration completed successfully')

      // Clean up auth indicators to prevent future false positives
      localStorage.removeItem('authRedirectDestination')
      sessionStorage.removeItem('oauth-in-progress')

      onComplete()

      // Navigate to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('❌ Post-OAuth orchestration failed:', error)
      setStage('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during setup'
      onError(errorMessage)
    }
  }, [credential, onComplete, onError, router])

  // Start orchestration on mount
  useEffect(() => {
    // Mark OAuth as in progress in session storage
    sessionStorage.setItem('oauth-in-progress', 'true')

    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      orchestratePostOAuthFlow()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      // Clean up session storage when component unmounts
      sessionStorage.removeItem('oauth-in-progress')
    }
  }, [orchestratePostOAuthFlow])

  // Determine loading message based on stage
  const getLoadingMessage = (): { reason: 'calendar' | 'schedule', message: string } => {
    switch (stage) {
      case 'generating':
        return {
          reason: 'schedule',
          message: 'Setting up your schedule for today...'
        }
      case 'complete':
        return {
          reason: 'schedule',
          message: 'All set! Taking you to your dashboard...'
        }
      case 'error':
        return {
          reason: 'schedule',
          message: 'Something went wrong during setup. Please try again.'
        }
      default:
        return {
          reason: 'schedule',
          message: 'Setting up your account...'
        }
    }
  }

  const loadingConfig = getLoadingMessage()

  return (
    <LoadingPage
      reason={loadingConfig.reason}
      message={loadingConfig.message}
      loadingManager={{
        isLoading: stage !== 'complete' && stage !== 'error',
        canNavigate: stage === 'complete',
        timeRemaining: 0,
        reason: loadingConfig.reason,
        markContentReady: () => {}, // Not used in orchestrator mode
        progress
      }}
    />
  )
}
