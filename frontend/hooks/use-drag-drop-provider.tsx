import { useCallback, useRef } from 'react'
import {
  DndContext,
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
  CollisionDescriptor
} from '@dnd-kit/core'
import {
  SortableContext,
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
 * Handles drag events and task reordering with proper collision detection
 */
/**
 * Custom collision detection that respects parent-child block hierarchy
 * Prevents child tasks from being selected when cursor is within parent bounds
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

    // 🔧 FIX: Check for child-over-parent drag scenarios
    // Get the dragged task to check if it's a child being dragged over its parent
    const draggedTaskId = args.active?.id as string;
    const draggedTask = tasks.find(task => task.id === draggedTaskId);
    
    // Scenario 1: Child task being dragged over its parent (OUTDENT scenario)
    const isChildOverParent = draggedTask?.parent_id === targetTaskId;
    
    // Scenario 2: Target task is a child task (existing logic)
    const isChildTask = targetTask.parent_id != null;
    
    if (isChildOverParent) {
      // Handle child dragged over parent - apply red zone collision detection
      console.log('🔧 Child-over-parent detected:', {
        draggedTask: draggedTask?.text,
        draggedTaskId,
        parentTask: targetTask.text,
        parentTaskId: targetTaskId
      });
      
      // Get cursor position from collision rect
      const cursorX = args.collisionRect.left + args.collisionRect.width / 2;
      const cursorY = args.collisionRect.top + args.collisionRect.height / 2;
      
      // Get parent task element to calculate red zone
      const parentElement = document.querySelector(`[data-sortable-id="${targetTaskId}"]`);
      if (parentElement) {
        const parentRect = parentElement.getBoundingClientRect();
        
        // Calculate red zone (0-10% of parent width) for outdent detection
        const parentRedZoneWidth = parentRect.width * 0.1;
        const parentRedZoneEnd = parentRect.left + parentRedZoneWidth;
        const isInParentRedZone = cursorX < parentRedZoneEnd;
        
        if (isInParentRedZone) {
          // RED ZONE: Keep parent as target for outdent operation
          console.log('🟥 Child-over-parent RED ZONE (0-10%): Keeping parent as target for outdent', {
            draggedTask: draggedTask?.text,
            parentTask: targetTask.text,
            cursorX,
            parentLeft: parentRect.left,
            parentRedZoneEnd,
            isInRedZone: isInParentRedZone
          });
          
          return defaultCollisions; // Keep parent as target
        } else {
          // GREEN ZONE: Parent as target for indent (maintain parent-child relationship)
          console.log('🟩 Child-over-parent GREEN ZONE (10-100%): Keeping parent as target for indent', {
            draggedTask: draggedTask?.text,
            parentTask: targetTask.text,
            cursorX,
            parentLeft: parentRect.left,
            parentRedZoneEnd,
            isInRedZone: isInParentRedZone
          });
          
          return defaultCollisions; // Keep parent as target
        }
      }
    } else if (!isChildTask) {
      // Target is not a child and not a child-over-parent scenario, use default collision detection
      return defaultCollisions;
    }

    // Target is a child task - check if cursor is actually within parent bounds
    const parentTask = tasks.find(task => task.id === targetTask.parent_id);
    if (!parentTask) {
      return defaultCollisions;
    }

    // Get DOM elements for both parent and child
    const parentElement = document.querySelector(`[data-sortable-id="${parentTask.id}"]`);
    const childElement = document.querySelector(`[data-sortable-id="${targetTask.id}"]`);
    
    if (!parentElement || !childElement) {
      return defaultCollisions;
    }

    // Get bounding rectangles
    const parentRect = parentElement.getBoundingClientRect();
    const childRect = childElement.getBoundingClientRect();
    
    // Get cursor position from collision rect
    const cursorX = args.collisionRect.left + args.collisionRect.width / 2;
    const cursorY = args.collisionRect.top + args.collisionRect.height / 2;

    // Check if cursor is within parent bounds
    const isWithinParentBounds = (
      cursorX >= parentRect.left && 
      cursorX <= parentRect.right &&
      cursorY >= parentRect.top && 
      cursorY <= parentRect.bottom
    );

    // Check if cursor is within child bounds  
    const isWithinChildBounds = (
      cursorX >= childRect.left && 
      cursorX <= childRect.right &&
      cursorY >= childRect.top && 
      cursorY <= childRect.bottom
    );

    // 🔧 FIX: Refined parent zone priority logic
    // The task requirement is: "parent Task A: purple line should trigger indent across the whole zone"
    // But we still need to allow legitimate child interactions when directly over child
    
    if (isWithinParentBounds && !isWithinChildBounds) {
      // Cursor is in parent zone but NOT directly over child - always select parent
      console.log('🔧 Collision Override: Cursor in parent zone (not over child), selecting parent', {
        originalTarget: targetTask.id,
        newTarget: parentTask.id,
        cursorX,
        cursorY,
        withinParent: isWithinParentBounds,
        withinChild: isWithinChildBounds
      });
      
      return [{
        id: parentTask.id,
        data: primaryCollision.data
      }];
    } else if (isWithinParentBounds && isWithinChildBounds) {
      // Cursor is over both parent and child (overlapping area)
      // 🔧 FIX: Check if cursor is in parent's red zone (0-10%) for outdent priority
      
      // Calculate red zone (0-10% of parent width) for outdent detection
      const parentRedZoneWidth = parentRect.width * 0.1;
      const parentRedZoneEnd = parentRect.left + parentRedZoneWidth;
      const isInParentRedZone = cursorX < parentRedZoneEnd;
      
      if (isInParentRedZone) {
        // RED ZONE: Prioritize parent selection for outdent operation
        console.log('🟥 Collision Override: Cursor in parent RED ZONE (0-10%), selecting parent for outdent', {
          originalTarget: targetTask.id,
          newTarget: parentTask.id,
          cursorX,
          parentLeft: parentRect.left,
          parentRedZoneEnd,
          isInRedZone: isInParentRedZone
        });
        
        return [{
          id: parentTask.id,
          data: primaryCollision.data
        }];
      } else {
        // GREEN ZONE: Use default collision detection (selects child for indent)
        console.log('🟩 Collision Detection: Cursor in parent GREEN ZONE (10-100%), using default detection for indent', {
          target: targetTask.id,
          cursorX,
          parentLeft: parentRect.left,
          parentRedZoneEnd,
          isInRedZone: isInParentRedZone
        });
      }
    }

    // Use default collision detection
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

      // Method 1: Use the same reliable method as collision detection (lines 111-112)
      if (event.collisionRect && event.collisionRect.left !== undefined && event.collisionRect.top !== undefined) {
        currentMouseX = event.collisionRect.left + event.collisionRect.width / 2
        currentMouseY = event.collisionRect.top + event.collisionRect.height / 2
      } else {
        // Method 2: Fallback to activatorEvent + delta calculation
        const activatorEvent = event.activatorEvent as MouseEvent
        if (!activatorEvent) {
          console.warn('🚫 No mouse coordinates available in DragMove event')
          return
        }
        currentMouseX = activatorEvent.clientX + delta.x
        currentMouseY = activatorEvent.clientY + delta.y
      }

      // Dev-Guide: Proper error handling - validate coordinates before use
      if (isNaN(currentMouseX) || isNaN(currentMouseY) || currentMouseX === undefined || currentMouseY === undefined) {
        console.warn('🚫 Invalid mouse coordinates in DragMove:', { currentMouseX, currentMouseY, hasCollisionRect: !!event.collisionRect })
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
        if (overData?.updateCursorPosition && typeof overData.updateCursorPosition === 'function') {
          console.log('🎯 Calling updateCursorPosition from DragMove:', over.id);
          try {
            overData.updateCursorPosition(currentMouseX, currentMouseY, targetElement as HTMLElement);
          } catch (error) {
            console.error('Error calling updateCursorPosition from DragMove:', error);
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

                 // Use the enhanced moveTask if available, otherwise fall back to simple reordering
         if (moveTask && typeof moveTask === 'function') {
           moveTask(oldIndex, newIndex, dragType, targetSection)
         } else {
           // Fallback to simple reordering
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