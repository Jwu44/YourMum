/**
 * Zone Detection Strategy for Drag-and-Drop
 *
 * This module implements a strategy pattern for determining drag types based on
 * cursor position and task relationships. Extracted from use-drag-drop-task.tsx
 * to reduce cyclomatic complexity and improve testability.
 *
 * Key Concepts:
 * - Drag Scenario: The relationship between dragged and target tasks
 * - Drag Type: The operation to perform (indent, outdent, reorder)
 * - Zone Detection: Determining drag type based on cursor position within container
 *
 * Usage:
 * ```typescript
 * const scenario = detectDragScenario(isOverParent, targetLevel)
 * const dragType = detectDragType(scenario, context)
 * ```
 */

import { DRAG_CONFIG, getZoneThreshold, calculateZoneEnd, isInLeftOutdentZone } from './drag-config'
import { type Task } from '../lib/types'

/**
 * Drag scenarios representing different task relationships
 */
export type DragScenario =
  | 'overParent'      // Dragged task is over its parent
  | 'overChild'       // Target is a child task (level > 0)
  | 'overMaxLevel'    // Target is at maximum nesting level
  | 'default'         // Standard case

/**
 * Drag types representing different operations
 */
export type DragType = 'indent' | 'outdent' | 'reorder'

/**
 * Context information needed for zone detection
 */
export interface ZoneDetectionContext {
  cursorX: number              // X coordinate of cursor
  containerLeft: number        // Left edge of target container
  containerWidth: number       // Width of target container
  isMobile: boolean           // Whether device is mobile
  draggedTaskIsIndented: boolean  // Whether dragged task has level > 0
  targetLevel: number         // Level of target task
}

/**
 * Detect which drag scenario applies based on task relationships
 *
 * @param draggedTaskIsOverItsParent - Whether dragged task is over its parent
 * @param targetLevel - Level of the target task
 * @returns The drag scenario that applies
 */
export const detectDragScenario = (
  draggedTaskIsOverItsParent: boolean,
  targetLevel: number
): DragScenario => {
  if (draggedTaskIsOverItsParent) {
    return 'overParent'
  }
  // Check max level before checking if it's a child (level > 0)
  // This ensures max level takes precedence
  if (targetLevel === DRAG_CONFIG.indentation.maxTaskLevel) {
    return 'overMaxLevel'
  }
  if (targetLevel > 0) {
    return 'overChild'
  }
  return 'default'
}

/**
 * Strategy function type for determining drag type
 */
type DragTypeStrategy = (ctx: ZoneDetectionContext) => DragType

/**
 * Determine if cursor is in first zone (outdent/reorder zone)
 */
const isInFirstZone = (ctx: ZoneDetectionContext): boolean => {
  const zoneEnd = calculateZoneEnd(ctx.containerLeft, ctx.containerWidth, ctx.isMobile)
  return ctx.cursorX < zoneEnd
}

/**
 * Strategy: Dragged task is over its parent
 *
 * Zones:
 * - Left zone (-25px to 0): outdent to parent level
 * - First zone (0-10%): outdent - become sibling of parent
 * - Second zone (10-100%): indent - maintain parent-child relationship
 */
const overParentStrategy: DragTypeStrategy = (ctx) => {
  // Check left-outdent zone first
  if (isInLeftOutdentZone(ctx.cursorX, ctx.containerLeft)) {
    return 'outdent'
  }
  return isInFirstZone(ctx) ? 'outdent' : 'indent'
}

/**
 * Strategy: Target is a child task (level > 0)
 *
 * Zones:
 * - Left zone (-25px to 0): outdent to parent level (level - 1)
 * - First zone (0-10%): reorder - insert as sibling after target
 * - Second zone (10-100%): indent - make dragged task child of target
 */
const overChildStrategy: DragTypeStrategy = (ctx) => {
  // Check left-outdent zone first
  if (isInLeftOutdentZone(ctx.cursorX, ctx.containerLeft)) {
    return 'outdent'
  }
  return isInFirstZone(ctx) ? 'reorder' : 'indent'
}

/**
 * Strategy: Target is at maximum level (cannot indent further)
 *
 * Zones:
 * - Left zone (-25px to 0): outdent to parent level (level - 1)
 * - Otherwise: reorder since indentation is not possible
 */
const overMaxLevelStrategy: DragTypeStrategy = (ctx) => {
  // Check left-outdent zone first
  if (isInLeftOutdentZone(ctx.cursorX, ctx.containerLeft)) {
    return 'outdent'
  }
  return 'reorder'
}

