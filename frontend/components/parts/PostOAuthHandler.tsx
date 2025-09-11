'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingPage } from './LoadingPage'
import { calendarApi } from '@/lib/api/calendar'
import { autogenerateTodaySchedule } from '@/lib/ScheduleHelper'
import { formatDateToString } from '@/lib/helper'
import { CalendarCredentials } from '@/lib/types'

interface PostOAuthHandlerProps {
  credential: any // Google OAuth credential
  onComplete: () => void
  onError: (error: string) => void
}

type OrchestratorStage = 'connecting' | 'generating' | 'complete' | 'error'

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
 * 1. Calendar connection
 * 2. Schedule autogeneration (if needed)
 * 3. Navigation to dashboard
 * 
 * Shows single unified LoadingPage throughout entire process
 */
export const PostOAuthHandler: React.FC<PostOAuthHandlerProps> = ({
  credential,
  onComplete,
  onError
}) => {
  const router = useRouter()
  const [stage, setStage] = useState<OrchestratorStage>('connecting')
  const [progress, setProgress] = useState(0)

  /**
   * Get OAuth scopes from access token
   */
  const getScopes = useCallback(async (accessToken: string): Promise<string[]> => {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`)
      if (!response.ok) return []
      
      const data = await response.json()
      return data.scope ? data.scope.split(' ') : []
    } catch (error) {
      console.error('Error getting token scopes:', error)
      return []
    }
  }, [])

  /**
   * Main orchestrator function - coordinates entire post-OAuth flow
   */
  const orchestratePostOAuthFlow = useCallback(async () => {
    try {
      console.log('🎬 Starting post-OAuth orchestration...')
      
      // Validate credential
      if (!credential || !credential.accessToken) {
        throw new Error('Invalid OAuth credential - no access token')
      }

      // Stage 1: Connect to Google Calendar
      console.log('📅 Stage 1: Connecting to Google Calendar...')
      setStage('connecting')
      setProgress(25)

      // Get scopes and verify calendar access
      const scopes = await getScopes(credential.accessToken)
      const hasCalendarAccess = scopes.some(scope => 
        scope.includes('calendar.readonly') || scope.includes('calendar.events.readonly')
      )

      if (!hasCalendarAccess) {
        throw new Error('Calendar access not granted')
      }

      // Create credentials and connect to calendar
      // Note: Firebase doesn't provide refresh tokens, so we only use access token here
      // For long-term access, users should use the direct OAuth flow via reconnectCalendar()
      const credentials: CalendarCredentials = {
        accessToken: credential.accessToken,
        expiresAt: Date.now() + 3600000, // 1 hour expiry as fallback
        scopes: scopes
      }

      await calendarApi.connectCalendar(credentials)
      console.log('✅ Calendar connected successfully')
      setProgress(60)

      // Stage 2: Generate schedule if needed
      console.log('📋 Stage 2: Checking if schedule generation is needed...')
      setStage('generating')
      setProgress(75)

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

      // Stage 3: Complete and navigate
      console.log('🎯 Stage 3: Completing post-OAuth flow...')
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
  }, [credential, getScopes, onComplete, onError, router])

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
      case 'connecting':
        return {
          reason: 'calendar',
          message: 'Connecting to Google Calendar and syncing your events...'
        }
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
          reason: 'calendar',
          message: 'Something went wrong during setup. Please try again.'
        }
      default:
        return {
          reason: 'calendar',
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
        progress: progress
      }}
    />
  )
}