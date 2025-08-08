/**
 * @file SlackIntegrationCard.tsx
 * @description Slack integration card component with OAuth connection handling
 * Updated to use actual backend API endpoints from slack_routes.py
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Icons
import { Slack, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

// Hooks
import { useToast } from '@/hooks/use-toast'

// API and Types
import slackApi, { type SlackIntegrationStatus } from '@/lib/api/slack'

// Utils
import { cn } from '@/lib/utils'

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
          
          // If we haven't received a success message, assume user cancelled
          // But wait a bit longer to allow for the status refresh
          setTimeout(() => {
            // Only show cancelled message if still not connected
            checkSlackStatus().then(() => {
              if (!status.connected) {
                toast({
                  title: 'OAuth Cancelled',
                  description: 'OAuth window was closed. The integration was not completed.',
                  variant: 'destructive'
                })
              }
            }).catch(() => {
              toast({
                title: 'OAuth Cancelled',
                description: 'OAuth window was closed. The integration was not completed.',
                variant: 'destructive'
              })
            })
          }, 2000)
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
    return () => window.removeEventListener('focus', handleWindowFocus)
  }, [status.connected, isCheckingStatus, checkSlackStatus])

  return (
    <Card className="relative">
      {/* Connection Status Indicator */}
      <div className="absolute top-3 right-3">
        {isCheckingStatus
          ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )
          : status.connected
            ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
              )
            : (
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slack-green/10 rounded-lg">
            <Slack className="w-6 h-6 text-slack-green" style={{ color: '#4A154B' }} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Slack</CardTitle>
            <CardDescription className="text-sm">
              Connect your Slack workspace to automatically create tasks from @mentions
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Connection Status */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span
              className={cn(
                'font-medium',
                status.connected ? 'text-green-600' : 'text-muted-foreground'
              )}
            >
              {isCheckingStatus
                ? 'Checking...'
                : status.connected
                  ? 'Connected'
                  : 'Not connected'
              }
            </span>
          </div>

          {status.connected && (
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              {status.workspace_name && (
                <div>Workspace: {status.workspace_name}</div>
              )}
              {status.connected_at && (
                <div>Connected on {new Date(status.connected_at).toLocaleDateString()}</div>
              )}
              {status.workspace_id && (
                <div className="font-mono">ID: {status.workspace_id}</div>
              )}
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Features:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Auto-create tasks from @mentions</li>
            <li>• Real-time message monitoring</li>
            <li>• Direct links to original messages</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status.connected
            ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={checkSlackStatus}
                disabled={isCheckingStatus}
                className="px-3"
              >
                {isCheckingStatus
                  ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                    )
                  : (
                      'Refresh'
                    )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading
                  ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                    )
                  : (
                      'Disconnect'
                    )}
              </Button>
            </>
              )
            : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={isLoading || isCheckingStatus}
              className="flex-1"
            >
              {isLoading
                ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
                  )
                : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect
                </>
                  )}
            </Button>
              )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SlackIntegrationCard
