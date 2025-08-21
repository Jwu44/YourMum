/**
 * Schedule Helper Module
 *
 * This module provides utilities for rendering, transforming, and managing schedules
 * received from the backend AI service. It handles different layout types and
 * schedule operations but does not implement ordering pattern logic,
 * which is handled by the AI service.
 */

// React and 3rd-party imports
import { format as dateFormat } from 'date-fns'
import memoize from 'lodash/memoize'

// Auth imports
import { auth } from '@/auth/firebase'

// Types and Utils imports
import {
  type Task,
  type FormData,
  type ScheduleData,
  type MonthWeek
} from './types'

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// Add this constant at the top after imports
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (_) {
    return 'UTC'
  }
}

/**
 * Get the current user's Firebase ID token for API authentication
 * @returns Promise<string> - The authentication token
 * @throws Error if user is not authenticated
 */
const getAuthToken = async (): Promise<string> => {
  // In development mode with bypass enabled, return a mock token
  if (IS_DEVELOPMENT && BYPASS_AUTH) {
    return 'mock-token-for-development'
  }

  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('User not authenticated')
  }
  // Avoid forcing refresh on every call; SDK auto-refreshes when needed
  return await currentUser.getIdToken()
}

/**
 * Generate a new schedule using the AI service
 *
 * Calls the backend submit_data endpoint to generate a schedule based on user inputs
 * and existing tasks (which may include calendar events).
 *
 * @param formData - User form data from InputsConfig containing preferences and tasks
 * @returns Promise<ScheduleData> - Generated schedule with metadata
 * @throws Error if generation fails or user is not authenticated
 */
export const generateSchedule = async (formData: FormData): Promise<ScheduleData> => {
  // Start timing
  const startTime = performance.now()
  console.log('[TIMING] Schedule generation started')
  
  try {
    // Get authentication token
    const authStartTime = performance.now()
    const token = await getAuthToken()
    const authDuration = performance.now() - authStartTime
    console.log(`[TIMING] Authentication: ${authDuration.toFixed(3)}ms`)

    // Prepare request payload
    const prepStartTime = performance.now()
    const payload = {
      date: formData.date,
      name: formData.name,
      tasks: formData.tasks || [],
      work_start_time: formData.work_start_time,
      work_end_time: formData.work_end_time,
      priorities: formData.priorities || {},
      energy_patterns: formData.energy_patterns || [],
      layout_preference: formData.layout_preference || {}
    }
    const prepDuration = performance.now() - prepStartTime
    console.log(`[TIMING] Payload preparation: ${prepDuration.toFixed(3)}ms`)

    // Call backend API
    const apiStartTime = performance.now()
    const response = await fetch(`${API_BASE_URL}/api/submit_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    const apiDuration = performance.now() - apiStartTime
    console.log(`[TIMING] Backend API call: ${apiDuration.toFixed(3)}ms`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to generate schedule (${response.status})`)
    }

    const parseStartTime = performance.now()
    const result = await response.json()
    const parseDuration = performance.now() - parseStartTime
    console.log(`[TIMING] Response parsing: ${parseDuration.toFixed(3)}ms`)

    if (!result.success) {
      throw new Error(result.error || 'Schedule generation failed')
    }

    // Return structured schedule data
    const assemblyStartTime = performance.now()
    const scheduleData = {
      tasks: result.schedule || [],
      layout: formData.layout_preference?.layout || 'todolist-structured',
      orderingPattern: formData.layout_preference?.orderingPattern || undefined,
      scheduleId: result.scheduleId,
      metadata: {
        generatedAt: result.metadata?.generatedAt || new Date().toISOString(),
        totalTasks: result.metadata?.totalTasks || 0,
        calendarEvents: result.metadata?.calendarEvents || 0,
        recurringTasks: result.metadata?.recurringTasks || 0
      }
    }
    const assemblyDuration = performance.now() - assemblyStartTime
    console.log(`[TIMING] Result assembly: ${assemblyDuration.toFixed(3)}ms`)

    const totalDuration = performance.now() - startTime
    console.log(`[TIMING] Total frontend schedule generation: ${totalDuration.toFixed(3)}ms`)
    
    return scheduleData
  } catch (error) {
    const totalDuration = performance.now() - startTime
    console.log(`[TIMING] Schedule generation failed after: ${totalDuration.toFixed(3)}ms`)
    console.error('Error generating schedule:', error)
    throw error instanceof Error ? error : new Error('Failed to generate schedule')
  }
}

/**
 * Load an existing schedule for a specific date
 *
 * Fetches a previously generated schedule from the backend.
 *
 * @param date - Date in YYYY-MM-DD format
 * @returns Promise with success status and schedule data
 */
