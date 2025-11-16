import { useCallback, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { type Task } from '../lib/types'
import { useIsMobile } from './use-mobile'
import { DRAG_CONFIG, clampIndentLevel, isInLeftOutdentZone } from './drag-config'
import {
  detectDragScenario,
  detectDragType,
  analyzeTaskRelationship,
  calculateZoneMetrics,
  type ZoneDetectionContext
} from './drag-zone-detection'

/**
 * Custom hook for task drag and drop functionality
 * 
 * Follows dev-guide principles:
 * - Simple implementation using @dnd-kit
 * - Modular architecture with clear separation of concerns
 * - TypeScript strict mode with proper interfaces
 * - Optimized transforms for smooth horizontal dragging
 * - Enhanced with Notion-style indentation detection
 */

interface UseDragDropTaskProps {
  task: Task
  index: number
  isSection: boolean
  allTasks: Task[]
  moveTask: (dragIndex: number, hoverIndex: number, dragType: 'indent' | 'outdent' | 'reorder', targetSection: string | null) => void
}

// Simplified state for indentation detection
interface IndentationState {
  dragType: 'indent' | 'outdent' | 'reorder'
  cursorPosition: { x: number; y: number } | null
  targetTaskLeftEdge: number | null
  containerWidth?: number
  targetIndentLevel?: number // Track target indent level for progressive visual feedback
  isLeftOutdent?: boolean // Track if this is a left-outdent operation (reduces level by 1)
}

interface DragDropTaskReturn {
  // @dnd-kit sortable props - properly typed instead of 'any'
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
  setNodeRef: (node: HTMLElement | null) => void
  transform: string | undefined

  // Custom drag state
  isDragging: boolean
  isOver: boolean

  // Enhanced indentation state
  indentationState: IndentationState

  // Visual feedback helpers
  getRowClassName: () => string
  getGripClassName: () => string

  // Cursor tracking for indentation
  updateCursorPosition: (x: number, y: number, targetElement?: HTMLElement, draggedTask?: Task) => void
}

/**
 * Validation layer - coordinate validation
 */
const validateCursorCoordinates = (x: number, y: number): boolean => {
  return !(isNaN(x) || isNaN(y) || x === undefined || y === undefined)
}

/**
 * Validation layer - target element validation
 */
const validateTargetElement = (
  targetElement?: HTMLElement,
  isSection?: boolean
): { valid: boolean; shouldReset: boolean } => {
  if (!targetElement || isSection) {
    return { valid: false, shouldReset: true }
  }
  return { valid: true, shouldReset: false }
}

/**
 * State factory - create indentation state object
 */
const createIndentationState = (
  dragType: 'indent' | 'outdent' | 'reorder',
  cursorPosition: { x: number; y: number } | null,
  metrics?: { containerLeft: number; containerWidth: number },
  targetLevel?: number,
  isLeftOutdent?: boolean
): IndentationState => {
  return {
    dragType,
    cursorPosition,
    targetTaskLeftEdge: metrics?.containerLeft ?? null,
    containerWidth: metrics?.containerWidth,
    targetIndentLevel: targetLevel
      ? clampIndentLevel(targetLevel + 1)
      : undefined,
    isLeftOutdent
  }
}

/**
 * State factory - create reset state (default reorder state)
 */
const createResetState = (): IndentationState => {
  return createIndentationState('reorder', null)
}

/**
 * Hook that provides drag and drop functionality for task rows
 * 🔧 FIX: Optimized for smooth horizontal and vertical dragging performance
 * ✨ Uses simplified 2-zone system for reliable indentation detection
 */
export const useDragDropTask = ({
  task,
  index,
  isSection,
  allTasks,
  moveTask
}: UseDragDropTaskProps): DragDropTaskReturn => {

  // Mobile detection for responsive drag zone sizing
  const isMobile = useIsMobile()

  // State for tracking indentation intentions
  // 🔧 FIX: Initialize with 'reorder' as default to ensure purple bar always shows
  const [indentationState, setIndentationState] = useState<IndentationState>({
    dragType: 'reorder',
    cursorPosition: null,
    targetTaskLeftEdge: null
  })

  /**
   * Cursor tracking for indentation detection
   *
   * Refactored version with clear separation of concerns:
   * 1. Validation layer - validate inputs
   * 2. Zone calculation layer - calculate metrics
   * 3. Task relationship layer - analyze task relationships
   * 4. Decision layer - determine drag type using strategy pattern
   * 5. State update layer - update indentation state
   *
   * Reduced from 133 lines to ~50 lines with improved testability
   */
  const updateCursorPosition = useCallback((
    x: number,
    y: number,
    targetElement?: HTMLElement,
    draggedTask?: Task
  ) => {
    try {
      // Layer 1: Validation
      if (!validateCursorCoordinates(x, y)) {
        return
      }

      const elementValidation = validateTargetElement(targetElement, isSection)
      if (!elementValidation.valid) {
        if (elementValidation.shouldReset) {
          setIndentationState(createResetState())
        }
        return
      }

      // Layer 2: Zone calculation
      const targetRect = targetElement!.getBoundingClientRect()
      const zoneMetrics = calculateZoneMetrics(
        targetRect.left,
        targetRect.width,
        isMobile
      )

      // Layer 3: Task relationship analysis
      const relationship = analyzeTaskRelationship(
        targetElement!,
        draggedTask,
        task,
        allTasks
      )

      if (!relationship) {
        setIndentationState(
          createIndentationState('reorder', { x, y }, {
            containerLeft: zoneMetrics.containerLeft,
            containerWidth: zoneMetrics.containerWidth
          })
        )
        return
      }

      // Layer 4: Drag type determination using strategy pattern
      const scenario = detectDragScenario(
        relationship.draggedIsOverParent,
        relationship.targetLevel
      )

      const context: ZoneDetectionContext = {
        cursorX: x,
        containerLeft: zoneMetrics.containerLeft,
        containerWidth: zoneMetrics.containerWidth,
        isMobile,
        draggedTaskIsIndented: relationship.draggedIsIndented,
        targetLevel: relationship.targetLevel
      }

      const dragType = detectDragType(scenario, context)

      // Detect if this is a left-outdent operation
      const isLeftOutdent = dragType === 'outdent' &&
        isInLeftOutdentZone(x, zoneMetrics.containerLeft)

      // Layer 5: State update
      setIndentationState(
        createIndentationState(
          dragType,
          { x, y },
          {
            containerLeft: zoneMetrics.containerLeft,
            containerWidth: zoneMetrics.containerWidth
          },
          relationship.targetLevel,
          isLeftOutdent
        )
      )
    } catch (error) {
      console.error('Error updating cursor position:', error)
      // Fallback to reorder mode with cursor position
      setIndentationState(createIndentationState('reorder', { x, y }))
    }
  }, [isSection, task, allTasks, isMobile])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: task.id,
    data: {
      type: isSection ? 'section' : 'task',
      task,
      index,
      indentationState, // Include indentation state in drag data
      updateCursorPosition // Include cursor position function in drag data
    },
    disabled: isSection // Sections cannot be dragged for now
  })

  // 🔧 FIX: Prevent task shuffling - only apply transforms to actively dragged items
  // This ensures other tasks remain in their original positions during drag operations
  // Only the task being dragged gets position transforms, while drop targets show visual feedback
  const optimizedTransform = (transform && isDragging) ? 
    `translate3d(${transform.x}px, ${transform.y}px, 0)` : 
    undefined

  /**
   * Get CSS classes for the row based on drag state
   * 🔧 FIX: Prevent visual shuffling - only dragged items get transform styles
   */
  const getRowClassName = useCallback((): string => {
    try {
      const baseClasses = 'relative flex items-center'
      
      if (isDragging) {
        // Only the actively dragged item gets transform styling
        return `${baseClasses} opacity-50 rotate-1 scale-105 z-50` // Higher z-index for proper layering
      }
      
      if (isOver) {
        // Drop targets only get subtle background tint, no position changes  
        return `${baseClasses} transition-all duration-200 bg-purple-50 border-purple-200`
      }
      
      // All other tasks remain completely static with normal transitions
      return `${baseClasses} transition-all duration-200`
    } catch (error) {
      console.error('Error getting row className:', error)
      return 'relative flex items-center transition-all duration-200' // Fallback
    }
  }, [isDragging, isOver])

  /**
   * Get CSS classes for the grip icon based on drag state
   * Shows interactive state when hovering/dragging
   */
  const getGripClassName = useCallback((): string => {
    try {
      const baseClasses = 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2'
      
      if (isDragging) {
        // Hide grip during drag operations instead of showing it
        return `${baseClasses} opacity-0 cursor-grabbing text-purple-600`
      }
      
      return `${baseClasses} cursor-grab hover:text-purple-600`
    } catch (error) {
      console.error('Error getting grip className:', error)
      return 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2' // Fallback
    }
  }, [isDragging])


  // Reset indentation state when drag ends
  useEffect(() => {
    if (!isDragging && !isOver) {
      setIndentationState(createResetState())
    }
  }, [isDragging, isOver])

  return {
    // @dnd-kit props to spread on the draggable element
    attributes: {
      ...attributes,
      // 🔧 FIX: Add touch-action for better pointer handling
      'data-touch-action': 'none' // Will be handled via CSS
    },
    listeners,
    setNodeRef,
    transform: optimizedTransform, // Use optimized transform with translate3d
    
    // Drag state
    isDragging,
    isOver,
    
    // Enhanced indentation state
    indentationState,
    
    // Helper functions
    getRowClassName,
    getGripClassName,
    
    // Cursor tracking for indentation
    updateCursorPosition
  }
} 