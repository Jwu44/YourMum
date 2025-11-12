import React, { useMemo, useCallback } from 'react'
import { Pane } from 'evergreen-ui'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import EditableScheduleRow from './EditableScheduleRow'
import AISuggestionsList from './AISuggestionsList'
import { useDragDropProvider } from '../../hooks/use-drag-drop-provider'
import { DecompositionProvider } from '@/contexts/DecompositionContext'
import {
  type Task,
  type AISuggestion
} from '../../lib/types'

/**
 * Props interface for the EditableSchedule component
 */
interface EditableScheduleProps {
  /** Tasks to display in the schedule - pre-structured by optimized backend */
  tasks: Task[]

  /** Callback function for updating a task */
  onUpdateTask: (task: Task) => void

  /** Callback function for reordering tasks */
  onReorderTasks: (tasks: Task[]) => void

  /** Callback function to request AI suggestions */
  onRequestSuggestions: () => Promise<void>

  /** Flag indicating if suggestions are being loaded */
  isLoadingSuggestions: boolean

  /** Map of task IDs to associated AI suggestions */
  suggestionsMap: Map<string, AISuggestion[]>

  /** Callback function for accepting a suggestion */
  onAcceptSuggestion: (suggestion: AISuggestion) => void

  /** Callback function for rejecting a suggestion */
  onRejectSuggestion: (suggestionId: string) => void

  /** Callback function for editing a task */
  onEditTask?: (task: Task) => void

  /** Callback function for deleting a task */
  onDeleteTask?: (task: Task) => void

  /** Callback function for archiving a task */
  onArchiveTask?: (task: Task) => void
}

/**
 * Simplified EditableSchedule component for direct rendering of optimized backend data
 *
 * This component now focuses purely on rendering pre-structured tasks from the optimized
 * backend, eliminating the need for complex layout processing that was previously handled
 * by ScheduleHelper.
 */
