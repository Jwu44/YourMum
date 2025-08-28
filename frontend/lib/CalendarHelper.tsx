import { calendarApi } from '@/lib/api/calendar'
import { type Task } from '@/lib/types'
import { categorizeTask } from '@/lib/api/users'
import { v4 as uuidv4 } from 'uuid'

/**
 * Check if user has calendar connected and valid credentials
 * @param userId - User's Google ID
 * @returns Promise<boolean> indicating if calendar is properly connected
 */
export const hasValidCalendarConnection = async (userId: string): Promise<boolean> => {
  try {
    const status = await calendarApi.getCalendarStatus(userId)
    return status.connected && Boolean(status.credentials)
  } catch (error) {
    console.error('Error checking calendar connection:', error)
    return false
  }
}

/**
 * Convert a Google Calendar event to a YourMum Task
 * This is a client-side helper for manual event processing
 * @param event - Calendar event data
 * @param targetDate - Target date for the task
 * @returns Promise<Task | null>
 */
export const convertCalendarEventToTask = async (
  event: any,
  targetDate: string
): Promise<Task | null> => {
  try {
    // Extract event details
    const eventName = event.summary || 'Untitled Event'

    // Skip cancelled events
    if (event.status === 'cancelled' || !eventName.trim()) {
      return null
    }

    // Categorize the event
    let categories: string[] = ['Calendar']
    try {
      const result = await categorizeTask(eventName)
      categories = result?.categories || ['Calendar']
    } catch (error) {
      console.error('Error categorizing calendar event:', error)
    }

    // Extract start and end times
    let startTime: string | undefined
    let endTime: string | undefined

    if (event.start?.dateTime) {
      const startDt = new Date(event.start.dateTime)
      startTime = startDt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }

    if (event.end?.dateTime) {
      const endDt = new Date(event.end.dateTime)
      endTime = endDt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }

    // Create Task object
    const task: Task = {
      id: uuidv4(),
      text: eventName,
      categories,
      is_subtask: false,
      completed: false,
      is_section: false,
      section: null,
      parent_id: null,
      level: 0,
      section_index: 0,
      type: 'task',
      start_time: startTime,
      end_time: endTime,
      is_recurring: null,
      start_date: targetDate,
      gcal_event_id: event.id
    }

    return task
  } catch (error) {
    console.error('Error converting calendar event to task:', error)
    return null
  }
}
