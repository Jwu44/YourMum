/**
 * Simple credit validation hook for checking if user has sufficient credits
 * for AI operations like schedule generation and task breakdown.
 */

import { useState, useEffect, useCallback } from 'react'
import { billingApi } from '@/lib/api/billing'
import type { BillingStatus } from '@/lib/types'

interface CreditValidationState {
  billingStatus: BillingStatus | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null
}

interface CreditValidationHook {
  billingStatus: BillingStatus | null
  isLoading: boolean
  error: string | null
  hasEnoughCredits: (requiredCredits: number) => boolean
  refetch: () => Promise<void>
}

/**
 * Hook for validating user credits before expensive AI operations
 *
 * Returns billing status and a validation function to check sufficient credits
 */
export function useCreditValidation(): CreditValidationHook {
  const [state, setState] = useState<CreditValidationState>({
    billingStatus: null,
    isLoading: false,
    error: null,
    lastFetched: null
  })

  // Fetch billing status from API
  const fetchBillingStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await billingApi.getBillingStatus()

      if (result.success && result.status) {
        setState(prev => ({
          ...prev,
          billingStatus: result.status,
          isLoading: false,
          error: null,
          lastFetched: Date.now()
        }))
      } else {
        setState(prev => ({
          ...prev,
          billingStatus: null,
          isLoading: false,
          error: result.error || 'Failed to fetch billing status',
          lastFetched: null
        }))
      }
    } catch (error) {
      console.error('Error fetching billing status:', error)
      setState(prev => ({
        ...prev,
        billingStatus: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastFetched: null
      }))
    }
  }, [])

  // Check if user has enough credits for an operation
  const hasEnoughCredits = useCallback((requiredCredits: number): boolean => {
    if (!state.billingStatus) {
      return false // No billing data, assume insufficient
    }

    return state.billingStatus.creditsThisMonth >= requiredCredits
  }, [state.billingStatus])

  // Fetch on mount
  useEffect(() => {
    fetchBillingStatus()
  }, [fetchBillingStatus])

  return {
    billingStatus: state.billingStatus,
    isLoading: state.isLoading,
    error: state.error,
    hasEnoughCredits,
    refetch: fetchBillingStatus
  }
}