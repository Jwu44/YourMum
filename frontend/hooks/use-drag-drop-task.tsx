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
 * - Reusable helper function for common drag operations
 */

interface UseDragDropTaskProps {
  task: Task
  index: number
  isSection: boolean
  moveTask: (dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => void
}

interface DragDropTaskReturn {
  // @dnd-kit sortable props
  attributes: Record<string, any>
  listeners: Record<string, any> | undefined
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
 * Replaces complex custom implementation with simple @dnd-kit integration
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

  // Transform CSS for smooth dragging animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  /**
   * Get CSS classes for the row based on drag state
   * Follows Notion's visual feedback approach
   */
  const getRowClassName = useCallback((): string => {
    const baseClasses = 'relative flex items-center transition-all duration-200'
    
    if (isDragging) {
      return `${baseClasses} opacity-50 rotate-1 scale-105` // Dragging state - semi-transparent with slight tilt
    }
    
    if (isOver) {
      return `${baseClasses} bg-purple-50 border-purple-200` // Drop target - purple tint
    }
    
    return baseClasses
  }, [isDragging, isOver])

  /**
   * Get CSS classes for the grip icon based on drag state
   * Shows interactive state when hovering/dragging
   */
  const getGripClassName = useCallback((): string => {
    const baseClasses = 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2'
    
    if (isDragging) {
      return `${baseClasses} opacity-100 cursor-grabbing text-purple-600`
    }
    
    return `${baseClasses} cursor-grab hover:text-purple-600`
  }, [isDragging])

  return {
    // @dnd-kit props to spread on the draggable element
    attributes,
    listeners,
    setNodeRef,
    transform: style.transform,
    
    // Drag state
    isDragging,
    isOver,
    
    // Helper functions
    getRowClassName,
    getGripClassName
  }
} 