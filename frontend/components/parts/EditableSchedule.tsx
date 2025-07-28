import React, { useMemo, useCallback } from 'react'
import { Pane } from 'evergreen-ui'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import EditableScheduleRow from './EditableScheduleRow'
import AISuggestionsList from './AISuggestionsList'
import { useDragDropProvider } from '../../hooks/use-drag-drop-provider'
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
   * This maintains the existing drag-and-drop functionality while working with
   * the optimized backend structure.
   */
  const moveTask = useCallback((
    dragIndex: number,
    hoverIndex: number,
    dragType: 'indent' | 'outdent' | 'reorder',
    targetSection: string | null
  ) => {
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
        // Indent: Make dragged task a child of target task
        const newLevel = Math.min((targetTask.level || 0) + 1, 3)

        updatedDraggedTask.is_subtask = true
        updatedDraggedTask.level = newLevel
        updatedDraggedTask.parent_id = targetTask.id
        updatedDraggedTask.section = targetTask.section

        const adjustedHoverIndex = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex
        newTasks.splice(adjustedHoverIndex + 1, 0, updatedDraggedTask)
      } else if (dragType === 'outdent' && !targetTask.is_section) {
        // Outdent: Move to same level as target task
        const newLevel = targetTask.level || 0

        updatedDraggedTask.is_subtask = newLevel > 0
        updatedDraggedTask.level = newLevel
        updatedDraggedTask.parent_id = targetTask.parent_id
        updatedDraggedTask.section = targetTask.section

        newTasks.splice(hoverIndex, 0, updatedDraggedTask)
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
          const keepIndentation =
            targetTask.parent_id === draggedTask.parent_id ||
            targetTask.level === draggedTask.level

          newTasks.splice(hoverIndex, 0, {
            ...updatedDraggedTask,
            is_subtask: keepIndentation ? draggedTask.is_subtask : false,
            level: keepIndentation ? draggedTask.level : 0,
            parent_id: keepIndentation ? draggedTask.parent_id : null
          })
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
    <DndContext
      sensors={dragDropProvider.sensors}
      collisionDetection={dragDropProvider.collisionDetection}
      onDragStart={dragDropProvider.onDragStart}
      onDragOver={dragDropProvider.onDragOver}
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
  )
}

export default React.memo(EditableSchedule)
