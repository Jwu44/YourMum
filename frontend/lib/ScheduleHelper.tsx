/**
 * Schedule Helper Module
 *
 * This module provides utilities for rendering, transforming, and managing schedules
 * received from the backend AI service. It handles different layout types and
 * schedule operations but does not implement ordering pattern logic,
 * which is handled by the AI service.
 */

// React and 3rd-party imports
import { format as dateFormat } from 'date-fns';
import memoize from 'lodash/memoize';

// Types and Utils imports
import { 
  Task, 
  FormData, 
  ScheduleData,
  MonthWeek
} from './types';

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_BASE_URL = 'http://localhost:8000';

/**
 * Direct API call for schedule generation - bypasses ScheduleHelper
 * 
 * @param formData - Form data containing user preferences and tasks
 * @returns Backend response with structured schedule data
 */
export const generateSchedule = async (formData: FormData): Promise<ScheduleData> => {
  console.log("Direct API call to optimized backend");

  try {
    const response = await fetch(`${API_BASE_URL}/api/submit_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const responseData = await response.json();
    console.log("Response from optimized backend:", responseData);

    // Validate optimized backend response
    if (!responseData || !Array.isArray(responseData.tasks)) {
      throw new Error("Invalid response: Missing structured data");
    }

    // Return structured data directly - no processing needed!
    return {
      tasks: responseData.tasks, // Direct usage of backend-structured tasks
      layout: formData.layout_preference?.layout || 'todolist-structured',
      orderingPattern: formData.layout_preference?.orderingPattern || 'timebox',
      scheduleId: responseData.scheduleId,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTasks: responseData.tasks.filter((task: any) => !task.is_section).length,
        calendarEvents: responseData.tasks.filter((task: any) => Boolean(task.gcal_event_id)).length,
        recurringTasks: responseData.tasks.filter((task: any) => Boolean(task.is_recurring)).length,
      }
    };
  } catch (error) {
    console.error("Error in direct API call:", error);
    throw error;
  }
};

/**
 * Load schedule for a specific date - direct API call
 * 
 * @param date - Date string in format "YYYY-MM-DD"
 * @returns Schedule data or error
 */
export const loadSchedule = async (date: string): Promise<{ 
  success: boolean; 
  schedule?: Task[]; 
  error?: string 
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/schedules/${date}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Schedule not found' };
      }
      throw new Error('Failed to fetch schedule');
    }

    const scheduleData = await response.json();
    if (!scheduleData.tasks) {
      return {
        success: false,
        error: 'Invalid schedule data format'
      };
    }

    return {
      success: true,
      schedule: scheduleData.tasks
    };
  } catch (error) {
    console.error("Error loading schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load schedule"
    };
  }
};

/**
 * Update schedule for a specific date or create new if none exists
 * 
 * @param date - Date string in format "YYYY-MM-DD"
 * @param tasks - Tasks to save
 * @returns Success status
 */
export const updateSchedule = async (
  date: string, 
  tasks: Task[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First check if schedule exists for this date
    const existingSchedule = await loadSchedule(date);
    
    // If schedule doesn't exist, create a new one with POST
    if (!existingSchedule.success || !existingSchedule.schedule) {
      const scheduleData = {
        date: date,
        tasks: tasks,
        userId: 'default',
        inputs: {},
        schedule: tasks
      };
      
      const createResponse = await fetch(`${API_BASE_URL}/api/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create new schedule');
      }
      
      return { success: true };
    }
    
    // Otherwise update the existing schedule with PUT
    const updateResponse = await fetch(`${API_BASE_URL}/api/schedules/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update schedule');
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update schedule"
    };
  }
};


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
  if (!task.is_recurring || typeof task.is_recurring !== 'object') return false;
  
  // Memoize expensive operations for performance
  const memoizedGetWeekOfMonth = memoize(getWeekOfMonth);
  const memoizedFormat = memoize((date: Date, format: string) => dateFormat(date, format));

  try {
    switch (task.is_recurring.frequency) {
      case 'daily':
        return true;

      case 'weekly':
        if (!task.is_recurring.dayOfWeek) return false;
        return memoizedFormat(targetDate, 'EEEE') === task.is_recurring.dayOfWeek;

      case 'monthly':
        if (!task.is_recurring.dayOfWeek || !task.is_recurring.weekOfMonth) return false;
        const targetDayOfWeek = memoizedFormat(targetDate, 'EEEE');
        const targetWeekOfMonth = memoizedGetWeekOfMonth(targetDate);
        return targetDayOfWeek === task.is_recurring.dayOfWeek && 
               targetWeekOfMonth === task.is_recurring.weekOfMonth;

      case 'none':
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking recurrence:', error);
    return false;
  }
};

/**
 * Get week of month for a date
 * 
 * Determines which week of the month a date falls in (first, second, third, fourth, or last).
 * 
 * @param date - The date to check
 * @returns The week of the month as a MonthWeek type
 */
export const getWeekOfMonth = (date: Date): MonthWeek => {
  const dayOfMonth = date.getDate();
  
  if (dayOfMonth >= 1 && dayOfMonth <= 7) return 'first';
  if (dayOfMonth >= 8 && dayOfMonth <= 14) return 'second';
  if (dayOfMonth >= 15 && dayOfMonth <= 21) return 'third';
  if (dayOfMonth >= 22 && dayOfMonth <= 28) return 'fourth';
  return 'last';
};

