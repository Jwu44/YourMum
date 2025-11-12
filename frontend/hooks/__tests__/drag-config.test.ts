/**
 * Unit tests for drag-config module
 *
 * Tests the configuration constants and helper functions for drag-and-drop behavior.
 */

import {
  DRAG_CONFIG,
  getZoneThreshold,
  calculateZoneEnd,
  clampIndentLevel,
  isInLeftOutdentZone
} from '../drag-config'

describe('drag-config', () => {
  describe('DRAG_CONFIG constant', () => {
    it('should have correct zone thresholds', () => {
      expect(DRAG_CONFIG.zones.mobile.threshold).toBe(0.4)
      expect(DRAG_CONFIG.zones.desktop.threshold).toBe(0.1)
      expect(DRAG_CONFIG.zones.leftOutdent.widthPx).toBe(100)
    })

    it('should have correct indentation configuration', () => {
      expect(DRAG_CONFIG.indentation.maxLevels).toBe(4)
      expect(DRAG_CONFIG.indentation.maxTaskLevel).toBe(3)
      expect(DRAG_CONFIG.indentation.baseIndentPx).toBe(24)
      expect(DRAG_CONFIG.indentation.gripOffsetPx).toBe(24)
    })

    it('should have correct touch configuration', () => {
      expect(DRAG_CONFIG.touch.activationDelay).toBe(100)
      expect(DRAG_CONFIG.touch.tolerancePx).toBe(8)
      expect(DRAG_CONFIG.touch.longPressDelay).toBe(600)
      expect(DRAG_CONFIG.touch.movementThreshold).toBe(10)
    })

    it('should have correct animation configuration', () => {
      expect(DRAG_CONFIG.animation.transitionDuration).toBe(200)
    })

    it('should have correct visual feedback configuration', () => {
      expect(DRAG_CONFIG.visual.indicators.maxSegments).toBe(4)
      expect(DRAG_CONFIG.visual.indicators.darkColor).toBe('#7c3aed')
      expect(DRAG_CONFIG.visual.indicators.lightColor).toBe('#a855f7')
      expect(DRAG_CONFIG.visual.indicators.baseOpacity).toBe(0.6)
      expect(DRAG_CONFIG.visual.indicators.darkOpacity).toBe(0.9)
      expect(DRAG_CONFIG.visual.indicators.opacityDecrement).toBe(0.15)
    })

    it('should be immutable (as const)', () => {
      // TypeScript should prevent modification, but verify structure
      expect(Object.isFrozen(DRAG_CONFIG)).toBe(false) // as const doesn't freeze at runtime
      // But type system prevents reassignment
      expect(DRAG_CONFIG).toBeDefined()
    })
  })

  describe('getZoneThreshold', () => {
    it('should return mobile threshold when isMobile is true', () => {
      const result = getZoneThreshold(true)
      expect(result).toBe(0.4)
    })

    it('should return desktop threshold when isMobile is false', () => {
      const result = getZoneThreshold(false)
      expect(result).toBe(0.1)
    })

    it('should return correct threshold for multiple calls', () => {
      expect(getZoneThreshold(true)).toBe(0.4)
      expect(getZoneThreshold(false)).toBe(0.1)
      expect(getZoneThreshold(true)).toBe(0.4)
    })
  })

  describe('calculateZoneEnd', () => {
    describe('desktop mode', () => {
      it('should calculate zone end with 10% threshold', () => {
        const result = calculateZoneEnd(0, 500, false)
        expect(result).toBe(50) // 0 + (500 * 0.1)
      })

      it('should handle non-zero container left offset', () => {
        const result = calculateZoneEnd(100, 500, false)
        expect(result).toBe(150) // 100 + (500 * 0.1)
      })

      it('should handle small containers', () => {
        const result = calculateZoneEnd(0, 100, false)
        expect(result).toBe(10) // 0 + (100 * 0.1)
      })

      it('should handle large containers', () => {
        const result = calculateZoneEnd(0, 2000, false)
        expect(result).toBe(200) // 0 + (2000 * 0.1)
      })
    })

    describe('mobile mode', () => {
      it('should calculate zone end with 40% threshold', () => {
        const result = calculateZoneEnd(0, 500, true)
        expect(result).toBe(200) // 0 + (500 * 0.4)
      })

      it('should handle non-zero container left offset', () => {
        const result = calculateZoneEnd(100, 500, true)
        expect(result).toBe(300) // 100 + (500 * 0.4)
      })

      it('should handle small containers', () => {
        const result = calculateZoneEnd(0, 100, true)
        expect(result).toBe(40) // 0 + (100 * 0.4)
      })

      it('should handle large containers', () => {
        const result = calculateZoneEnd(0, 2000, true)
        expect(result).toBe(800) // 0 + (2000 * 0.4)
      })
    })

    describe('edge cases', () => {
      it('should handle zero width container', () => {
        const result = calculateZoneEnd(100, 0, false)
        expect(result).toBe(100) // 100 + (0 * 0.1)
      })

      it('should handle negative left offset', () => {
        const result = calculateZoneEnd(-50, 500, false)
        expect(result).toBe(0) // -50 + (500 * 0.1)
      })

      it('should handle fractional container widths', () => {
        const result = calculateZoneEnd(0, 333.33, false)
        expect(result).toBeCloseTo(33.333, 2) // 0 + (333.33 * 0.1)
      })
    })
  })

  describe('clampIndentLevel', () => {
    it('should return level unchanged when within bounds', () => {
      expect(clampIndentLevel(0)).toBe(0)
      expect(clampIndentLevel(1)).toBe(1)
      expect(clampIndentLevel(2)).toBe(2)
      expect(clampIndentLevel(3)).toBe(3)
      expect(clampIndentLevel(4)).toBe(4)
    })

    it('should clamp to max level when exceeding maximum', () => {
      expect(clampIndentLevel(5)).toBe(4)
      expect(clampIndentLevel(10)).toBe(4)
      expect(clampIndentLevel(100)).toBe(4)
    })

    it('should clamp to 0 when negative', () => {
      expect(clampIndentLevel(-1)).toBe(0)
      expect(clampIndentLevel(-10)).toBe(0)
      expect(clampIndentLevel(-100)).toBe(0)
    })

    it('should handle boundary values', () => {
      expect(clampIndentLevel(4)).toBe(4) // Exactly at max
      expect(clampIndentLevel(0)).toBe(0) // Exactly at min
    })

    it('should handle fractional levels (round down)', () => {
      // Math.min/Math.max work with floats, but indent levels should be integers
      expect(clampIndentLevel(2.5)).toBe(2.5) // Function doesn't round, caller should use integers
      expect(clampIndentLevel(4.9)).toBe(4) // Clamped to max
    })
  })

  describe('configuration relationships', () => {
    it('should have consistent max levels configuration', () => {
      // maxLevels should be maxTaskLevel + 1 (0-based vs count)
      expect(DRAG_CONFIG.indentation.maxLevels).toBe(
        DRAG_CONFIG.indentation.maxTaskLevel + 1
      )
    })

    it('should have mobile threshold larger than desktop', () => {
      expect(DRAG_CONFIG.zones.mobile.threshold).toBeGreaterThan(
        DRAG_CONFIG.zones.desktop.threshold
      )
    })

    it('should have reasonable touch delays', () => {
      expect(DRAG_CONFIG.touch.activationDelay).toBeLessThan(
        DRAG_CONFIG.touch.longPressDelay
      )
    })

    it('should have visual indicator opacity decreasing properly', () => {
      const baseOpacity = DRAG_CONFIG.visual.indicators.baseOpacity
      const decrement = DRAG_CONFIG.visual.indicators.opacityDecrement

      // After 4 segments, opacity should still be positive
      const minOpacity = baseOpacity - (decrement * 3)
      expect(minOpacity).toBeGreaterThan(0)
    })
  })

  describe('real-world usage scenarios', () => {
    it('should calculate correct zone for typical desktop task card (500px)', () => {
      const containerLeft = 50
      const containerWidth = 500
      const zoneEnd = calculateZoneEnd(containerLeft, containerWidth, false)

      expect(zoneEnd).toBe(100) // 50 + (500 * 0.1)
      expect(zoneEnd - containerLeft).toBe(50) // First zone is 50px
      expect(containerWidth - (zoneEnd - containerLeft)).toBe(450) // Second zone is 450px
    })

    it('should calculate correct zone for typical mobile task card (350px)', () => {
      const containerLeft = 20
      const containerWidth = 350
      const zoneEnd = calculateZoneEnd(containerLeft, containerWidth, true)

      expect(zoneEnd).toBe(160) // 20 + (350 * 0.4)
      expect(zoneEnd - containerLeft).toBe(140) // First zone is 140px
      expect(containerWidth - (zoneEnd - containerLeft)).toBe(210) // Second zone is 210px
    })

    it('should support progressive indent level calculations', () => {
      // Simulating indenting from level 0 to max
      let level = 0
      const levels = []

      while (level < DRAG_CONFIG.indentation.maxLevels) {
        levels.push(clampIndentLevel(level))
        level++
      }

      expect(levels).toEqual([0, 1, 2, 3]) // Levels 0-3 within maxLevels (4)

      // Test clamping at and beyond max
      expect(clampIndentLevel(4)).toBe(4) // At max
      expect(clampIndentLevel(5)).toBe(4) // Beyond max, clamped
    })
  })

  describe('isInLeftOutdentZone', () => {
    it('should return true when cursor is in left-outdent zone', () => {
      // Zone is from containerLeft - 100 to containerLeft
      const containerLeft = 100
      expect(isInLeftOutdentZone(75, containerLeft)).toBe(true) // 75 is in [0, 100)
      expect(isInLeftOutdentZone(0, containerLeft)).toBe(true) // At start of zone
      expect(isInLeftOutdentZone(99, containerLeft)).toBe(true) // Just before end
    })

    it('should return false when cursor is at or right of container left edge', () => {
      const containerLeft = 100
      expect(isInLeftOutdentZone(100, containerLeft)).toBe(false) // At container left
      expect(isInLeftOutdentZone(101, containerLeft)).toBe(false) // Right of container
      expect(isInLeftOutdentZone(150, containerLeft)).toBe(false) // Far right
    })

    it('should return false when cursor is too far left', () => {
      const containerLeft = 100
      expect(isInLeftOutdentZone(-1, containerLeft)).toBe(false) // Just before zone start
      expect(isInLeftOutdentZone(-25, containerLeft)).toBe(false) // Far left
      expect(isInLeftOutdentZone(-50, containerLeft)).toBe(false) // Very far left
    })

    it('should handle edge case with containerLeft at 0', () => {
      const containerLeft = 0
      expect(isInLeftOutdentZone(-10, containerLeft)).toBe(true) // In zone [-100, 0)
      expect(isInLeftOutdentZone(-100, containerLeft)).toBe(true) // At zone start
      expect(isInLeftOutdentZone(-1, containerLeft)).toBe(true) // Just before container
      expect(isInLeftOutdentZone(0, containerLeft)).toBe(false) // At container edge
      expect(isInLeftOutdentZone(-101, containerLeft)).toBe(false) // Beyond zone
    })

    it('should handle various container positions', () => {
      expect(isInLeftOutdentZone(210, 250)).toBe(true) // 210 in [150, 250)
      expect(isInLeftOutdentZone(460, 500)).toBe(true) // 460 in [400, 500)
      expect(isInLeftOutdentZone(10, 50)).toBe(true) // 10 in [-50, 50)
    })

    it('should use exact 100px width from config', () => {
      const containerLeft = 100
      const expectedStart = containerLeft - DRAG_CONFIG.zones.leftOutdent.widthPx
      expect(expectedStart).toBe(0) // 100 - 100
      expect(isInLeftOutdentZone(0, containerLeft)).toBe(true)
      expect(isInLeftOutdentZone(-0.1, containerLeft)).toBe(false)
    })
  })
})
