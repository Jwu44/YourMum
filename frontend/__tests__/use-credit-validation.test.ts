/**
 * @file Unit tests for useCreditValidation hook
 *
 * Tests the credit validation hook functionality for Phase 2D implementation.
 * Focuses on essential functionality only.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useCreditValidation } from '@/hooks/use-credit-validation'
import { billingApi } from '@/lib/api/billing'
import type { BillingStatus } from '@/lib/types'

// Mock the billing API
jest.mock('@/lib/api/billing', () => ({
  billingApi: {
    getBillingStatus: jest.fn()
  }
}))

const mockBillingApi = billingApi as jest.Mocked<typeof billingApi>

describe('useCreditValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return loading state initially', () => {
    mockBillingApi.getBillingStatus.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useCreditValidation())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.billingStatus).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should fetch billing status on mount', async () => {
    const mockBillingStatus: BillingStatus = {
      plan: 'pro',
      planInterval: 'month',
      creditsThisMonth: 25,
      creditsLimit: 40,
      lifetimeFreeUsed: 0,
      subscriptionStatus: 'active'
    }

    mockBillingApi.getBillingStatus.mockResolvedValue({
      success: true,
      status: mockBillingStatus
    })

    const { result } = renderHook(() => useCreditValidation())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.billingStatus).toEqual(mockBillingStatus)
    expect(result.current.error).toBe(null)
  })

  it('should validate sufficient credits correctly', async () => {
    const mockBillingStatus: BillingStatus = {
      plan: 'pro',
      planInterval: 'month',
      creditsThisMonth: 5,
      creditsLimit: 40,
      lifetimeFreeUsed: 0,
      subscriptionStatus: 'active'
    }

    mockBillingApi.getBillingStatus.mockResolvedValue({
      success: true,
      status: mockBillingStatus
    })

    const { result } = renderHook(() => useCreditValidation())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Test sufficient credits
    expect(result.current.hasEnoughCredits(1)).toBe(true)
    expect(result.current.hasEnoughCredits(5)).toBe(true)

    // Test insufficient credits
    expect(result.current.hasEnoughCredits(6)).toBe(false)
    expect(result.current.hasEnoughCredits(10)).toBe(false)
  })

  it('should handle insufficient credits for free users', async () => {
    const mockBillingStatus: BillingStatus = {
      plan: 'free',
      creditsThisMonth: 0,
      creditsLimit: 5,
      lifetimeFreeUsed: 5,
      subscriptionStatus: 'inactive'
    }

    mockBillingApi.getBillingStatus.mockResolvedValue({
      success: true,
      status: mockBillingStatus
    })

    const { result } = renderHook(() => useCreditValidation())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.hasEnoughCredits(1)).toBe(false)
    expect(result.current.billingStatus?.plan).toBe('free')
  })

  it('should handle API errors gracefully', async () => {
    mockBillingApi.getBillingStatus.mockResolvedValue({
      success: false,
      error: 'API Error'
    })

    const { result } = renderHook(() => useCreditValidation())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.billingStatus).toBe(null)
    expect(result.current.error).toBe('API Error')
    expect(result.current.hasEnoughCredits(1)).toBe(false)
  })

  it('should handle no billing status gracefully', async () => {
    const { result } = renderHook(() => useCreditValidation())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // When no billing status, should assume insufficient credits
    expect(result.current.hasEnoughCredits(1)).toBe(false)
  })
})