export const loadSchedule = async (date: string): Promise<{
  success: boolean
  schedule?: Task[]
  error?: string
  inputs?: Record<string, any>
  metadata?: {
    totalTasks: number
    calendarEvents: number
    recurringTasks: number
    generatedAt: string
  }
}> => {
  try {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD')
    }

    // Get authentication token
    const token = await getAuthToken()

    // Call backend API
    const response = await fetch(`${API_BASE_URL}/api/schedules/${encodeURIComponent(date)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'No schedule found for this date'
        }
      }
      const error = await response.json()
      throw new Error(error.error || `Failed to load schedule (${response.status})`)
    }

    const result = await response.json()

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to load schedule'
      }
    }

    return {
      success: true,
      schedule: result.schedule || [],
      inputs: result.inputs || {},
      metadata: result.metadata
    }
  } catch (error) {
    console.error('Error loading schedule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load schedule'
    }
  }
}

/**
 * Create a new schedule with provided tasks
 *
 * Creates a new schedule for a specific date with the given tasks.
 * Uses the POST /api/schedules endpoint to ensure proper REST semantics.
 *
 * @param date - Date in YYYY-MM-DD format
 * @param tasks - Array of tasks for the new schedule
 * @param inputs - Optional user input data for schedule generation context
 * @returns Promise with success status and new schedule data
 * @throws Error if date format is invalid or tasks is not an array
 */
export const createSchedule = async (
  date: string,
  tasks: Task[],
  inputs?: Record<string, any>
): Promise<{
  success: boolean
  schedule?: Task[]
  error?: string
  metadata?: {
    totalTasks: number
    calendarEvents: number
    recurringTasks: number
    generatedAt: string
  }
}> => {
  try {
    // Input validation - ensure date format is correct
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD')
    }

    // Input validation - ensure tasks is an array
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array')
    }

    // Input validation - ensure inputs is an object if provided
    if (inputs !== undefined && (typeof inputs !== 'object' || inputs === null || Array.isArray(inputs))) {
      throw new Error('Inputs must be an object')
    }

    // Get authentication token with proper error handling
    const token = await getAuthToken()

    // Prepare request payload
    const requestPayload: { date: string, tasks: Task[], inputs?: Record<string, any> } = {
      date,
      tasks
    }

    // Include inputs if provided
    if (inputs) {
      requestPayload.inputs = inputs
    }

    // Call backend API to create schedule
    const response = await fetch(`${API_BASE_URL}/api/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    })

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `HTTP ${response.status}: Failed to create schedule`
      throw new Error(errorMessage)
    }

    // Parse and validate response
    const result = await response.json()

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create schedule'
      }
    }

    // Return structured response with validated data
    return {
      success: true,
      schedule: result.schedule || [],
      metadata: result.metadata || {
        totalTasks: 0,
        calendarEvents: 0,
        recurringTasks: 0,
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Error creating schedule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create schedule'
    }
  }
}

/**
 * Delete a specific task from a schedule
 *
 * @param taskId - ID of the task to delete
 * @param date - Date in YYYY-MM-DD format
 * @returns Promise with success status and updated schedule data
 * @throws Error if authentication fails or task deletion fails
 */
