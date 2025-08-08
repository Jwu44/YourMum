/**
 * @file slack.ts
 * @description API client for Slack integration endpoints
 * Handles OAuth flow, webhook management, and integration status
 */

import { auth } from '@/auth/firebase'

// Types
export interface SlackIntegrationStatus {
  connected: boolean
  workspace_name?: string
  workspace_id?: string
  connected_at?: string
}

export interface SlackOAuthResponse {
  oauth_url: string
  state: string
}

export interface SlackCallbackResponse {
  success: boolean
  message: string
  workspace_name?: string
  workspace_id?: string
  connected_at?: string
}

export interface SlackDisconnectResponse {
  success: boolean
  message: string
}

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

/**
 * Get the current user's Firebase ID token for API authentication
 */
const getAuthToken = async (): Promise<string> => {
  // In development mode with bypass enabled, return a mock token
  if (IS_DEVELOPMENT && BYPASS_AUTH) {
    return 'mock-token-for-development'
  }

  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('User not authenticated')
  }
  return await currentUser.getIdToken()
}

/**
 * Create standard headers for API requests
 */
const getHeaders = async (): Promise<HeadersInit> => {
  const token = await getAuthToken()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

/**
 * Slack Integration API Client
 */
export const slackApi = {
  /**
   * Get current Slack integration status
   */
  async getStatus(): Promise<SlackIntegrationStatus> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/api/integrations/slack/status`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to get status: ${response.status}`)
    }

    return await response.json()
  },

  /**
   * Generate OAuth URL for Slack workspace connection
   */
  async getOAuthUrl(): Promise<SlackOAuthResponse> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/api/integrations/slack/auth/connect`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to get OAuth URL: ${response.status}`)
    }

    return await response.json()
  },

  /**
   * Disconnect Slack integration
   */
  async disconnect(): Promise<SlackDisconnectResponse> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}/api/integrations/slack/disconnect`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to disconnect: ${response.status}`)
    }

    return await response.json()
  },

  /**
   * Check if OAuth flow is completed by polling the status
   * This is used during the OAuth callback process
   */
  async checkOAuthCompletion(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      return status.connected
    } catch (error) {
      console.error('Error checking OAuth completion:', error)
      return false
    }
  }
}

export default slackApi