import { type Task } from '../types'
import { apiClient } from './client'

/**
 * Archive API using centralized API client
 */
export const archiveApi = {
  /**
   * Archive a task for the current user
   */
  async archiveTask (
    taskData: Task,
    originalDate: string
  ): Promise<{ success: boolean, message?: string, error?: string }> {
    try {
      const response = await apiClient.post('/api/archive/task', {
        taskId: taskData.id,
        taskData,
        originalDate
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error((result.error as string) !== '' ? (result.error as string) : `HTTP error! status: ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Error archiving task:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive task'
      }
    }
  },

  /**
   * Get all archived tasks for the current user
   */
  async getArchivedTasks (): Promise<{
    success: boolean
    archivedTasks: Array<{
      taskId: string
      archivedAt: string
      task: Task
      originalDate: string
    }>
    error?: string
  }> {
    try {
      const response = await apiClient.get('/api/archive/tasks')

      const result = await response.json()

      if (!response.ok) {
        throw new Error((result.error as string) !== '' ? (result.error as string) : `HTTP error! status: ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Error getting archived tasks:', error)
      return {
        success: false,
        archivedTasks: [],
        error: error instanceof Error ? error.message : 'Failed to get archived tasks'
      }
    }
  },

  /**
   * Move an archived task back to today's schedule
   */
  async moveTaskToToday (taskId: string): Promise<{
    success: boolean
    task?: Task
    error?: string
  }> {
    try {
      const response = await apiClient.post(`/api/archive/task/${taskId}/move-to-today`)

      const result = await response.json()

      if (!response.ok) {
        throw new Error((result.error as string) !== '' ? (result.error as string) : `HTTP error! status: ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Error moving task to today:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move task to today'
      }
    }
  },

  /**
   * Permanently delete an archived task
   */
  async deleteArchivedTask (taskId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const response = await apiClient.delete(`/api/archive/task/${taskId}`)

      const result = await response.json()

      if (!response.ok) {
        throw new Error((result.error as string) !== '' ? (result.error as string) : `HTTP error! status: ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Error deleting archived task:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete archived task'
      }
    }
  }
}

// Legacy exports for backwards compatibility
export const archiveTask = archiveApi.archiveTask.bind(archiveApi)
export const getArchivedTasks = archiveApi.getArchivedTasks.bind(archiveApi)
export const moveTaskToToday = archiveApi.moveTaskToToday.bind(archiveApi)
export const moveArchivedTaskToToday = archiveApi.moveTaskToToday.bind(archiveApi) // Alternative name used in some components
export const deleteArchivedTask = archiveApi.deleteArchivedTask.bind(archiveApi)
