/**
 * Simple event system for credit refresh notifications
 * Follows dev-guide.md principle: Keep implementation SIMPLE
 */

const CREDIT_REFRESH_EVENT = 'credit-refresh'

/**
 * Trigger credit refresh across all components
 * Simple helper function for common operation (per dev-guide.md)
 */
export const triggerCreditRefresh = (): void => {
  window.dispatchEvent(new CustomEvent(CREDIT_REFRESH_EVENT))
}

/**
 * Listen for credit refresh events
 * @param callback - Function to call when credit refresh is triggered
 * @returns Cleanup function to remove listener
 */
export const onCreditRefresh = (callback: () => void): (() => void) => {
  window.addEventListener(CREDIT_REFRESH_EVENT, callback)

  // Return cleanup function
  return () => {
    window.removeEventListener(CREDIT_REFRESH_EVENT, callback)
  }
}