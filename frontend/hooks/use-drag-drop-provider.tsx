import { useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { type Task } from '../lib/types'

/**
 * Provider hook for drag and drop context
 * 
 * Follows dev-guide principles:
 * - Simple implementation replacing complex custom logic
 * - Modular architecture with clear separation
 * - TypeScript strict mode
 * - Mobile-friendly sensor configuration
 */

interface UseDragDropProviderProps {
  tasks: Task[]
  onReorderTasks: (newTasks: Task[]) => void
}

interface DragDropProviderReturn {
  // DndContext props
  sensors: any
  collisionDetection: any
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  
  // SortableContext props
  items: string[]
  strategy: any
}

/**
 * Hook that provides drag and drop context configuration
 * Handles drag events and task reordering with proper collision detection
 */
export const useDragDropProvider = ({
  tasks,
  onReorderTasks
}: UseDragDropProviderProps): DragDropProviderReturn => {
  
  // Configure sensors for mobile-friendly dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
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
    const { active } = event
    console.log('Drag started:', active.id)
    // Could add additional drag start logic here if needed
  }, [])

  /**
   * Handle drag over - collision detection
   * Replaces complex manual collision calculations
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      return
    }

    // @dnd-kit handles collision detection automatically
    // We can add custom logic here if needed for indentation
  }, [])

  /**
   * Handle drag end - update task order
   * Simplifies the complex moveTask logic
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
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
  }, [tasks, onReorderTasks])

  return {
    // DndContext configuration
    sensors,
    collisionDetection: closestCenter,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    
    // SortableContext configuration  
    items: taskIds,
    strategy: verticalListSortingStrategy
  }
} 