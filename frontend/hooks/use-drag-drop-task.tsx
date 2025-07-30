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
  allTasks: Task[]
  moveTask: (dragIndex: number, hoverIndex: number, dragType: 'indent' | 'outdent' | 'reorder' | 'indent_to_parent_level' | 'indent_to_child_level', targetSection: string | null) => void
}

// Enhanced state for indentation detection
interface IndentationState {
  dragType: 'indent' | 'outdent' | 'reorder' | 'indent_to_parent_level' | 'indent_to_child_level'
  cursorPosition: { x: number; y: number } | null
  targetTaskLeftEdge: number | null
  containerWidth?: number // Track container width for percentage calculations
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
  allTasks,
  moveTask
}: UseDragDropTaskProps): DragDropTaskReturn => {
  
  // State for tracking indentation intentions
  // 🔧 FIX: Initialize with 'reorder' as default to ensure purple bar always shows
  const [indentationState, setIndentationState] = useState<IndentationState>({
    dragType: 'reorder',
    cursorPosition: null,
    targetTaskLeftEdge: null
  })

  // Cursor tracking for indentation detection - defined before useSortable
  const updateCursorPosition = useCallback((x: number, y: number, targetElement?: HTMLElement) => {
    try {
      console.log('🔧 updateCursorPosition called:', { x, y, hasTarget: !!targetElement, taskText: task.text });
      
      if (!targetElement || isSection) {
        // Reset state if no target or target is section
        // 🔧 FIX: Use 'reorder' instead of null to ensure purple bar shows
        console.log('🔧 Resetting to reorder - no target or is section');
        setIndentationState({
          dragType: 'reorder',
          cursorPosition: null,
          targetTaskLeftEdge: null,
          containerWidth: undefined
        });
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const targetTask = targetElement.getAttribute('data-task-level');
      const targetLevel = targetTask ? parseInt(targetTask, 10) : 0;
      
      console.log('🔧 Target element details:', {
        targetRect,
        width: targetRect.width,
        height: targetRect.height,
        left: targetRect.left,
        right: targetRect.right,
        targetLevel,
        elementTagName: targetElement.tagName,
        elementClasses: targetElement.className
      });
      
      // 🔧 FIX: Percentage-based threshold calculation for reliable positioning
      // Following dev-guide principle: keep implementation SIMPLE
      
      // Use the entire visible task container for percentage calculation
      const containerLeft = targetRect.left;
      const containerWidth = targetRect.width;
      const containerRight = containerLeft + containerWidth;
      
      // Calculate zone thresholds for 2-zone/3-zone/1-zone system
      const thirtyPercentWidth = containerWidth * 0.3;
      const sixtyPercentWidth = containerWidth * 0.6;
      const firstZoneEnd = containerLeft + thirtyPercentWidth;  // 0-30%
      const secondZoneEnd = containerLeft + sixtyPercentWidth;  // 30-60%
      // Third zone: 60-100%
      
      const currentTaskLevel = task.level || 0;
      const draggedTaskIsIndented = currentTaskLevel > 0;
      
      // 🔧 FIX: Determine if target task has children (is a parent in parent-child block)
      const targetTaskHasChildren = allTasks.some(t => t.parent_id === task.id);
      
      // Debug logging for threshold detection
      console.log('🎯 Zone Detection Debug:', {
        mouseX: x,
        containerLeft,
        containerWidth,
        targetLevel,
        currentTaskLevel,
        draggedTaskIsIndented,
        targetTaskHasChildren,
        firstZoneEnd,
        secondZoneEnd,
        'zone1(0-30%)': x < firstZoneEnd,
        'zone2(30-60%)': x >= firstZoneEnd && x < secondZoneEnd,
        'zone3(60-100%)': x >= secondZoneEnd
      });
      
      let dragType: 'indent' | 'outdent' | 'reorder' | 'indent_to_parent_level' | 'indent_to_child_level' = 'reorder';
      
      // 🔧 FIX: Enhanced zone system that considers parent-child block context
      if (targetTaskHasChildren) {
        // 🎯 PARENT-CHILD BLOCK CONTEXT: Target task has children (is a parent)
        // According to requirements: "dragging into parent Task A: purple line should trigger indent across the whole zone, no reorder"
        dragType = 'indent';
        console.log('✅ Parent-child block (parent): indent - entire zone triggers indentation under parent');
      } else if (targetLevel === 0) {
        // 2-zone system for non-indented targets without children
        if (x < firstZoneEnd) {
          // 0-30% zone
          dragType = draggedTaskIsIndented ? 'outdent' : 'reorder';
          console.log(`✅ Zone 1 (2-zone): ${dragType} - mouse in left 30%`);
        } else {
          // 30-100% zone
          dragType = 'indent';
          console.log('✅ Zone 2 (2-zone): indent - mouse in right 70%');
        }
      } else if (targetLevel >= 1 && targetLevel <= 2) {
        // 🎯 PARENT-CHILD BLOCK CONTEXT: Child task in existing parent-child block
        // Enhanced logic to handle child tasks in parent-child blocks
        if (x < firstZoneEnd) {
          // 0-30% zone: "left 30% zone should trigger indent under Task A" (the parent)
          dragType = 'indent_to_parent_level';
          console.log('✅ Child in parent-child block (30%): indent_to_parent_level - indent under parent');
        } else {
          // 30-100% zone: "right 70% zone should trigger indent under Task B" (the child)
          dragType = targetLevel < 3 ? 'indent_to_child_level' : 'reorder';
          console.log(`✅ Child in parent-child block (70%): ${dragType} - indent under child or reorder if max level`);
        }
      } else if (targetLevel === 3) {
        // 1-zone system for max level targets
        dragType = 'reorder';
        console.log('✅ Single zone (max level): reorder only');
      }
      
      setIndentationState({
        dragType,
        cursorPosition: { x, y },
        targetTaskLeftEdge: containerLeft,
        containerWidth
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
  }, [isSection, task.level, task.text, allTasks]);

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
        return `${baseClasses} opacity-100 cursor-grabbing text-purple-600`
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