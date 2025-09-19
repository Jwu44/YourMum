/**
 * @file haptics.ts
 * @description Utility functions for haptic feedback on mobile devices
 */

/**
 * Trigger haptic feedback with graceful degradation
 * @param pattern - Vibration pattern (default: single short pulse)
 */
export function triggerHapticFeedback(pattern: number | number[] = 50): void {
  try {
    // Check if vibration API is available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      // Check if vibration is supported (not disabled by user/browser)
      const canVibrate = navigator.vibrate(0) // Test with 0ms to check support

      if (canVibrate !== false) {
        navigator.vibrate(pattern)
      }
    }
  } catch (error) {
    // Silently fail - vibration is a nice-to-have feature
    console.debug('Haptic feedback not supported:', error)
  }
}

/**
 * Predefined haptic patterns for common interactions
 */
export const HapticPatterns = {
  /** Short tap feedback */
  TAP: 50,

  /** Long press feedback - stronger pulse */
  LONG_PRESS: 100,

  /** Success action feedback */
  SUCCESS: [50, 100, 50],

  /** Error action feedback */
  ERROR: [100, 50, 100, 50, 100],

  /** Drag start feedback */
  DRAG_START: [50, 50, 100]
} as const

/**
 * Check if haptic feedback is supported on the current device
 * @returns true if vibration API is available
 */
export function isHapticSupported(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator
  } catch {
    return false
  }
}