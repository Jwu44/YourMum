'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Cross } from 'lucide-react'

/**
 * Slack OAuth Success Page
 * Displays success confirmation after successful Slack integration
 * Communicates with parent window and auto-closes popup
 */
export default function SlackOAuthSuccessPage () {
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(1000)

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cross className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Connection Failed
          </h1>
          <p className="text-gray-600 mb-4">
            The OAuth flow was not completed successfully. Please try again.
          </p>
          <p className="text-xs text-gray-400">
            You may now close this tab.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-lavender-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        {/* Success Title */}
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Slack connected successfully!
        </h1>

        {/* Success Message */}
        <p className="text-gray-600 mb-4">
          {workspaceName} has been integrated with YourMum.
        </p>

        {countdown > 0 && (
          <p className="text-xs text-gray-400">
            You may  close this tab or it will auto close in {countdown} seconds.
          </p>
        )}
      </div>
    </div>
  )
}