/**
 * Strategy: Default case for level 0 targets
 *
 * Zones:
 * - Left zone (-25px to 0): outdent to parent level (stays 0 for level 0 targets)
 * - First zone (0-10%): outdent if dragged task is indented, otherwise reorder
 * - Second zone (10-100%): indent - make target the parent
 */
const defaultStrategy: DragTypeStrategy = (ctx) => {
  // Check left-outdent zone first
  if (isInLeftOutdentZone(ctx.cursorX, ctx.containerLeft)) {
    return 'outdent'
  }
  if (isInFirstZone(ctx)) {
    return ctx.draggedTaskIsIndented ? 'outdent' : 'reorder'
  }
  return 'indent'
}

/**
 * Map of drag scenarios to their strategies
 */
const dragTypeStrategies: Record<DragScenario, DragTypeStrategy> = {
  overParent: overParentStrategy,
  overChild: overChildStrategy,
  overMaxLevel: overMaxLevelStrategy,
  default: defaultStrategy
}

/**
 * Detect drag type based on scenario and cursor position
 *
 * This is the main entry point for zone detection. It uses the strategy
 * pattern to determine the appropriate drag type.
 *
 * @param scenario - The drag scenario (from detectDragScenario)
 * @param context - Zone detection context with cursor position and task info
 * @returns The drag type to use (indent, outdent, or reorder)
 *
 * @example
 * ```typescript
 * const scenario = detectDragScenario(false, 1)  // 'overChild'
 * const dragType = detectDragType(scenario, {
 *   cursorX: 100,
 *   containerLeft: 0,
 *   containerWidth: 500,
 *   isMobile: false,
 *   draggedTaskIsIndented: false,
 *   targetLevel: 1
 * })
 * // Returns 'indent' if cursorX > 50 (10% of 500)
 * ```
 */
export const detectDragType = (
  scenario: DragScenario,
  context: ZoneDetectionContext
): DragType => {
  const strategy = dragTypeStrategies[scenario]
  return strategy(context)
}

/**
 * Task relationship analysis result
 */
export interface TaskRelationship {
  targetLevel: number
  targetTaskId: string | null
  targetHasChildren: boolean
  draggedIsOverParent: boolean
  draggedIsIndented: boolean
}

/**
 * Analyze the relationship between dragged task and target task
 *
 * This function extracts task metadata from the DOM and analyzes the
 * parent-child relationships between tasks.
 *
 * @param targetElement - The DOM element of the target task
 * @param draggedTask - The task being dragged (if available)
 * @param currentTask - The current task from component props
 * @param allTasks - Array of all tasks for parent-child analysis
 * @returns Task relationship analysis or null if invalid
 */
export const analyzeTaskRelationship = (
  targetElement: HTMLElement,
  draggedTask: Task | undefined,
  currentTask: Task,
  allTasks: Task[]
): TaskRelationship | null => {
  // Extract target task metadata from DOM
  const targetTaskId = targetElement.getAttribute('data-sortable-id')
  const targetTaskLevel = targetElement.getAttribute('data-task-level')
  const targetLevel = targetTaskLevel ? parseInt(targetTaskLevel, 10) : 0

  if (!targetTaskId) {
    return null
  }

  // Determine which task is actually being dragged
  const actualDraggedTask = draggedTask ?? currentTask

  // Check if target has children
  const targetHasChildren = allTasks.some(
    t => String(t.parent_id) === String(targetTaskId)
  )

  // Check if dragged task is over its parent
  const draggedIsOverParent =
    String(targetTaskId) === String(actualDraggedTask.parent_id) &&
    actualDraggedTask.parent_id !== null

  // Check if dragged task is indented
  const draggedIsIndented = (currentTask.level || 0) > 0

  return {
    targetLevel,
    targetTaskId,
    targetHasChildren,
    draggedIsOverParent,
    draggedIsIndented
  }
}

/**
 * Calculate zone metrics for visual feedback
 *
 * @param containerLeft - Left edge of container
 * @param containerWidth - Width of container
 * @param isMobile - Whether device is mobile
 * @returns Zone metrics including thresholds and positions
 */
export interface ZoneMetrics {
  containerLeft: number
  containerWidth: number
  zoneThreshold: number
  firstZoneEnd: number
}

export const calculateZoneMetrics = (
  containerLeft: number,
  containerWidth: number,
  isMobile: boolean
): ZoneMetrics => {
  const zoneThreshold = getZoneThreshold(isMobile)
  const firstZoneEnd = calculateZoneEnd(containerLeft, containerWidth, isMobile)

  return {
    containerLeft,
    containerWidth,
    zoneThreshold,
    firstZoneEnd
  }
}
