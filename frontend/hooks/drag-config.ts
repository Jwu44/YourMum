/**
 * Centralized configuration for drag-and-drop behavior
 *
 * This file contains all constants and thresholds used across the drag-drop system.
 * Extracted from use-drag-drop-task.tsx and use-drag-drop-provider.tsx to eliminate
 * magic numbers and provide a single source of truth.
 *
 * Usage:
 * ```typescript
 * import { DRAG_CONFIG } from './drag-config'
 * const threshold = DRAG_CONFIG.zones.mobile.threshold
 * ```
 */

/**
 * Drag-and-drop configuration object
 * Using `as const` for type safety and immutability
 */
export const DRAG_CONFIG = {
  /**
   * Zone detection thresholds for determining drag type
   * Different thresholds for mobile vs desktop for optimal UX
   */
  zones: {
    mobile: {
      threshold: 0.4,  // 40% of container width
      description: 'Larger outdent/reorder zone (70%) for easier finger interaction on touch screens'
    },
    desktop: {
      threshold: 0.1,  // 10% of container width
      description: 'Smaller outdent/reorder zone (10%) for precise mouse interaction'
    },
    leftOutdent: {
      widthPx: 100,  // 100px zone to the left of task card
      description: 'Left-side zone for outdenting task to parent level (level - 1)'
    }
  },

  /**
   * Task indentation configuration
   */
  indentation: {
    maxLevels: 4,        // Maximum nesting depth for visual feedback
    maxTaskLevel: 3,     // Maximum task level (0-based, so 3 = 4 levels total)
    baseIndentPx: 24,    // Base indentation in pixels per level
    gripOffsetPx: 24     // Distance of grip handle from left edge
  },

  /**
   * Touch interaction configuration for mobile devices
   */
  touch: {
    activationDelay: 100,        // Milliseconds before touch drag activates
    tolerancePx: 8,              // Movement tolerance in pixels to distinguish tap from drag
    longPressDelay: 600,         // Milliseconds for long press activation
    movementThreshold: 10        // Pixels of movement to detect scroll vs tap
  },

  /**
   * Animation and transition configuration
   */
  animation: {
    transitionDuration: 200      // Milliseconds for drag transitions and animations
  },

  /**
   * Visual feedback configuration
   */
  visual: {
    indicators: {
      maxSegments: 4,            // Maximum number of progressive indicator segments
      darkColor: '#7c3aed',      // purple-600 for first segment
      lightColor: '#a855f7',     // purple-500 for remaining segments
      baseOpacity: 0.6,          // Base opacity for regular indicators
      darkOpacity: 0.9,          // Opacity for first (darkest) segment
      opacityDecrement: 0.15     // Opacity decrease per segment
    }
  }
} as const

/**
 * Type helper to extract configuration values with full type safety
 */
export type DragConfig = typeof DRAG_CONFIG

/**
 * Helper function to get zone threshold based on device type
 *
 * @param isMobile - Whether the device is mobile
 * @returns Zone threshold percentage (0.4 for mobile, 0.1 for desktop)
 */
export const getZoneThreshold = (isMobile: boolean): number => {
  return isMobile
    ? DRAG_CONFIG.zones.mobile.threshold
    : DRAG_CONFIG.zones.desktop.threshold
}

/**
 * Helper function to calculate zone end position
 *
 * @param containerLeft - Left edge of container in pixels
 * @param containerWidth - Width of container in pixels
 * @param isMobile - Whether the device is mobile
 * @returns Pixel position where first zone ends
 */
export const calculateZoneEnd = (
  containerLeft: number,
  containerWidth: number,
  isMobile: boolean
): number => {
  const threshold = getZoneThreshold(isMobile)
  return containerLeft + (containerWidth * threshold)
}

/**
 * Helper function to clamp indent level to maximum
 *
 * @param level - Desired indent level
 * @returns Clamped level between 0 and maxLevels
 */
export const clampIndentLevel = (level: number): number => {
  return Math.min(Math.max(level, 0), DRAG_CONFIG.indentation.maxLevels)
}

/**
 * Helper function to check if cursor is in left-outdent zone
 *
 * The left-outdent zone is a 25px area to the left of the task card.
 * When dragging in this zone, the task will outdent to the parent level (level - 1).
 *
 * @param cursorX - X coordinate of cursor
 * @param containerLeft - Left edge of container in pixels
 * @returns True if cursor is in left-outdent zone
 */
export const isInLeftOutdentZone = (
  cursorX: number,
  containerLeft: number
): boolean => {
  const leftZoneStart = containerLeft - DRAG_CONFIG.zones.leftOutdent.widthPx
  return cursorX >= leftZoneStart && cursorX < containerLeft
}
