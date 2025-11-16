/**
 * Unit tests for drag-zone-detection module
 *
 * Tests the strategy pattern implementation for determining drag types
 * based on cursor position and task relationships.
 */

import {
  detectDragScenario,
  detectDragType,
  analyzeTaskRelationship,
  calculateZoneMetrics,
  type ZoneDetectionContext,
  type DragScenario
} from '../drag-zone-detection'
import { type Task } from '../../lib/types'

describe('drag-zone-detection', () => {
  describe('detectDragScenario', () => {
    it('should return overParent when dragged task is over its parent', () => {
      const result = detectDragScenario(true, 0)
      expect(result).toBe('overParent')
    })

    it('should return overChild when target level > 0 and not over parent', () => {
      const result = detectDragScenario(false, 1)
      expect(result).toBe('overChild')
    })

    it('should return overMaxLevel when target is at level 3', () => {
      const result = detectDragScenario(false, 3)
      expect(result).toBe('overMaxLevel')
    })

    it('should return default for standard case (level 0, not parent)', () => {
      const result = detectDragScenario(false, 0)
      expect(result).toBe('default')
    })

    it('should prioritize overParent over overMaxLevel', () => {
      const result = detectDragScenario(true, 3)
      expect(result).toBe('overParent')
    })
  })

  describe('detectDragType', () => {
    describe('overParent scenario', () => {
      const scenario: DragScenario = 'overParent'

      it('should return outdent when cursor in first zone (desktop)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 40, // < 50 (10% of 500)
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: true,
          targetLevel: 0
        }
        expect(detectDragType(scenario, context)).toBe('outdent')
      })

      it('should return indent when cursor in second zone (desktop)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 60, // > 50 (10% of 500)
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: true,
          targetLevel: 0
        }
        expect(detectDragType(scenario, context)).toBe('indent')
      })

      it('should return outdent when cursor in first zone (mobile)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 150, // < 200 (40% of 500)
          containerLeft: 0,
          containerWidth: 500,
          isMobile: true,
          draggedTaskIsIndented: true,
          targetLevel: 0
        }
        expect(detectDragType(scenario, context)).toBe('outdent')
      })

      it('should return indent when cursor in second zone (mobile)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 250, // > 200 (40% of 500)
          containerLeft: 0,
          containerWidth: 500,
          isMobile: true,
          draggedTaskIsIndented: true,
          targetLevel: 0
        }
        expect(detectDragType(scenario, context)).toBe('indent')
      })
    })

    describe('overChild scenario', () => {
      const scenario: DragScenario = 'overChild'

      it('should return reorder when cursor in first zone (desktop)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 40,
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: false,
          targetLevel: 1
        }
        expect(detectDragType(scenario, context)).toBe('reorder')
      })

      it('should return indent when cursor in second zone (desktop)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 60,
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: false,
          targetLevel: 1
        }
        expect(detectDragType(scenario, context)).toBe('indent')
      })

      it('should return reorder when cursor in first zone (mobile)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 150,
          containerLeft: 0,
          containerWidth: 500,
          isMobile: true,
          draggedTaskIsIndented: false,
          targetLevel: 1
        }
        expect(detectDragType(scenario, context)).toBe('reorder')
      })
    })

    describe('overMaxLevel scenario', () => {
      const scenario: DragScenario = 'overMaxLevel'

      it('should always return reorder regardless of cursor position', () => {
        const contextFirstZone: ZoneDetectionContext = {
          cursorX: 10,
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: true,
          targetLevel: 3
        }
        expect(detectDragType(scenario, contextFirstZone)).toBe('reorder')

        const contextSecondZone: ZoneDetectionContext = {
          ...contextFirstZone,
          cursorX: 400
        }
        expect(detectDragType(scenario, contextSecondZone)).toBe('reorder')
      })
    })

    describe('default scenario', () => {
      const scenario: DragScenario = 'default'

      it('should return outdent when cursor in first zone and task is indented', () => {
        const context: ZoneDetectionContext = {
          cursorX: 40,
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: true,
          targetLevel: 0
        }
        expect(detectDragType(scenario, context)).toBe('outdent')
      })

      it('should return reorder when cursor in first zone and task is not indented', () => {
        const context: ZoneDetectionContext = {
          cursorX: 40,
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: false,
          targetLevel: 0
        }
        expect(detectDragType(scenario, context)).toBe('reorder')
      })

      it('should return indent when cursor in second zone', () => {
        const context: ZoneDetectionContext = {
          cursorX: 60,
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: false,
          targetLevel: 0
        }
        expect(detectDragType(scenario, context)).toBe('indent')
      })
    })

    describe('edge cases', () => {
      it('should handle cursor exactly at zone boundary (desktop)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 50, // exactly at 10% boundary
          containerLeft: 0,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: false,
          targetLevel: 0
        }
        // At boundary, should be in second zone (indent)
        expect(detectDragType('default', context)).toBe('indent')
      })

      it('should handle cursor exactly at zone boundary (mobile)', () => {
        const context: ZoneDetectionContext = {
          cursorX: 200, // exactly at 40% boundary
          containerLeft: 0,
          containerWidth: 500,
          isMobile: true,
          draggedTaskIsIndented: false,
          targetLevel: 0
        }
        // At boundary, should be in second zone (indent)
        expect(detectDragType('default', context)).toBe('indent')
      })

      it('should handle container with non-zero left offset', () => {
        const context: ZoneDetectionContext = {
          cursorX: 140, // 40px into container (< 10% of 500)
          containerLeft: 100,
          containerWidth: 500,
          isMobile: false,
          draggedTaskIsIndented: false,
          targetLevel: 0
        }
        expect(detectDragType('default', context)).toBe('reorder')
      })
    })
  })

  describe('calculateZoneMetrics', () => {
    it('should calculate correct metrics for desktop', () => {
      const result = calculateZoneMetrics(100, 500, false)

      expect(result.containerLeft).toBe(100)
      expect(result.containerWidth).toBe(500)
      expect(result.zoneThreshold).toBe(0.1) // Desktop threshold
      expect(result.firstZoneEnd).toBe(150) // 100 + (500 * 0.1)
    })

    it('should calculate correct metrics for mobile', () => {
      const result = calculateZoneMetrics(100, 500, true)

      expect(result.containerLeft).toBe(100)
      expect(result.containerWidth).toBe(500)
      expect(result.zoneThreshold).toBe(0.4) // Mobile threshold
      expect(result.firstZoneEnd).toBe(300) // 100 + (500 * 0.4)
    })

    it('should handle zero left offset', () => {
      const result = calculateZoneMetrics(0, 400, false)

      expect(result.containerLeft).toBe(0)
      expect(result.firstZoneEnd).toBe(40) // 0 + (400 * 0.1)
    })
  })

  describe('analyzeTaskRelationship', () => {
    // Mock tasks for testing
    const mockTasks: Task[] = [
      {
        id: 'task-a',
        text: 'Task A',
        completed: false,
        level: 0,
        parent_id: null
      },
      {
        id: 'task-b',
        text: 'Task B',
        completed: false,
        level: 1,
        parent_id: 'task-a'
      },
      {
        id: 'task-c',
        text: 'Task C',
        completed: false,
        level: 0,
        parent_id: null
      }
    ]

    it('should return null when targetTaskId is missing', () => {
      const mockElement = {
        getAttribute: jest.fn().mockReturnValue(null)
      } as unknown as HTMLElement

      const result = analyzeTaskRelationship(
        mockElement,
        undefined,
        mockTasks[0],
        mockTasks
      )

      expect(result).toBeNull()
    })

    it('should correctly identify when dragged task is over its parent', () => {
      const mockElement = {
        getAttribute: jest.fn((attr: string) => {
          if (attr === 'data-sortable-id') return 'task-a'
          if (attr === 'data-task-level') return '0'
          return null
        })
      } as unknown as HTMLElement

      const result = analyzeTaskRelationship(
        mockElement,
        undefined,
        mockTasks[1], // Task B (parent_id: 'task-a')
        mockTasks
      )

      expect(result).not.toBeNull()
      expect(result?.draggedIsOverParent).toBe(true)
      expect(result?.targetLevel).toBe(0)
    })

    it('should correctly identify when dragged task is NOT over its parent', () => {
      const mockElement = {
        getAttribute: jest.fn((attr: string) => {
          if (attr === 'data-sortable-id') return 'task-c'
          if (attr === 'data-task-level') return '0'
          return null
        })
      } as unknown as HTMLElement

      const result = analyzeTaskRelationship(
        mockElement,
        undefined,
        mockTasks[1], // Task B (parent_id: 'task-a', not 'task-c')
        mockTasks
      )

      expect(result).not.toBeNull()
      expect(result?.draggedIsOverParent).toBe(false)
    })

    it('should detect when target has children', () => {
      const mockElement = {
        getAttribute: jest.fn((attr: string) => {
          if (attr === 'data-sortable-id') return 'task-a'
          if (attr === 'data-task-level') return '0'
          return null
        })
      } as unknown as HTMLElement

      const result = analyzeTaskRelationship(
        mockElement,
        undefined,
        mockTasks[2],
        mockTasks
      )

      expect(result).not.toBeNull()
      expect(result?.targetHasChildren).toBe(true) // Task A has Task B as child
    })

    it('should detect when target has no children', () => {
      const mockElement = {
        getAttribute: jest.fn((attr: string) => {
          if (attr === 'data-sortable-id') return 'task-c'
          if (attr === 'data-task-level') return '0'
          return null
        })
      } as unknown as HTMLElement

      const result = analyzeTaskRelationship(
        mockElement,
        undefined,
        mockTasks[0],
        mockTasks
      )

      expect(result).not.toBeNull()
      expect(result?.targetHasChildren).toBe(false) // Task C has no children
    })

    it('should correctly identify if dragged task is indented', () => {
      const mockElement = {
        getAttribute: jest.fn((attr: string) => {
          if (attr === 'data-sortable-id') return 'task-a'
          if (attr === 'data-task-level') return '0'
          return null
        })
      } as unknown as HTMLElement

      const result = analyzeTaskRelationship(
        mockElement,
        undefined,
        mockTasks[1], // Task B with level 1
        mockTasks
      )

      expect(result).not.toBeNull()
      expect(result?.draggedIsIndented).toBe(true)
    })

    it('should use draggedTask parameter when provided', () => {
      const mockElement = {
        getAttribute: jest.fn((attr: string) => {
          if (attr === 'data-sortable-id') return 'task-a'
          if (attr === 'data-task-level') return '0'
          return null
        })
      } as unknown as HTMLElement

      const draggedTask = mockTasks[1] // Task B

      const result = analyzeTaskRelationship(
        mockElement,
        draggedTask,
        mockTasks[2], // Current task is C, but dragged is B
        mockTasks
      )

      expect(result).not.toBeNull()
      expect(result?.draggedIsOverParent).toBe(true) // B is over its parent A
    })
  })

  describe('integration: full workflow', () => {
    it('should correctly determine indent for child target in second zone', () => {
      // Scenario: Dragging task C over task B (child of A) in the indent zone
      const scenario = detectDragScenario(false, 1) // overChild
      const context: ZoneDetectionContext = {
        cursorX: 300, // In second zone
        containerLeft: 0,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: false,
        targetLevel: 1
      }

      expect(scenario).toBe('overChild')
      expect(detectDragType(scenario, context)).toBe('indent')
    })

    it('should correctly determine reorder for child target in first zone (task55 bug fix)', () => {
      // Scenario: Dragging task C over task B (child of A) in the outdent zone
      // Expected: C should become sibling of B under A
      const scenario = detectDragScenario(false, 1) // overChild
      const context: ZoneDetectionContext = {
        cursorX: 40, // In first zone (< 10%)
        containerLeft: 0,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: false,
        targetLevel: 1
      }

      expect(scenario).toBe('overChild')
      expect(detectDragType(scenario, context)).toBe('reorder')
    })
  })

  describe('left-outdent zone', () => {
    it('should return outdent for left zone in overChild scenario', () => {
      // Scenario: Dragging task A over task B (level 1) in left zone
      // Expected: A becomes level 0 (parent level)
      const scenario = detectDragScenario(false, 1) // overChild
      const context: ZoneDetectionContext = {
        cursorX: 50, // In left zone [0, 100)
        containerLeft: 100,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: false,
        targetLevel: 1
      }

      expect(scenario).toBe('overChild')
      expect(detectDragType(scenario, context)).toBe('outdent')
    })

    it('should return outdent for left zone in overParent scenario', () => {
      const scenario = detectDragScenario(true, 0) // overParent
      const context: ZoneDetectionContext = {
        cursorX: 25, // In left zone [0, 100)
        containerLeft: 100,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: true,
        targetLevel: 0
      }

      expect(scenario).toBe('overParent')
      expect(detectDragType(scenario, context)).toBe('outdent')
    })

    it('should return outdent for left zone in default scenario', () => {
      const scenario = detectDragScenario(false, 0) // default
      const context: ZoneDetectionContext = {
        cursorX: 25, // In left zone [0, 100)
        containerLeft: 100,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: true,
        targetLevel: 0
      }

      expect(scenario).toBe('default')
      expect(detectDragType(scenario, context)).toBe('outdent')
    })

    it('should return outdent for left zone in overMaxLevel scenario', () => {
      const scenario = detectDragScenario(false, 3) // overMaxLevel
      const context: ZoneDetectionContext = {
        cursorX: 450, // In left zone [400, 500)
        containerLeft: 500,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: false,
        targetLevel: 3
      }

      expect(scenario).toBe('overMaxLevel')
      expect(detectDragType(scenario, context)).toBe('outdent')
    })

    it('should prioritize left zone over first zone', () => {
      // Cursor is in left zone, even though it would also be in first zone
      const scenario = detectDragScenario(false, 0) // default
      const context: ZoneDetectionContext = {
        cursorX: 25, // In left zone [0, 100) AND would be in first zone if not for left check
        containerLeft: 100,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: false,
        targetLevel: 0
      }

      // Should return outdent (from left zone), not reorder (from first zone)
      expect(detectDragType(scenario, context)).toBe('outdent')
    })

    it('should work with mobile (larger left zone affects positioning but not detection)', () => {
      const scenario = detectDragScenario(false, 1) // overChild
      const context: ZoneDetectionContext = {
        cursorX: 200, // In left zone [150, 250) but also in first zone [250, 350)
        containerLeft: 250,
        containerWidth: 500,
        isMobile: true, // Mobile has 40% threshold for first zone
        draggedTaskIsIndented: false,
        targetLevel: 1
      }

      // Left zone check happens first, so should be outdent
      expect(detectDragType(scenario, context)).toBe('outdent')
    })

    it('should handle edge case at zone boundary', () => {
      const scenario = detectDragScenario(false, 1) // overChild
      const context: ZoneDetectionContext = {
        cursorX: 0, // Exactly at left zone start [0, 100)
        containerLeft: 100,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: false,
        targetLevel: 1
      }

      expect(detectDragType(scenario, context)).toBe('outdent')
    })

    it('should NOT trigger for cursor just outside left zone', () => {
      const scenario = detectDragScenario(false, 1) // overChild
      const context: ZoneDetectionContext = {
        cursorX: -1, // Just before left zone [0, 100)
        containerLeft: 100,
        containerWidth: 500,
        isMobile: false,
        draggedTaskIsIndented: false,
        targetLevel: 1
      }

      // Should fall through to first zone logic (reorder for overChild)
      expect(detectDragType(scenario, context)).toBe('reorder')
    })
  })
})
