/**
 * @file slack.ts
 * @description API client for Slack integration endpoints using centralized API client
 * Handles OAuth flow, webhook management, and integration status
 */

import { apiClient } from './client'

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

// Slack integration uses centralized API client for authentication

/**
 * Slack Integration API Client
 */
export const slackApi = {
  /**
   * Get current Slack integration status
   */
  async getStatus (): Promise<SlackIntegrationStatus> {
    const response = await apiClient.get('/api/integrations/slack/status')

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to get status: ${response.status}`)
    }

    return await response.json()
  },

  /**
   * Generate OAuth URL for Slack workspace connection
   */
  async getOAuthUrl (): Promise<SlackOAuthResponse> {
    const response = await apiClient.get('/api/integrations/slack/auth/connect')

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to get OAuth URL: ${response.status}`)
    }

    return await response.json()
  },

  /**
   * Disconnect Slack integration
   */
  async disconnect (): Promise<SlackDisconnectResponse> {
    const response = await apiClient.delete('/api/integrations/slack/disconnect')

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
  async checkOAuthCompletion (): Promise<boolean> {
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
