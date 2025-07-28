import { useCallback, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Task } from '../lib/types'

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
  moveTask: (dragIndex: number, hoverIndex: number, dragType: 'indent' | 'outdent' | 'reorder', targetSection: string | null) => void
}

// Enhanced state for indentation detection
interface IndentationState {
  dragType: 'indent' | 'outdent' | 'reorder' | null
  cursorPosition: { x: number; y: number } | null
  targetTaskLeftEdge: number | null
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
  updateCursorPosition: (x: number, y: number, targetElement?: HTMLElement) => void
}

/**
 * Hook that provides drag and drop functionality for task rows
 * 🔧 FIX: Optimized for smooth horizontal and vertical dragging performance
 * ✨ NEW: Enhanced with Notion-style indentation detection based on cursor position
 */
export const useDragDropTask = ({
  task,
  index,
  isSection,
  moveTask
}: UseDragDropTaskProps): DragDropTaskReturn => {
  
  // State for tracking indentation intentions
  const [indentationState, setIndentationState] = useState<IndentationState>({
    dragType: null,
    cursorPosition: null,
    targetTaskLeftEdge: null
  })

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
      indentationState // Include indentation state in drag data
    },
    disabled: isSection // Sections cannot be dragged for now
  })

  // 🔧 FIX: Optimized transform CSS for smooth dragging
  // Use translate3d for hardware acceleration and handle null transform
  const optimizedTransform = transform ? 
    `translate3d(${transform.x}px, ${transform.y}px, 0)` : 
    undefined

  /**
   * Get CSS classes for the row based on drag state
   * 🔧 FIX: Enhanced for better performance and visual feedback
   */
  const getRowClassName = useCallback((): string => {
    try {
      // Remove transition during dragging for smoother performance
      const baseClasses = isDragging 
        ? 'relative flex items-center' // No transition during drag
        : 'relative flex items-center transition-all duration-200'
      
      if (isDragging) {
        return `${baseClasses} opacity-50 rotate-1 scale-105 z-50` // Higher z-index for proper layering
      }
      
      if (isOver) {
        return `${baseClasses} bg-purple-50 border-purple-200` // Drop target - purple tint
      }
      
      return baseClasses
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
        return `${baseClasses} opacity-100 cursor-grabbing text-purple-600`
      }
      
      return `${baseClasses} cursor-grab hover:text-purple-600`
    } catch (error) {
      console.error('Error getting grip className:', error)
      return 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2' // Fallback
    }
  }, [isDragging])

  // Cursor tracking for indentation detection
  const updateCursorPosition = useCallback((x: number, y: number, targetElement?: HTMLElement) => {
    try {
      if (!targetElement || isSection) {
        // Reset state if no target or target is section
        setIndentationState({
          dragType: null,
          cursorPosition: null,
          targetTaskLeftEdge: null
        });
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const targetTask = targetElement.getAttribute('data-task-level');
      const targetLevel = targetTask ? parseInt(targetTask, 10) : 0;
      
      // Calculate content left edge (accounting for existing indentation)
      const contentLeftEdge = targetRect.left + (targetLevel * 20); // 20px per level
      
      // 20px threshold for indent/outdent detection
      const indentThreshold = contentLeftEdge + 20;
      const outdentThreshold = contentLeftEdge - 20;
      
      let dragType: 'indent' | 'outdent' | 'reorder' = 'reorder';
      
      if (x > indentThreshold && targetLevel < 3) {
        // Cursor is right of content + 20px AND target can be indented
        dragType = 'indent';
      } else if (x < outdentThreshold && (task.level || 0) > 0) {
        // Cursor is left of content - 20px AND current task can be outdented
        dragType = 'outdent';
      }
      
      setIndentationState({
        dragType,
        cursorPosition: { x, y },
        targetTaskLeftEdge: contentLeftEdge
      });
      
    } catch (error) {
      console.error('Error updating cursor position:', error);
      // Fallback to reorder mode
      setIndentationState({
        dragType: 'reorder',
        cursorPosition: { x, y },
        targetTaskLeftEdge: null
      });
    }
     }, [isSection, task.level]);

  // Reset indentation state when drag ends
  useEffect(() => {
    if (!isDragging && !isOver) {
      setIndentationState({
        dragType: null,
        cursorPosition: null,
        targetTaskLeftEdge: null
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