export const deleteTask = async (taskId: string, date: string): Promise<{
  success: boolean
  schedule?: Task[]
  error?: string
  metadata?: {
    totalTasks: number
    calendarEvents: number
    recurringTasks: number
    generatedAt: string
  }
}> => {
  try {
    // Input validation - ensure date format is correct
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD')
    }

    // Input validation - ensure taskId is provided
    if (!taskId || typeof taskId !== 'string') {
      throw new Error('Task ID is required and must be a string')
    }

    // Get authentication token with proper error handling
    const token = await getAuthToken()

    // Prepare request payload
    const requestPayload = { date }

    // Make DELETE request to backend
    const response = await fetch(`${API_BASE_URL}/api/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    if (!data.success) {
      throw new Error(data.error || 'Task deletion failed')
    }

    // Return structured response
    return {
      success: true,
      schedule: data.schedule || [],
      metadata: data.metadata || {
        totalTasks: (data.schedule || []).length,
        calendarEvents: 0,
        recurringTasks: 0,
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Error deleting task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update an existing schedule with new tasks, or create if it doesn't exist
 *
 * Implements upsert behavior: attempts to update existing schedule first,
 * then creates new schedule if none exists. This provides a seamless
 * experience for manual task addition via FAB.
 *
 * @param date - Date in YYYY-MM-DD format
 * @param tasks - Updated array of tasks
 * @returns Promise with success status and updated schedule data
 * @throws Error if date format is invalid or tasks is not an array
 */
export const updateSchedule = async (date: string, tasks: Task[]): Promise<{
  success: boolean
  schedule?: Task[]
  error?: string
  metadata?: {
    totalTasks: number
    calendarEvents: number
    recurringTasks: number
    generatedAt: string
  }
}> => {
  try {
    // Input validation - ensure date format is correct
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD')
    }

    // Input validation - ensure tasks is an array
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array')
    }

    // Get authentication token with proper error handling
    const token = await getAuthToken()

    // Prepare request payload
    const requestPayload = { tasks }

    // Step 1: Attempt to update existing schedule (PUT)
    const updateResponse = await fetch(`${API_BASE_URL}/api/schedules/${encodeURIComponent(date)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    })

    // Handle successful update
    if (updateResponse.ok) {
      const result = await updateResponse.json()

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update schedule'
        }
      }

      return {
        success: true,
        schedule: result.schedule || [],
        metadata: result.metadata || {
          totalTasks: 0,
          calendarEvents: 0,
          recurringTasks: 0,
          generatedAt: new Date().toISOString()
        }
      }
    }

    // Step 2: Handle 404 (no existing schedule) by creating new one
    if (updateResponse.status === 404) {
      console.log('No existing schedule found, creating new schedule for date:', date)
      return await createSchedule(date, tasks)
    }

    // Step 3: Handle other HTTP errors
    const errorData = await updateResponse.json().catch(() => ({}))
    const errorMessage = errorData.error || `HTTP ${updateResponse.status}: Failed to update schedule`
    throw new Error(errorMessage)
  } catch (error) {
    console.error('Error updating schedule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update schedule'
    }
  }
}

/**
 * Autogenerate today's schedule via backend
 * Centralized backend logic to find recent-with-tasks and build today's schedule
 */
export const autogenerateTodaySchedule = async (date: string): Promise<{
  success: boolean
  existed?: boolean
  created?: boolean
  sourceFound?: boolean
  schedule?: Task[]
  error?: string
}> => {
  try {
    if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD')
    }

    const token = await getAuthToken()
    const timezone = detectUserTimezone()
    const response = await fetch(`${API_BASE_URL}/api/schedules/autogenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ date, timezone })
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to autogenerate schedule' }
    }

    return { success: true, ...data }
  } catch (error) {
    console.error('Error autogenerating schedule:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Autogenerate failed' }
  }
}

/**
 * Determine if a task should recur on a given date
 *
 * Checks if a recurring task should appear on the specified date based on its recurrence pattern.
 *
 * @param task - The recurring task to check
 * @param targetDate - The date to check against
 * @returns Boolean indicating whether the task should recur on the target date
 */
export const shouldTaskRecurOnDate = (task: Task, targetDate: Date): boolean => {
  if (!task.is_recurring || typeof task.is_recurring !== 'object') return false

  // Memoize expensive operations for performance
  const memoizedGetWeekOfMonth = memoize(getWeekOfMonth)
  const memoizedFormat = memoize((date: Date, format: string) => dateFormat(date, format))

  try {
    switch (task.is_recurring.frequency) {
      case 'daily':
        return true

      case 'weekly':
        if (!task.is_recurring.dayOfWeek) return false
        return memoizedFormat(targetDate, 'EEEE') === task.is_recurring.dayOfWeek

      case 'monthly':
        if (!task.is_recurring.dayOfWeek || !task.is_recurring.weekOfMonth) return false
        const targetDayOfWeek = memoizedFormat(targetDate, 'EEEE')
        const targetWeekOfMonth = memoizedGetWeekOfMonth(targetDate)
        return targetDayOfWeek === task.is_recurring.dayOfWeek &&
               targetWeekOfMonth === task.is_recurring.weekOfMonth

      case 'none':
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking recurrence:', error)
    return false
  }
}

/**
 * Get week of month for a date
 *
 * Determines which week of the month a date falls in (first, second, third, fourth, or last).
 *
 * @param date - The date to check
 * @returns The week of the month as a MonthWeek type
 */
export const getWeekOfMonth = (date: Date): MonthWeek => {
  const dayOfMonth = date.getDate()

  if (dayOfMonth >= 1 && dayOfMonth <= 7) return 'first'
  if (dayOfMonth >= 8 && dayOfMonth <= 14) return 'second'
  if (dayOfMonth >= 15 && dayOfMonth <= 21) return 'third'
  if (dayOfMonth >= 22 && dayOfMonth <= 28) return 'fourth'
  return 'last'
}
