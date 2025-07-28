import { useCallback } from 'react'
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
 */

interface UseDragDropTaskProps {
  task: Task
  index: number
  isSection: boolean
  moveTask: (dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => void
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
  
  // Visual feedback helpers
  getRowClassName: () => string
  getGripClassName: () => string
}

/**
 * Hook that provides drag and drop functionality for task rows
 * 🔧 FIX: Optimized for smooth horizontal and vertical dragging performance
 */
export const useDragDropTask = ({
  task,
  index,
  isSection,
  moveTask
}: UseDragDropTaskProps): DragDropTaskReturn => {
  
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
      index
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
    
    // Helper functions
    getRowClassName,
    getGripClassName
  }
} 