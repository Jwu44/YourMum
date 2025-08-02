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
 * Simplified collision detection that respects parent-child hierarchy
 * Uses 2-zone system: red zone (0-10%) for outdent/reorder, green zone (10-100%) for indent
 */
const createParentAwareCollisionDetection = (tasks: Task[]): CollisionDetection => {
  return (args) => {
    // Get default collision results from @dnd-kit
    const defaultCollisions = closestCenter(args);
    
    if (!defaultCollisions || defaultCollisions.length === 0) {
      return defaultCollisions;
    }

    // Get the primary collision (closest target)
    const primaryCollision = defaultCollisions[0];
    const targetTaskId = primaryCollision.id as string;
    
    // Find the target task
    const targetTask = tasks.find(task => task.id === targetTaskId);
    if (!targetTask) {
      return defaultCollisions;
    }

    // Get the dragged task to check scenarios
    const draggedTaskId = args.active?.id as string;
    const draggedTask = tasks.find(task => task.id === draggedTaskId);
    
    // Check for child-over-parent drag scenario
    const isChildOverParent = draggedTask?.parent_id === targetTaskId;
    const isChildTask = targetTask.parent_id != null;
    
    // 🔧 FIX: Check for parent-over-child scenario (should be blocked/restricted)
    const isParentOverChild = targetTask.parent_id === draggedTaskId;
    
    // Collision detection logging
    console.log('🔧 Collision detection:', {
      draggedTask: draggedTask?.text,
      targetTask: targetTask.text,
      scenario: isChildOverParent ? 'child-over-parent' : 
                isParentOverChild ? 'parent-over-child (BLOCKED)' : 'default'
    });
    
    if (isChildOverParent) {
      // Child task being dragged over its parent - allow normal zone logic
      // Zone logic is handled in use-drag-drop-task.tsx
      console.log('🔧 Child-over-parent: allowing zone detection');
      return defaultCollisions;
    } else if (isParentOverChild) {
      // 🔧 FIX: Parent being dragged over its child - block this operation for now
      // Future enhancement: implement block dragging
      console.log('🚫 Parent-over-child: blocking operation (future: block drag)', {
        draggedParent: draggedTask?.text,
        targetChild: targetTask.text
      });
      return []; // Return empty array to block the collision
    } else if (!isChildTask) {
      // Target is not a child - use default collision detection
      console.log('🔧 Target is not a child: using default collision detection');
      return defaultCollisions;
    }

    // Target is a child task - simplified parent zone logic
    const parentTask = tasks.find(task => task.id === targetTask.parent_id);
    if (!parentTask) {
      return defaultCollisions;
    }

    // Get DOM elements
    const parentElement = document.querySelector(`[data-sortable-id="${parentTask.id}"]`);
    const childElement = document.querySelector(`[data-sortable-id="${targetTask.id}"]`);
    
    if (!parentElement || !childElement) {
      return defaultCollisions;
    }

    // Get cursor position from collision rect
    const cursorX = args.collisionRect.left + args.collisionRect.width / 2;
    const cursorY = args.collisionRect.top + args.collisionRect.height / 2;

    // Get bounding rectangles
    const parentRect = parentElement.getBoundingClientRect();
    const childRect = childElement.getBoundingClientRect();

    // Check if cursor is within bounds
    const isWithinParentBounds = (
      cursorX >= parentRect.left && cursorX <= parentRect.right &&
      cursorY >= parentRect.top && cursorY <= parentRect.bottom
    );
    const isWithinChildBounds = (
      cursorX >= childRect.left && cursorX <= childRect.right &&
      cursorY >= childRect.top && cursorY <= childRect.bottom
    );

    // 🔧 FIX: Always redirect collision to parent when dragging over child
    // This allows the zone detection logic in use-drag-drop-task.tsx to handle red/green zones properly
    // Both red zone (reorder) and green zone (indent) need to target the parent for proper logic execution
    
    if (isWithinParentBounds) {
      // Redirect collision to parent task for both red and green zones
      console.log('🔄 Redirecting collision from child to parent:', {
        from: targetTask.text,
        to: parentTask.text,
        reason: 'Parent-child drag operation detected'
      });
      
      return [{
        id: parentTask.id,
        data: {
          droppableContainer: defaultCollisions[0]?.data?.droppableContainer,
          value: parentTask.id
        }
      }];
    }

    // Default: target the child task (when not within parent bounds)
    console.log('🔧 Using default collision - targeting child task');
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
    // TouchSensor for mobile devices with minimal delay
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 5, // Small tolerance for touch precision
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
      console.log('Drag started:', active.id)
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

      console.log('🎯 DragOver event:', {
        activeId: active.id,
        overId: over.id,
        activeData: active.data.current,
        overData: over.data.current
      });

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
        console.warn('🚫 No mouse coordinates available in DragMove event')
        return
      }

      // Dev-Guide: Proper error handling - validate coordinates before use
      if (isNaN(currentMouseX) || isNaN(currentMouseY) || currentMouseX === undefined || currentMouseY === undefined) {
        console.warn('🚫 Invalid mouse coordinates in DragMove:', { currentMouseX, currentMouseY })
        return
      }
      
      console.log('🎯 DragMove event (FIXED COORDINATES):', {
        activeId: active.id,
        overId: over.id,
        currentMouseX,
        currentMouseY,
        delta,
        hasValidCoordinates: !isNaN(currentMouseX) && !isNaN(currentMouseY)
      });

      // Find the target element using the over ID
      const targetElement = document.querySelector(`[data-sortable-id="${over.id}"]`)
      if (targetElement) {
        console.log('🎯 Found target element in DragMove:', targetElement);
        
        // Get the over task's data and call updateCursorPosition
        const overData = over.data.current;
        const activeData = active.data.current;
        const draggedTask = activeData?.task; // Extract the dragged task
        
        // Dev-Guide: Comprehensive error handling and validation
        if (!draggedTask) {
          console.warn('🚫 No dragged task found in active data');
        }
        
        if (overData?.updateCursorPosition && typeof overData.updateCursorPosition === 'function') {
          console.log('🎯 Calling updateCursorPosition from DragMove:', over.id, 'with dragged task:', draggedTask?.text);
          try {
            overData.updateCursorPosition(currentMouseX, currentMouseY, targetElement as HTMLElement, draggedTask);
          } catch (error) {
            console.error('Error calling updateCursorPosition from DragMove:', error);
            // Graceful fallback - continue operation without crashing
          }
        } else {
          console.log('🚫 updateCursorPosition not found in DragMove');
        }
      } else {
        console.log('🚫 Target element not found in DragMove for:', over.id);
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
        
        console.log('🔧 DragEnd Debug:', {
          activeId: active.id,
          overId: over.id,
          targetDragType: targetIndentationState?.dragType,
          fallbackDragType: fallbackIndentationState?.dragType,
          finalDragType: dragType
        })

        // Determine if moving to a section
        const targetSection = overData?.type === 'section' ? overData.task.text : null

        // 🔧 FIX: Simplified - Let EditableSchedule handle all positioning logic
        // Provider only handles events, positioning logic centralized in one place
        console.log('🔧 Drag end - passing raw indices to moveTask:', {
          oldIndex,
          newIndex,
          dragType,
          targetSection
        })

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
    collisionDetection: createParentAwareCollisionDetection(tasks), // 🔧 FIX: Use parent-aware collision detection
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    
    // SortableContext configuration  
    items: taskIds,
    strategy: undefined // No strategy for maximum responsiveness - manual collision detection
  }
} 