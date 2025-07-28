import { useCallback } from 'react'
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
  SensorDescriptor
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
}

interface DragDropProviderReturn {
  // DndContext props - properly typed instead of 'any'
  sensors: SensorDescriptor<any>[]
  collisionDetection: CollisionDetection
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  
  // SortableContext props
  items: string[]
  strategy: SortingStrategy | undefined
}

/**
 * Hook that provides drag and drop context configuration
 * Handles drag events and task reordering with proper collision detection
 */
export const useDragDropProvider = ({
  tasks,
  onReorderTasks
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
   * Replaces complex manual collision calculations
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    try {
      const { active, over } = event
      
      if (!over || active.id === over.id) {
        return
      }

      // @dnd-kit handles collision detection automatically
      // We can add custom logic here if needed for indentation
    } catch (error) {
      console.error('Error handling drag over:', error)
    }
  }, [])

  /**
   * Handle drag end - update task order
   * Simplifies the complex moveTask logic
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
        // Use @dnd-kit's arrayMove utility for simple reordering
        const newTasks = arrayMove(tasks, oldIndex, newIndex)
        onReorderTasks(newTasks)
      }
    } catch (error) {
      console.error('Error handling drag end:', error)
      // Gracefully handle errors without breaking the UI
    }
  }, [tasks, onReorderTasks])

  return {
    // DndContext configuration
    sensors,
    collisionDetection: closestCenter, // 🔧 FIX: Use closestCenter for better cursor tracking
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    
    // SortableContext configuration  
    items: taskIds,
    strategy: undefined // No strategy for maximum responsiveness - manual collision detection
  }
} 