const EditableSchedule: React.FC<EditableScheduleProps> = ({
  tasks,
  onUpdateTask,
  onReorderTasks,
  onRequestSuggestions,
  isLoadingSuggestions,
  suggestionsMap,
  onAcceptSuggestion,
  onRejectSuggestion,
  onEditTask,
  onDeleteTask,
  onArchiveTask
}) => {
  /**
   * Tasks are now pre-processed by the optimized backend
   * We can render them directly without complex layout logic
   */
  const processedTasks = useMemo(() => {
    return tasks
  }, [tasks])

  /**
   * Enhanced moveTask function to handle task reordering with proper indentation
   *
   * Uses a simplified 2-zone drag system:
   * - Red Zone (0-10%): Outdent or reorder operations
   * - Green Zone (10-100%): Indent operations
   *
   * Operations:
   * - Indent: Insert directly after target task at target's level + 1
   * - Outdent: Move to same level as parent task and position below parent
   * - Reorder: Simple position change without level modification
   *
   * This maintains the existing drag-and-drop functionality while working with
   * the optimized backend structure.
   */
  const moveTask = useCallback((
    dragIndex: number,
    hoverIndex: number,
    dragType: 'indent' | 'outdent' | 'reorder',
    targetSection: string | null,
    isLeftOutdent?: boolean
  ) => {
    try {
      // Validate indices
      if (dragIndex < 0 || dragIndex >= processedTasks.length ||
          hoverIndex < 0 || hoverIndex >= processedTasks.length) {
        console.error('Invalid drag/hover indices:', { dragIndex, hoverIndex, tasksLength: processedTasks.length })
        return
      }

      const draggedTask = { ...processedTasks[dragIndex] }
      const newTasks = processedTasks.filter((_, index) => index !== dragIndex)

      if (targetSection) {
      // Moving to a section
        const sectionIndex = newTasks.findIndex(task =>
          task.is_section && task.text === targetSection
        )

        if (sectionIndex !== -1) {
          newTasks.splice(sectionIndex + 1, 0, {
            ...draggedTask,
            section: targetSection,
            is_subtask: false,
            level: 0,
            parent_id: null,
            categories: [targetSection]
          })
        } else {
          newTasks.push({
            ...draggedTask,
            section: targetSection,
            is_subtask: false,
            level: 0,
            parent_id: null,
            categories: [targetSection]
          })
        }
      } else {
      // Regular task reordering
        const targetTask = processedTasks[hoverIndex]
        const updatedDraggedTask = { ...draggedTask }

        if (dragType === 'indent' && !targetTask.is_section) {
        // 🔧 FIX: Indent - Insert directly after target task at target's level + 1
          const newLevel = Math.min((targetTask.level || 0) + 1, 3)

          updatedDraggedTask.is_subtask = newLevel > 0
          updatedDraggedTask.level = newLevel
          updatedDraggedTask.parent_id = targetTask.id
          updatedDraggedTask.section = targetTask.section

          // Insert directly after the target task (requirement clarification #1)
          const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex
          newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask)
        } else if (dragType === 'outdent' && !targetTask.is_section) {
        // 🔧 FIX: Outdent - Handle both regular outdent and left-outdent
        // Regular outdent (first zone): match target's level and parent
        // Left-outdent (left zone): reduce to parent level (target.level - 1)
          const targetLevel = targetTask.level || 0

          // Determine new level based on outdent type
          let newLevel: number
          if (isLeftOutdent) {
            // Left-outdent: reduce to parent level (target.level - 1)
            newLevel = Math.max(targetLevel - 1, 0)
          } else {
            // Regular outdent: match target's level
            newLevel = targetLevel
          }

          updatedDraggedTask.is_subtask = newLevel > 0
          updatedDraggedTask.level = newLevel
          updatedDraggedTask.section = targetTask.section

          // Set parent_id based on new level
          if (newLevel === 0) {
            updatedDraggedTask.parent_id = null
          } else if (isLeftOutdent) {
            // For left-outdent, parent becomes target's parent's parent
            // This effectively moves up one level in the hierarchy
            updatedDraggedTask.parent_id = targetTask.parent_id
          } else {
            // For regular outdent, parent is same as target's parent
            updatedDraggedTask.parent_id = targetTask.parent_id
          }

          // Position after the target task
          const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex
          newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask)
        } else {
          if (targetTask.is_section) {
            newTasks.splice(hoverIndex + 1, 0, {
              ...updatedDraggedTask,
              is_subtask: false,
              level: 0,
              parent_id: null,
              section: targetTask.text,
              categories: [targetTask.text]
            })
          } else {
            // 🔧 FIX: Simplified reorder logic - handle child targets directly
            // Dev-Guide: Keep implementation SIMPLE and handle edge cases
            const targetLevel = targetTask.level || 0
            const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex

            // Check if target task has children (parent block scenario)
            const targetHasChildren = processedTasks.some(t => String(t.parent_id) === String(targetTask.id))

            if (targetLevel > 0) {
              // 🔧 FIX: Target is a child task - position directly after it as sibling
              // This fixes the bug where dragging to child red zone incorrectly positioned after parent block
              console.log('🔧 Reorder: Child target detected, positioning as sibling after target child')

              newTasks.splice(adjustedHoverIndex + 1, 0, {
                ...updatedDraggedTask,
                section: targetTask.section,
                is_subtask: true, // Child task (level > 0)
                level: targetLevel, // Same level as target child
                parent_id: targetTask.parent_id // Same parent as target child
              })
            } else if (targetHasChildren) {
              // Target is a parent with children - position after entire parent block
              console.log('🔧 Reorder: Parent block detected, positioning after entire block')

              // Find the last child of the target task
              let lastChildIndex = adjustedHoverIndex
              for (let i = adjustedHoverIndex + 1; i < newTasks.length; i++) {
                const task = newTasks[i]
                if (String(task.parent_id) === String(targetTask.id)) {
                  lastChildIndex = i
                } else if ((task.level || 0) <= targetLevel) {
                  // Found a task at same or higher level - stop looking
                  break
                }
              }

              // Insert after the last child of the parent block
              newTasks.splice(lastChildIndex + 1, 0, {
                ...updatedDraggedTask,
                section: targetTask.section,
                is_subtask: false, // Sibling, not child
                level: targetLevel, // Same level as parent
                parent_id: targetTask.parent_id // Same parent as target
              })
            } else {
              // Standard reorder - position directly after target
              newTasks.splice(adjustedHoverIndex + 1, 0, {
                ...updatedDraggedTask,
                section: targetTask.section,
                is_subtask: targetLevel > 0,
                level: targetLevel,
                parent_id: targetTask.parent_id
              })
            }
          }
        }
      }

      // Update section indices after reordering
      const updateSectionIndices = (tasks: Task[]): Task[] => {
        let currentSectionStartIndex = 0

        return tasks.map((task, index) => {
          if (task.is_section) {
            currentSectionStartIndex = index
            return { ...task, section_index: 0 }
          }
          return {
            ...task,
            section_index: index - currentSectionStartIndex
          }
        })
      }

      const finalTasks = updateSectionIndices(newTasks)
      onReorderTasks(finalTasks)
    } catch (error) {
      console.error('Error in moveTask:', error)
      // Don't update tasks if there's an error - maintain current state
    }
  }, [processedTasks, onReorderTasks])

  // Use our drag drop provider hook (after moveTask is defined)
  const dragDropProvider = useDragDropProvider({
    tasks,
    onReorderTasks,
    moveTask
  })

  /**
   * Log optimization status for debugging
   */
  React.useEffect(() => {
    const hasOptimizedStructure = tasks.some(task =>
      task.is_section === true || (task.section && typeof task.section === 'string')
    )

    if (hasOptimizedStructure) {
      console.log('✅ Rendering optimized backend structure')
    } else {
      console.log('⚠️ Rendering legacy structure')
    }
  }, [tasks])

  return (
    <DecompositionProvider>
      <DndContext
        sensors={dragDropProvider.sensors}
        collisionDetection={dragDropProvider.collisionDetection}
        onDragStart={dragDropProvider.onDragStart}
        onDragOver={dragDropProvider.onDragOver}
        onDragMove={dragDropProvider.onDragMove}
        onDragEnd={dragDropProvider.onDragEnd}
      >
        <SortableContext
          items={dragDropProvider.items}
          strategy={dragDropProvider.strategy}
        >
          <Pane>
            {/* Direct rendering of pre-structured tasks */}
            {processedTasks.map((task, index) => (
              <React.Fragment key={`${task.id}-${task.type || 'task'}`}>
                <EditableScheduleRow
                  task={task}
                  index={index}
                  onUpdateTask={onUpdateTask}
                  moveTask={moveTask}
                  isSection={task.is_section || task.type === 'section'}
                  allTasks={processedTasks}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onArchiveTask={onArchiveTask}
                />

                {/* Render suggestions after each task if they exist */}
                {suggestionsMap.has(task.id) && (
                  <div className="suggestion-container">
                    <AISuggestionsList
                      suggestions={suggestionsMap.get(task.id) || []}
                      onAccept={onAcceptSuggestion}
                      onReject={onRejectSuggestion}
                      className="suggestion-list"
                    />
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Render suggestions for schedule start if they exist */}
            {suggestionsMap.has('schedule-start') && (
              <div className="schedule-start-container">
                <AISuggestionsList
                  suggestions={suggestionsMap.get('schedule-start') || []}
                  onAccept={onAcceptSuggestion}
                  onReject={onRejectSuggestion}
                  className="suggestion-list"
                />
              </div>
            )}
          </Pane>
        </SortableContext>
      </DndContext>
    </DecompositionProvider>
  )
}

export default React.memo(EditableSchedule)
