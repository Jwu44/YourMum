'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

/**
 * Slack OAuth Success Page
 * Displays success confirmation after successful Slack integration
 * Communicates with parent window and auto-closes popup
 */
export default function SlackOAuthSuccessPage() {
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(5)

  // Extract connection data from URL parameters
  const success = searchParams?.get('success') === 'true'
  const workspaceName = searchParams?.get('workspace_name') || 'Unknown Workspace'
  const workspaceId = searchParams?.get('workspace_id')
  const connectedAt = searchParams?.get('connected_at')
  const message = searchParams?.get('message') || 'Slack integration connected successfully'

  useEffect(() => {
    // Send success message to parent window (SlackIntegrationCard)
    if (success && typeof window !== 'undefined') {
      const messageData = {
        type: 'slack_oauth_success',
        data: {
          success: true,
          workspace_name: workspaceName,
          workspace_id: workspaceId,
          connected_at: connectedAt,
          message
        }
      }

      // Send to parent window (main application)
      if (window.opener) {
        window.opener.postMessage(messageData, window.location.origin)
      }

      // Also try sending to parent frame (in case opened in iframe)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(messageData, window.location.origin)
      }
    }

    // Auto-close countdown
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer)
          // Auto-close the popup window
          if (typeof window !== 'undefined' && window.close) {
            window.close()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(countdownTimer)
    }
  }, [success, workspaceName, workspaceId, connectedAt, message])

  if (!success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Connection Failed
          </h1>
          <p className="text-gray-600 mb-6">
            The OAuth flow was not completed successfully. Please try again.
          </p>
          <p className="text-sm text-gray-500 italic">
            You may now close this tab
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        {/* Success Title */}
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Connected Successfully!
        </h1>

        {/* Success Message */}
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {/* Connection Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div className="text-sm text-gray-600 space-y-2">
            <div>
              <span className="font-medium">Workspace:</span> {workspaceName}
            </div>
            {workspaceId && (
              <div>
                <span className="font-medium">ID:</span> {workspaceId}
              </div>
            )}
            {connectedAt && (
              <div>
                <span className="font-medium">Connected:</span>{' '}
                {new Date(connectedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Auto-close notice */}
        <p className="text-sm text-gray-500 italic">
          You may now close this tab
        </p>

        {countdown > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            This window will close automatically in {countdown} seconds
          </p>
        )}
      </div>
    </div>
  )
}