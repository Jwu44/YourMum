/**
 * Test suite for billing API client functionality.
 * Tests Stripe checkout, customer portal, and billing status operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { billingApi } from '@/lib/api/billing'
import { apiClient } from '@/lib/api/client'

// Mock API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

// Mock fetch for direct calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Billing API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session for monthly plan', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        checkoutUrl: 'https://checkout.stripe.com/test-session'
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.createCheckoutSession({
        priceId: 'price_monthly_test',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel'
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/test-session')
      expect(apiClient.post).toHaveBeenCalledWith('/api/billing/checkout', {
        priceId: 'price_monthly_test',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel'
      })
    })

    it('should create checkout session for annual plan', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        checkoutUrl: 'https://checkout.stripe.com/annual-session'
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.createCheckoutSession({
        priceId: 'price_annual_test'
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/annual-session')
      expect(apiClient.post).toHaveBeenCalledWith('/api/billing/checkout', {
        priceId: 'price_annual_test'
      })
    })

    it('should handle checkout session creation failure', async () => {
      // Arrange
      const mockResponse = {
        success: false,
        error: 'Invalid price ID'
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.createCheckoutSession({
        priceId: 'invalid_price'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid price ID')
    })

    it('should handle network errors during checkout', async () => {
      // Arrange
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

      // Act
      const result = await billingApi.createCheckoutSession({
        priceId: 'price_test'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        portalUrl: 'https://billing.stripe.com/portal-session'
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.createCustomerPortalSession({
        returnUrl: 'https://app.com/dashboard'
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.portalUrl).toBe('https://billing.stripe.com/portal-session')
      expect(apiClient.post).toHaveBeenCalledWith('/api/billing/portal', {
        returnUrl: 'https://app.com/dashboard'
      })
    })

    it('should handle portal session creation failure', async () => {
      // Arrange
      const mockResponse = {
        success: false,
        error: 'No billing account found'
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.createCustomerPortalSession({})

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('No billing account found')
    })
  })

  describe('getBillingStatus', () => {
    it('should get billing status for free user', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        status: {
          plan: 'free',
          credits_available: 3,
          credits_limit: 5,
          lifetime_free_used: 2,
          plan_interval: null
        }
      }

      vi.mocked(apiClient.get).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.getBillingStatus()

      // Assert
      expect(result.success).toBe(true)
      expect(result.status?.plan).toBe('free')
      expect(result.status?.credits_available).toBe(3)
      expect(result.status?.credits_limit).toBe(5)
      expect(apiClient.get).toHaveBeenCalledWith('/api/billing/status')
    })

    it('should get billing status for pro user', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        status: {
          plan: 'pro',
          plan_interval: 'month',
          credits_available: 32,
          credits_limit: 40,
          lifetime_free_used: 5,
          next_reset_at: '2025-10-01T00:00:00Z'
        }
      }

      vi.mocked(apiClient.get).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.getBillingStatus()

      // Assert
      expect(result.success).toBe(true)
      expect(result.status?.plan).toBe('pro')
      expect(result.status?.plan_interval).toBe('month')
      expect(result.status?.credits_available).toBe(32)
      expect(result.status?.next_reset_at).toBe('2025-10-01T00:00:00Z')
    })

    it('should handle billing status fetch failure', async () => {
      // Arrange
      const mockResponse = {
        success: false,
        error: 'User not found'
      }

      vi.mocked(apiClient.get).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await billingApi.getBillingStatus()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should handle network errors during status fetch', async () => {
      // Arrange
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Request timeout'))

      // Act
      const result = await billingApi.getBillingStatus()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Request timeout')
    })
  })

  describe('Environment Variables', () => {
    it('should use correct Stripe price IDs from environment', () => {
      // This test verifies that price IDs are correctly configured
      expect(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY).toBeDefined()
      expect(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL).toBeDefined()
    })
  })
})