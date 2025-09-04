/**
 * @file SlackIntegrationCard.tsx
 * @description Slack integration card using standardized IntegrationCardShell
 * UI simplified per TASK-14 while preserving existing OAuth/connect logic
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'

// Standardized shell UI
import IntegrationCardShell from '@/components/parts/IntegrationCardShell'
import { IntegrationLogo } from '@/components/ui/integration-logo'

// Icons
import { Slack } from 'lucide-react'

// Hooks
import { useToast } from '@/hooks/use-toast'

// API and Types
import slackApi, { type SlackIntegrationStatus } from '@/lib/api/slack'

// Utils

/**
 * Slack Integration Card Component
 */
const SlackIntegrationCard: React.FC = () => {
  const [status, setStatus] = useState<SlackIntegrationStatus>({ connected: false })
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const { toast } = useToast()

  /**
   * Check current Slack integration status
   */
  const checkSlackStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true)
      const data = await slackApi.getStatus()
      setStatus(data)
    } catch (error) {
      console.error('Error checking Slack status:', error)
      setStatus({ connected: false })

      // Only show error toast if it's not an authentication issue
      if (error instanceof Error && !error.message.includes('not authenticated')) {
        toast({
          title: 'Error',
          description: 'Failed to check Slack connection status',
          variant: 'destructive'
        })
      }
    } finally {
      setIsCheckingStatus(false)
    }
  }, [toast])

  /**
   * Check OAuth completion status
   */
  const checkOAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const isCompleted = await slackApi.checkOAuthCompletion()

      if (isCompleted) {
        // OAuth is complete and user is connected
        toast({
          title: 'Success',
          description: 'Slack integration connected successfully!'
        })
        return true
      }

      return false
    } catch (error) {
      console.error('Error checking OAuth status:', error)
      return false
    }
  }, [toast])

  /**
   * Handle Slack connection with OAuth flow
   */
  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get OAuth URL from backend
      const oauthData = await slackApi.getOAuthUrl()

      // Open OAuth URL in new tab
      const oauthWindow = window.open(
        oauthData.oauth_url,
        'slack-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      if (!oauthWindow) {
        throw new Error('Failed to open OAuth window. Please allow popups for this site.')
      }

      toast({
        title: 'Slack OAuth',
        description: 'Complete the authorization in the opened tab. The page will automatically refresh when done.'
      })

      // Listen for OAuth completion message from popup
      const messageHandler = (event: MessageEvent) => {
        const allowedOrigin = window.location.origin
        if (event.origin !== allowedOrigin) return

        if (event.data.type === 'slack_oauth_success') {
          // OAuth completed successfully
          window.removeEventListener('message', messageHandler)

          toast({
            title: 'Success',
            description: `Slack integration connected successfully to ${event.data.data.workspace_name}!`
          })

          // Refresh status to update UI
          setTimeout(() => {
            checkSlackStatus()
          }, 1000)
        } else if (event.data.type === 'slack_oauth_error') {
          // OAuth failed
          window.removeEventListener('message', messageHandler)

          toast({
            title: 'OAuth Failed',
            description: event.data.error || 'OAuth process failed. Please try again.',
            variant: 'destructive'
          })
        }
      }

      window.addEventListener('message', messageHandler)

      // Check if window is closed manually and add fallback refresh
      const checkWindowClosed = setInterval(() => {
        if (oauthWindow.closed) {
          clearInterval(checkWindowClosed)
          window.removeEventListener('message', messageHandler)

          // Add fallback: refresh status after window closes
          // This ensures UI updates even if postMessage fails
          setTimeout(async () => {
            try {
              await checkSlackStatus()
            } catch (error) {
              console.error('Error refreshing status after OAuth window closed:', error)
            }
          }, 1000)
        }
      }, 1000)
    } catch (error) {
      console.error('Error connecting to Slack:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect to Slack. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, checkOAuthStatus, checkSlackStatus])

  /**
   * Handle Slack disconnection
   */
  const handleDisconnect = useCallback(async () => {
    try {
      setIsLoading(true)

      const data = await slackApi.disconnect()

      if (!data.success) {
        throw new Error(data.message || 'Disconnection failed')
      }

      // Update local status
      setStatus({ connected: false })

      toast({
        title: 'Success',
        description: data.message || 'Slack integration disconnected successfully'
      })
    } catch (error) {
      console.error('Error disconnecting Slack:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disconnect Slack. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  /**
   * Check status on component mount and when window regains focus
   */
  useEffect(() => {
    checkSlackStatus()
  }, [checkSlackStatus])

  useEffect(() => {
    const handleWindowFocus = () => {
      if (!status.connected && !isCheckingStatus) {
        checkSlackStatus()
      }
    }
    window.addEventListener('focus', handleWindowFocus)
    return () => { window.removeEventListener('focus', handleWindowFocus) }
  }, [status.connected, isCheckingStatus, checkSlackStatus])

  // Map current state to shell props
  const isConnected = Boolean(status.connected)
  const isBusy = isLoading || isCheckingStatus
  const ctaVariant = isConnected ? 'destructive' : 'default'
  const ctaLabel = isCheckingStatus
    ? 'Checking...'
    : isLoading
      ? (isConnected ? 'Disconnecting...' : 'Connecting...')
      : (isConnected ? 'Disconnect' : 'Connect')

  return (
    <IntegrationCardShell
      icon={<IntegrationLogo src="/images/integrations/slack_logo.webp" alt="Slack" />}
      name="Slack"
      description="To automatically create tasks from @mentions, please ensure the bot is added to the channels you want to use."
      connected={isConnected}
      isBusy={isBusy}
      ctaLabel={ctaLabel}
      ctaVariant={ctaVariant as any}
      onCtaClick={isConnected ? handleDisconnect : handleConnect}
    />
  )
}

export default SlackIntegrationCard
