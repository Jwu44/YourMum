import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn (...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isBrowser = () => typeof window !== 'undefined'

/**
 * Convert 12-hour time format (e.g., "7:00am", "2:30pm") to 24-hour format (e.g., "07:00", "14:30")
 * for use with HTML time inputs
 */
export function convert12HourTo24Hour(time12h: string | null | undefined): string {
  if (!time12h || typeof time12h !== 'string') {
    return ''
  }

  try {
    // Match time patterns like "7:00am", "12:30pm", etc.
    const match = time12h.toLowerCase().match(/^(\d{1,2}):(\d{2})(am|pm)$/)
    if (!match) {
      return ''
    }

    let [, hourStr, minute, period] = match
    let hour = parseInt(hourStr, 10)

    // Handle AM/PM conversion
    if (period === 'am') {
      if (hour === 12) {
        hour = 0 // 12:xx AM becomes 00:xx
      }
    } else { // pm
      if (hour !== 12) {
        hour += 12 // 1:xx PM becomes 13:xx, but 12:xx PM stays 12:xx
      }
    }

    // Format with leading zeros
    const hourFormatted = hour.toString().padStart(2, '0')
    return `${hourFormatted}:${minute}`
  } catch (error) {
    console.error('Error converting 12-hour to 24-hour time:', error)
    return ''
  }
}

/**
 * Convert 24-hour time format (e.g., "07:00", "14:30") to 12-hour format (e.g., "7:00am", "2:30pm")
 * for storage in backend
 */
export function convert24HourTo12Hour(time24h: string | null | undefined): string | null {
  if (!time24h || typeof time24h !== 'string') {
    return null
  }

  try {
    // Match 24-hour pattern like "07:00", "14:30"
    const match = time24h.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) {
      return null
    }

    let [, hourStr, minute] = match
    let hour = parseInt(hourStr, 10)

    // Determine AM/PM and convert hour
    let period = 'am'
    if (hour === 0) {
      hour = 12 // 00:xx becomes 12:xx AM
    } else if (hour === 12) {
      period = 'pm' // 12:xx becomes 12:xx PM
    } else if (hour > 12) {
      hour -= 12 // 13:xx becomes 1:xx PM
      period = 'pm'
    }

    // Format without leading zeros for hour (matches backend format)
    return `${hour}:${minute}${period}`
  } catch (error) {
    console.error('Error converting 24-hour to 12-hour time:', error)
    return null
  }
}
