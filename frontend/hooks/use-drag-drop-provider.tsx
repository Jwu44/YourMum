import { useCallback } from 'react'
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  CollisionDetection,
  SensorDescriptor,
  DragMoveEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortingStrategy
} from '@dnd-kit/sortable'
import { type Task } from '../lib/types'

/**
 * Provider hook for drag and drop context
 * 
 * Follows dev-guide principles:
 * - Simple implementation replacing complex custom logic
 * - Modular architecture with clear separation
 * - TypeScript strict mode with proper interfaces
 * - Optimized sensor configuration for smooth horizontal dragging
 * 
 * 🔧 FIX: Uses MouseSensor + TouchSensor instead of PointerSensor for maximum
 * responsiveness during horizontal and vertical dragging operations.
 * Eliminates the sticky/jump behavior experienced during horizontal dragging.
 */

interface UseDragDropProviderProps {
  tasks: Task[]
  onReorderTasks: (newTasks: Task[]) => void
  moveTask?: (dragIndex: number, hoverIndex: number, dragType: 'indent' | 'outdent' | 'reorder', targetSection: string | null) => void
}

interface DragDropProviderReturn {
  // DndContext props - properly typed instead of 'any'
  sensors: SensorDescriptor<any>[]
  collisionDetection: CollisionDetection
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragMove: (event: DragMoveEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  
  // SortableContext props
  items: string[]
  strategy: SortingStrategy | undefined
}

/**
 * Hook that provides drag and drop context configuration
 * Handles drag events and task reordering with simplified collision detection
 */
/**
 * Simplified collision detection - handles child targets directly
 * Removes complex parent redirection logic for cleaner implementation
 */
const createSimplifiedCollisionDetection = (tasks: Task[]): CollisionDetection => {
  return (args) => {
    // Get default collision results from @dnd-kit
    const defaultCollisions = closestCenter(args);
    
    if (!defaultCollisions || defaultCollisions.length === 0) {
      return defaultCollisions;
    }

    // Get the dragged task to check for invalid scenarios
    const draggedTaskId = args.active?.id as string;
    const draggedTask = tasks.find(task => task.id === draggedTaskId);
    
    // Get the primary collision (closest target)
    const primaryCollision = defaultCollisions[0];
    const targetTaskId = primaryCollision.id as string;
    const targetTask = tasks.find(task => task.id === targetTaskId);
    
    if (!targetTask || !draggedTask) {
      return defaultCollisions;
    }
    
    // Dev-Guide: Keep implementation SIMPLE - removed blocking logic that caused stiff parent dragging
    
    // Default collision detection - allow direct child targeting
    
    return defaultCollisions;
  };
};

export const useDragDropProvider = ({
  tasks,
  onReorderTasks,
  moveTask
}: UseDragDropProviderProps): DragDropProviderReturn => {
  
  // 🔧 FIX: Replace PointerSensor with MouseSensor + TouchSensor for better performance
  // PointerSensor has known issues with horizontal dragging smoothness on desktop
  // This eliminates the sticky/resistant behavior and jumping to catch up
  const sensors = useSensors(
    // MouseSensor for desktop - no activation constraint for immediate response
    useSensor(MouseSensor, {
      // No activationConstraint for maximum responsiveness and instant drag start
    }),
    // TouchSensor for mobile devices with improved mobile support
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Small delay to prevent accidental drags while scrolling
        tolerance: 8, // Slightly higher tolerance for better touch handling
      },
    })
  )

  // Extract task IDs for SortableContext
  const taskIds = tasks.map(task => task.id)

  /**
   * Handle drag start - visual feedback only
   * Much simpler than current 60+ line implementation
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    try {
      const { active } = event
      // Could add additional drag start logic here if needed
    } catch (error) {
      console.error('Error handling drag start:', error)
    }
  }, [])

  /**
   * Handle drag over - collision detection
   * Enhanced to update cursor position for indentation detection
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    try {
      const { active, over } = event
      
      if (!over || active.id === over.id) {
        return
      }


      // @dnd-kit handles collision detection automatically
    } catch (error) {
      console.error('Error handling drag over:', error)
    }
  }, [])

  /**
   * Handle drag move - track mouse position for indentation detection
   * This is called during active drag operations with mouse coordinates
   */
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    try {
      const { active, over, delta } = event
      
      if (!over || active.id === over.id) {
        return
      }

      // 🔧 FIX: Use proven coordinate extraction method from collision detection
      // This method is already working successfully in createParentAwareCollisionDetection
      let currentMouseX: number
      let currentMouseY: number

      // Method 1: Try to get coordinates from activatorEvent + delta
      const activatorEvent = event.activatorEvent as MouseEvent
      if (activatorEvent && activatorEvent.clientX !== undefined && activatorEvent.clientY !== undefined) {
        currentMouseX = activatorEvent.clientX + delta.x
        currentMouseY = activatorEvent.clientY + delta.y
      } else {
        // Method 2: Final fallback - no coordinates available
        return
      }

      // Dev-Guide: Proper error handling - validate coordinates before use
      if (isNaN(currentMouseX) || isNaN(currentMouseY) || currentMouseX === undefined || currentMouseY === undefined) {
        return
      }
      

      // Find the target element using the over ID
      const targetElement = document.querySelector(`[data-sortable-id="${over.id}"]`)
      if (targetElement) {
        
        // Get the over task's data and call updateCursorPosition
        const overData = over.data.current;
        const activeData = active.data.current;
        const draggedTask = activeData?.task; // Extract the dragged task
        
        // Dev-Guide: Comprehensive error handling and validation
        
        if (overData?.updateCursorPosition && typeof overData.updateCursorPosition === 'function') {
          try {
            overData.updateCursorPosition(currentMouseX, currentMouseY, targetElement as HTMLElement, draggedTask);
          } catch (error) {
            console.error('Error calling updateCursorPosition from DragMove:', error);
            // Graceful fallback - continue operation without crashing
          }
        }
      }
    } catch (error) {
      console.error('Error handling drag move:', error)
    }
  }, [])

  /**
   * Handle drag end - update task order with indentation support
   * Enhanced to support Notion-style indentation based on cursor position
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    try {
      const { active, over } = event

      if (!over || active.id === over.id) {
        return
      }

      const oldIndex = tasks.findIndex(task => task.id === active.id)
      const newIndex = tasks.findIndex(task => task.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // 🔧 FIX: Extract indentation state from target (over) data instead of active data
        // The real-time drag type is tracked on the target task during cursor movement
        const activeData = active.data.current
        const overData = over.data.current
        
        // Try to get drag type from target task's indentation state first
        const targetIndentationState = overData?.indentationState
        const fallbackIndentationState = activeData?.indentationState
        
        const dragType = targetIndentationState?.dragType || fallbackIndentationState?.dragType || 'reorder'
        

        // Determine if moving to a section
        const targetSection = overData?.type === 'section' ? overData.task.text : null

        // 🔧 FIX: Simplified - Let EditableSchedule handle all positioning logic
        // Provider only handles events, positioning logic centralized in one place

        // Use the enhanced moveTask if available, otherwise fall back to simple reordering
        if (moveTask && typeof moveTask === 'function') {
          moveTask(oldIndex, newIndex, dragType, targetSection)
        } else {
          // Fallback to simple reordering - use raw indices
          const newTasks = arrayMove(tasks, oldIndex, newIndex)
          onReorderTasks(newTasks)
        }
      }
    } catch (error) {
      console.error('Error handling drag end:', error)
      // Gracefully handle errors without breaking the UI
    }
  }, [tasks, onReorderTasks])

  return {
    // DndContext configuration
    sensors,
    collisionDetection: createSimplifiedCollisionDetection(tasks), // 🔧 FIX: Use simplified collision detection
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    
    // SortableContext configuration  
    items: taskIds,
    strategy: undefined // No strategy for maximum responsiveness - manual collision detection
  }
} 