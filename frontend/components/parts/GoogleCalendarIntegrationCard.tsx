/**
 * @file GoogleCalendarIntegrationCard.tsx
 * @description Standardized Google Calendar integration card using IntegrationCardShell
 * Simplified per TASK-14: single CTA, hover shadow, tiny connected tick; retains
 * connect/disconnect logic and status refresh.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'

// Standardized shell UI
import IntegrationCardShell from '@/components/parts/IntegrationCardShell'
import { IntegrationLogo } from '@/components/ui/integration-logo'

// Icons
import { Calendar } from 'lucide-react'

// Auth & API
import { useAuth } from '@/auth/AuthContext'
import { calendarApi } from '@/lib/api/calendar'
import { useToast } from '@/hooks/use-toast'

// Types
import { type UserDocument } from '@/lib/types'

/**
 * Google Calendar integration card component
 * Shows connection status and provides reconnection functionality
 */
const GoogleCalendarIntegrationCard: React.FC = () => {
  const { currentUser, signIn } = useAuth()
  const { toast } = useToast()

  // State management
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean
    syncStatus: string
    lastSyncTime: string | null
    hasCredentials: boolean
  } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  /**
    * Test if calendar API is actually working
    */
  const testCalendarHealth = async (): Promise<boolean> => {
    if (!currentUser) return false

    try {
      const testDate = new Date().toISOString().split('T')[0] // Today's date
      const result = await calendarApi.fetchEvents(testDate)
      return result.success // Return true only if calendar API call succeeded
    } catch (error) {
      console.log('Calendar health check failed:', error)
      return false
    }
  }

  /**
    * Fetch current calendar connection status with health validation
    */
  const fetchConnectionStatus = async () => {
    if (!currentUser) return

    try {
      setIsCheckingStatus(true)
      const status = await calendarApi.getCalendarStatus(currentUser.uid)

      // Enhanced status validation - test actual API functionality
      let actuallyWorking = false
      if (status.connected) {
        actuallyWorking = await testCalendarHealth()
      }

      // Map backend response to expected format with health check
      setConnectionStatus({
        connected: status.connected && actuallyWorking,
        syncStatus: actuallyWorking ? status.syncStatus || 'completed' : 'failed',
        lastSyncTime: status.lastSyncTime || null,
        hasCredentials: Boolean((status as any).hasCredentials || status.credentials)
      })
    } catch (error) {
      console.error('Failed to fetch calendar status:', error)
      toast({
        title: 'Error',
        description: 'Failed to check calendar connection status',
        variant: 'destructive'
      })
    } finally {
      setIsCheckingStatus(false)
    }
  }

  /**
   * Handle calendar connection (OAuth via single OAuth flow)
   */
  const handleConnect = useCallback(async () => {
    try {
      setIsConnecting(true)

      // Use the unified OAuth flow that handles both auth and calendar
      await signIn('/integrations')

      toast({
        title: 'Starting Calendar Connection',
        description: 'Redirecting to Google for calendar access...',
        variant: 'default'
      })
    } catch (error) {
      console.error('Calendar connection failed:', error)
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to start calendar connection',
        variant: 'destructive'
      })
      setIsConnecting(false)
    }
  }, [signIn, toast])

  /**
   * Handle calendar disconnection
   */
  const handleDisconnect = useCallback(async () => {
    try {
      if (!currentUser) return
      setIsDisconnecting(true)
      await calendarApi.disconnectCalendar(currentUser.uid)
      toast({
        title: 'Success!',
        description: 'Google Calendar has been disconnected',
        variant: 'success'
      })
      await fetchConnectionStatus()
    } catch (error) {
      console.error('Calendar disconnection failed:', error)
      toast({
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Failed to disconnect calendar',
        variant: 'destructive'
      })
    } finally {
      setIsDisconnecting(false)
    }
  }, [currentUser])

  // Fetch status on component mount and when user changes
  useEffect(() => {
    if (currentUser) {
      fetchConnectionStatus()
    }
  }, [currentUser])

  // Determine connection and CTA mapping
  const isConnected = Boolean(connectionStatus?.connected && connectionStatus?.hasCredentials)
  const isBusy = isCheckingStatus || isConnecting || isDisconnecting
  const ctaVariant = isConnected ? 'destructive' : 'default'
  const ctaLabel = isCheckingStatus
    ? 'Checking...'
    : isConnecting
      ? 'Connecting...'
      : isDisconnecting
        ? 'Disconnecting...'
        : isConnected
          ? 'Disconnect'
          : 'Connect'

  return (
    <IntegrationCardShell
      icon={<IntegrationLogo src="/images/integrations/google_calendar_logo.png" alt="Google Calendar" />}
      name="Google Calendar"
      description="Sync your calendar events as tasks"
      connected={isConnected}
      isBusy={isBusy}
      ctaLabel={ctaLabel}
      ctaVariant={ctaVariant as any}
      onCtaClick={isConnected ? handleDisconnect : handleConnect}
    />
  )
}

export default GoogleCalendarIntegrationCard
