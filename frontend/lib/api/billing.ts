/**
 * Billing API client for Stripe integration.
 * Handles checkout sessions, customer portal, and billing status.
 */

import { apiClient } from './client'
import type {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  CustomerPortalResponse,
  BillingStatus
} from '@/lib/types'

/**
 * Billing API helper functions using centralized API client
 */
export const billingApi = {

  /**
   * Create a Stripe customer portal session
   */
  async createCustomerPortalSession(
    options: { returnUrl?: string } = {}
  ): Promise<CustomerPortalResponse> {
    try {
      const response = await apiClient.post('/api/billing/portal', options)

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP error! status: ${response.status}`
        }
      }

      return {
        success: true,
        portalUrl: result.portalUrl
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create portal session'
      }
    }
  },

  /**
   * Get current user's billing and credit status
   */
  async getBillingStatus(): Promise<{
    success: boolean
    status?: BillingStatus
    error?: string
  }> {
    try {
      const response = await apiClient.get('/api/billing/status')

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP error! status: ${response.status}`
        }
      }

      return {
        success: true,
        status: result.status
      }
    } catch (error) {
      console.error('Error getting billing status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get billing status'
      }
    }
  }
}

/**
 * Helper function to initiate Pro plan checkout via direct Stripe payment link
 */
export const initiateProCheckout = () => {
  // Direct redirect to Stripe payment link for monthly Pro plan
  window.location.href = 'https://buy.stripe.com/6oU3cvb8IcF2bxCcd22cg00'
  return {
    success: true,
    redirected: true
  }
}

/**
 * Helper function to open customer portal
 */
export const openCustomerPortal = async (returnUrl?: string) => {
  const result = await billingApi.createCustomerPortalSession({
    returnUrl: returnUrl || `${window.location.origin}/dashboard`
  })

  if (result.success && result.portalUrl) {
    window.location.href = result.portalUrl
  }

  return result
}

// Legacy exports for backwards compatibility
export const createCustomerPortalSession = billingApi.createCustomerPortalSession.bind(billingApi)
export const getBillingStatus = billingApi.getBillingStatus.bind(billingApi)