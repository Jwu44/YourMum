import { useCallback, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { type Task } from '../lib/types'
import { useIsMobile } from './use-mobile'

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

  // Cursor tracking for indentation detection - defined before useSortable
  const updateCursorPosition = useCallback((x: number, y: number, targetElement?: HTMLElement, draggedTask?: Task) => {
    try {
      // Dev-Guide: Proper error handling - validate coordinates first
      if (isNaN(x) || isNaN(y) || x === undefined || y === undefined) {
        return;
      }

      
      if (!targetElement || isSection) {
        // Reset state if no target or target is section
        // 🔧 FIX: Use 'reorder' instead of null to ensure purple bar shows
        setIndentationState({
          dragType: 'reorder',
          cursorPosition: null,
          targetTaskLeftEdge: null,
          containerWidth: undefined,
          targetIndentLevel: undefined
        });
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const targetTask = targetElement.getAttribute('data-task-level');
      const targetLevel = targetTask ? parseInt(targetTask, 10) : 0;
      
      
      // 🔧 FIX: Responsive zone calculation for mobile vs desktop
      // Mobile: 40:60 split for easier finger interaction
      // Desktop: 10:90 split for precise mouse interaction
      // Following dev-guide principle: keep implementation SIMPLE

      // Use the entire visible task container for percentage calculation
      const containerLeft = targetRect.left;
      const containerWidth = targetRect.width;
      const containerRight = containerLeft + containerWidth;

      // Calculate zone thresholds based on device type
      const zoneThreshold = isMobile ? 0.4 : 0.1; // Mobile: 40%, Desktop: 10%
      const firstZoneWidth = containerWidth * zoneThreshold;
      const firstZoneEnd = containerLeft + firstZoneWidth;
      // Second zone covers remaining percentage (Mobile: 60%, Desktop: 90%)
      
      const currentTaskLevel = task.level || 0;
      const draggedTaskIsIndented = currentTaskLevel > 0;
      
      // 🔧 FIX: Extract target task ID from DOM to determine if target has children
      // Dev-Guide: Check for potential null/undefined values and verify type consistency
      const targetTaskId = targetElement.getAttribute('data-sortable-id');
      const targetTaskHasChildren = targetTaskId ? allTasks.some(t => String(t.parent_id) === String(targetTaskId)) : false;
      
      
      let dragType: 'indent' | 'outdent' | 'reorder' = 'reorder';
      
      // Calculate target indent level for progressive visual feedback
      let targetIndentLevel = targetLevel + 1; // Where we would indent to
      
      // 🔧 FIX: Check if dragged task is being dragged over its parent (outdent scenario)
      // Use draggedTask parameter when available, fallback to current task context for compatibility
      const actualDraggedTask = draggedTask || task;
      
      // Dev-Guide: Comprehensive error handling and null checks
      if (!targetTaskId || !actualDraggedTask) {
        setIndentationState({
          dragType: 'reorder',
          cursorPosition: { x, y },
          targetTaskLeftEdge: containerLeft,
          targetIndentLevel: undefined
        });
        return;
      }
      
      // Dev-Guide: Verify type consistency for parent-child relationship detection
      const draggedTaskIsOverItsParent = draggedTask ? 
        (String(targetTaskId) === String(draggedTask.parent_id) && draggedTask.parent_id !== null) : 
        (String(targetTaskId) === String(task.parent_id) && task.parent_id !== null);
      
      
      

      // 🔧 FIX: Simplified zone detection logic for child-to-child vs child-to-parent scenarios
      if (draggedTaskIsOverItsParent) {
        // Child task being dragged over its parent - preserve existing outdent behavior
        if (x < firstZoneEnd) {
          // 0-10% zone: outdent to sibling level
          dragType = 'outdent';
        } else {
          // 10-100% zone: maintain parent-child relationship
          dragType = 'indent';
        }
      } else if (targetLevel > 0) {
        // 🔧 FIX: Target is a child task (level > 0) - this is the key scenario for the bug
        // This covers child-to-child scenarios where we want to reorder as siblings
        if (x < firstZoneEnd) {
          // 0-10% zone: reorder as sibling after the target child
          dragType = 'reorder';
        } else {
          // 10-100% zone: indent under target child
          dragType = 'indent';
        }
      } else if (targetLevel === 3) {
        // Max level - only reorder allowed
        dragType = 'reorder';
      } else {
        // Standard 2-zone system for level 0 tasks (parents/top-level)
        if (x < firstZoneEnd) {
          // 0-10% zone
          dragType = draggedTaskIsIndented ? 'outdent' : 'reorder';
        } else {
          // 10-100% zone
          dragType = 'indent';
        }
      }
      
      
      setIndentationState({
        dragType,
        cursorPosition: { x, y },
        targetTaskLeftEdge: containerLeft,
        containerWidth,
        targetIndentLevel: Math.min(targetIndentLevel, 4) // Cap at 4 levels for visual feedback
      });
      
    } catch (error) {
      console.error('Error updating cursor position:', error);
      // Fallback to reorder mode
      setIndentationState({
        dragType: 'reorder',
        cursorPosition: { x, y },
        targetTaskLeftEdge: null,
        targetIndentLevel: undefined
      });
    }
  }, [isSection, task.level, task.text, task.parent_id, allTasks, isMobile]);

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
      setIndentationState({
        dragType: 'reorder',
        cursorPosition: null,
        targetTaskLeftEdge: null,
        targetIndentLevel: undefined
      });
    }
  }, [isDragging, isOver]);

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