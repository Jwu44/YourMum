'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

// UI Components
import { Loader2 } from 'lucide-react'
import FloatingActionButton from '@/components/parts/FloatingActionButton'
import TaskEditDrawer from '@/components/parts/TaskEditDrawer'

// Layout Components
import { SidebarLayout } from '@/components/parts/SidebarLayout'
import DashboardHeader from '@/components/parts/DashboardHeader'
import EditableSchedule from '@/components/parts/EditableSchedule'
import CalendarConnectionLoader from '@/components/parts/CalendarConnectionLoader'

// Hooks and Context
import { useToast } from '@/hooks/use-toast'
import { useForm } from '../../lib/FormContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/auth/AuthContext'

// Types
import {
  type Task,
  type AISuggestion,
  type GetAISuggestionsResponse
} from '../../lib/types'

// Helpers
import {
  fetchAISuggestions,
  formatDateToString
} from '@/lib/helper'

// Direct API helpers (no ScheduleHelper)
import { userApi } from '@/lib/api/users'
import { loadSchedule, updateSchedule, deleteTask, shouldTaskRecurOnDate, autogenerateTodaySchedule } from '@/lib/ScheduleHelper'
import { Skeleton } from '@/components/ui/skeleton'
import { archiveTask } from '@/lib/api/archive'
import { auth } from '@/auth/firebase'

const Dashboard: React.FC = () => {
  const [scheduleDays, setScheduleDays] = useState<Task[][]>([])
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const { state } = useForm()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  // Be resilient in test environments where AuthProvider may be mocked
  const { calendarConnectionStage, currentUser } = (() => {
    try {
      return useAuth()
    } catch (e) {
      return { calendarConnectionStage: null as any, currentUser: auth.currentUser }
    }
  })()

  // Create task drawer state
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false)

  // Edit task drawer state - following dev-guide.md simplicity principle
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)

  const [scheduleCache, setScheduleCache] = useState<Map<string, Task[]>>(new Map())
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [shownSuggestionIds] = useState<Set<string>>(new Set())
  const [suggestionsMap, setSuggestionsMap] = useState<Map<string, AISuggestion[]>>(new Map())
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [userCreationDate, setUserCreationDate] = useState<Date | null>(null)
  const hasInitiallyLoaded = useRef(false)

  useEffect(() => {
    const date = new Date()
    date.setDate(date.getDate() + currentDayIndex)
    console.log('Setting currentDate:', date)
    setCurrentDate(date)

    // Persist current date for sidebar navigation
    try {
      localStorage.setItem('dashboardCurrentDate', formatDateToString(date))
    } catch (error) {
      console.error('Failed to persist dashboard date:', error)
    }
  }, [currentDayIndex])

  // Check for calendar sync status and show appropriate messages
  useEffect(() => {
    // Check for general calendar connection errors
    const calendarError = localStorage.getItem('calendarConnectionError')
    if (calendarError) {
      toast({
        title: 'Calendar Connection Issue',
        description: 'To sync calendar events, please connect your Google Calendar in Integrations.',
        variant: 'default'
      })
      localStorage.removeItem('calendarConnectionError')
    }

    // Check for calendar sync pending (race condition resolved)
    const syncPending = localStorage.getItem('calendarSyncPending')
    if (syncPending) {
      toast({
        title: 'Calendar Sync in Progress',
        description: 'Your calendar events will appear shortly. Refresh the page in a moment to see them.',
        variant: 'default'
      })
      localStorage.removeItem('calendarSyncPending')
    }
  }, [toast])

  // Fetch user creation date on component mount
  useEffect(() => {
    const fetchUserCreationDate = async () => {
      try {
        const creationDate = await userApi.getUserCreationDate()
        setUserCreationDate(creationDate)
        console.log('User creation date:', creationDate)
      } catch (error) {
        console.error('Failed to fetch user creation date:', error)
        // Set a fallback creation date
        setUserCreationDate(new Date('2024-01-01'))
      }
    }

    fetchUserCreationDate()
  }, [])

  const addTask = useCallback(async (newTask: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex)
      const currentSchedule = scheduleDays[currentDayIndex] || []

      const taskWithId = {
        ...newTask,
        id: uuidv4(),
        start_date: currentDate
      }

      const updatedSchedule = [...currentSchedule, taskWithId]

      // Use updateSchedule which implements upsert behavior:
      // - First tries PUT (update existing schedule)
      // - If 404 (no schedule exists), automatically calls POST (create new)
      const updateResult = await updateSchedule(currentDate, updatedSchedule)

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to add task')
      }

      // Update UI state with confirmed backend data
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        newDays[dayIndex] = updateResult.schedule || updatedSchedule
        return newDays
      })

      setScheduleCache(prevCache =>
        new Map(prevCache).set(currentDate, updateResult.schedule || updatedSchedule)
      )
    } catch (error) {
      console.error('Error adding task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add task. Please try again.',
        variant: 'destructive'
      })
    }
  }, [currentDayIndex, scheduleDays, toast])

  const getDateString = (offset: number): string => {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    return formatDateToString(date)
  }

  /**
   * Check if a date is before the user's creation date
   */
  const isDateBeforeUserCreation = useCallback((dateOffset: number): boolean => {
    if (!userCreationDate) return false

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + dateOffset)

    // Compare dates at midnight to ignore time components
    const targetDateMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const creationDateMidnight = new Date(userCreationDate.getFullYear(), userCreationDate.getMonth(), userCreationDate.getDate())

    return targetDateMidnight < creationDateMidnight
  }, [userCreationDate])

  const handleScheduleTaskUpdate = useCallback(async (updatedTask: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex)
      let updatedSchedule: Task[] = []

      // Update frontend state and capture the new schedule
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        if (newDays[dayIndex]) {
          const currentTasks = newDays[dayIndex]
          const taskIndex = currentTasks.findIndex(t => t.id === updatedTask.id)

          if (taskIndex !== -1) {
            // Update existing task
            updatedSchedule = currentTasks.map(task =>
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task
            )
            newDays[dayIndex] = updatedSchedule
          } else {
            // Add new task (for microsteps)
            const parentIndex = currentTasks.findIndex(t => t.id === updatedTask.parent_id)
            if (parentIndex !== -1) {
              const insertIndex = parentIndex + 1 + currentTasks
                .slice(0, parentIndex + 1)
                .filter(t => t.parent_id === updatedTask.parent_id).length

              const newTasks = [...currentTasks]
              newTasks.splice(insertIndex, 0, updatedTask)
              updatedSchedule = newTasks
              newDays[dayIndex] = updatedSchedule
            }
          }
        }
        return newDays
      })

      // Update cache with the correct updated schedule
      setScheduleCache(prevCache => {
        const newCache = new Map(prevCache)
        newCache.set(currentDate, updatedSchedule)
        return newCache
      })

      // Use the UPDATED schedule for backend call
      const updateResult = await updateSchedule(currentDate, updatedSchedule)

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update schedule')
      }

      // 🔧 NEW: Close edit drawer on successful update
      if (isEditDrawerOpen) {
        setIsEditDrawerOpen(false)
        setEditingTask(undefined)
      }
    } catch (error) {
      console.error('Error updating task:', error)

      // Revert frontend state on error
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        const cachedSchedule = scheduleCache.get(getDateString(currentDayIndex))
        if (cachedSchedule && newDays[dayIndex]) {
          newDays[dayIndex] = cachedSchedule
        }
        return newDays
      })

      // 🔧 KEEP DRAWER OPEN ON ERROR - no close logic here

      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive'
      })
    }
  }, [currentDayIndex, scheduleDays, scheduleCache, toast, isEditDrawerOpen])

  /**
   * Handle edit task action from EditableScheduleRow
   * Simple function following dev-guide.md simplicity principles
   */
  const handleEditTask = useCallback((task: Task) => {
    try {
      setEditingTask(task)
      setIsEditDrawerOpen(true)
    } catch (error) {
      console.error('Error opening edit task:', error)
      toast({
        title: 'Error',
        description: 'Failed to open edit dialog',
        variant: 'destructive'
      })
    }
  }, [toast])

  /**
   * Handle edit drawer close
   * Following dev-guide.md simplicity: single responsibility
   */
  const handleEditDrawerClose = useCallback(() => {
    // Simple state reset - let vaul handle modal cleanup
    setIsEditDrawerOpen(false)
    setEditingTask(undefined)
  }, [])

  /**
   * Handle delete task action
   * Removes task from schedule and updates backend
   */
  const handleDeleteTask = useCallback(async (taskToDelete: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex)

      // Optimistically update frontend state first
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        if (newDays[dayIndex]) {
          const currentTasks = newDays[dayIndex]
          const updatedTasks = currentTasks.filter(task => task.id !== taskToDelete.id)
          newDays[dayIndex] = updatedTasks
        }
        return newDays
      })

      // Update cache
      setScheduleCache(prevCache => {
        const newCache = new Map(prevCache)
        const currentTasks = scheduleCache.get(currentDate) || []
        const updatedTasks = currentTasks.filter(task => task.id !== taskToDelete.id)
        newCache.set(currentDate, updatedTasks)
        return newCache
      })

      // Call backend API to delete task
      const deleteResult = await deleteTask(taskToDelete.id, currentDate)

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete task')
      }

      // Show success toast
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error deleting task:', error)

      // Revert frontend state on error
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        const cachedSchedule = scheduleCache.get(getDateString(currentDayIndex))
        if (cachedSchedule && newDays[dayIndex]) {
          newDays[dayIndex] = cachedSchedule
        }
        return newDays
      })

      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive'
      })
    }
  }, [currentDayIndex, scheduleCache, toast])

  /**
   * Handle archive task action
   * Removes task from schedule and archives it for future use
   */
  const handleArchiveTask = useCallback(async (taskToArchive: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex)

      // Optimistically update frontend state first
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        if (newDays[dayIndex]) {
          const currentTasks = newDays[dayIndex]
          const updatedTasks = currentTasks.filter(task => task.id !== taskToArchive.id)
          newDays[dayIndex] = updatedTasks
        }
        return newDays
      })

      // Update cache
      setScheduleCache(prevCache => {
        const newCache = new Map(prevCache)
        const currentTasks = scheduleCache.get(currentDate) || []
        const updatedTasks = currentTasks.filter(task => task.id !== taskToArchive.id)
        newCache.set(currentDate, updatedTasks)
        return newCache
      })

      // Call backend API to archive task
      const archiveResult = await archiveTask(taskToArchive, currentDate)

      if (!archiveResult.success) {
        throw new Error(archiveResult.error || 'Failed to archive task')
      }

      // Delete from current schedule after successful archive
      const deleteResult = await deleteTask(taskToArchive.id, currentDate)

      if (!deleteResult.success) {
        // If delete fails but archive succeeded, show warning
        console.warn('Task archived but failed to remove from schedule:', deleteResult.error)
      }

      // Show success toast
      toast({
        title: 'Success',
        description: 'Task archived successfully',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error archiving task:', error)

      // Revert frontend state on error
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        const cachedSchedule = scheduleCache.get(getDateString(currentDayIndex))
        if (cachedSchedule && newDays[dayIndex]) {
          newDays[dayIndex] = cachedSchedule
        }
        return newDays
      })

      toast({
        title: 'Error',
        description: 'Failed to archive task. Please try again.',
        variant: 'destructive'
      })
    }
  }, [currentDayIndex, scheduleCache, toast])

  const handleReorderTasks = useCallback(async (reorderedTasks: Task[]) => {
    try {
      const currentDate = getDateString(currentDayIndex)

      // Update frontend state
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        newDays[dayIndex] = reorderedTasks
        return newDays
      })

      // Update cache
      setScheduleCache(prevCache => {
        const newCache = new Map(prevCache)
        newCache.set(currentDate, reorderedTasks)
        return newCache
      })

      // Save to backend
      const updateResult = await updateSchedule(currentDate, reorderedTasks)

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to save task positions')
      }
    } catch (error) {
      console.error('Error saving reordered tasks:', error)

      // Revert frontend state on error
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]
        const dayIndex = Math.abs(currentDayIndex)
        const cachedSchedule = scheduleCache.get(getDateString(currentDayIndex))
        if (cachedSchedule && newDays[dayIndex]) {
          newDays[dayIndex] = cachedSchedule
        }
        return newDays
      })

      toast({
        title: 'Error',
        description: 'Failed to save task positions. Please try again.',
        variant: 'destructive'
      })
    }
  }, [currentDayIndex, scheduleCache, toast])

  /**
   * Filter tasks for next day based on task5.md requirements
   * - Preserve all sections (is_section: true)
   * - Include incomplete non-recurring tasks
   * - Include recurring tasks that should appear on next day (reset to completed: false)
   */
  const filterTasksForNextDay = useCallback((
    currentTasks: Task[],
    nextDate: Date
  ): Task[] => {
    const filteredTasks: Task[] = []

    for (const task of currentTasks) {
      // Always preserve sections
      if (task.is_section) {
        filteredTasks.push({ ...task })
        continue
      }

      // Handle recurring tasks
      if (task.is_recurring && shouldTaskRecurOnDate(task, nextDate)) {
        // Reset recurring task to incomplete for next day
        filteredTasks.push({
          ...task,
          completed: false,
          start_date: formatDateToString(nextDate)
        })
        continue
      }

      // Include incomplete non-recurring tasks
      if (!task.is_recurring && !task.completed) {
        filteredTasks.push({
          ...task,
          start_date: formatDateToString(nextDate)
        })
      }
    }

    return filteredTasks
  }, [])

  /**
   * Utility function to check if a date string is in the past
   */
  const isDateInPast = useCallback((dateStr: string): boolean => {
    const targetDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day
    targetDate.setHours(0, 0, 0, 0)
    return targetDate < today
  }, [])

  /**
   * Handle next day navigation - enhanced logic for task5.md requirements
   * 1. Check if schedule exists for next day (cache first, then backend)
   * 2. If YES: load existing schedule (preserve - don't override!)
   * 3. If NO + past date: show empty state (no creation)
   * 4. If NO + future date: create new schedule with filtered tasks
   * 5. Navigate to next day regardless of success/failure
   */
  const handleNextDay = useCallback(async () => {
    const nextDayDate = getDateString(currentDayIndex + 1)
    console.log('Navigating from:', getDateString(currentDayIndex), 'to:', nextDayDate)

    try {
      // Step 1: Check cache first
      if (scheduleCache.has(nextDayDate)) {
        console.log('Found existing schedule in cache, loading it')

        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = currentDayIndex + 1

          // Ensure array is large enough
          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          newDays[targetIndex] = scheduleCache.get(nextDayDate)!
          return newDays
        })

        // Navigate to next day
        setCurrentDayIndex(prevIndex => prevIndex + 1)
        return
      }

      // Step 2: Try to load from backend
      const loadResult = await loadSchedule(nextDayDate)

      if (loadResult.success && loadResult.schedule) {
        console.log('Found existing schedule in backend, loading it')

        // Existing schedule found - load it (don't override!)
        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = currentDayIndex + 1

          // Ensure array is large enough
          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          newDays[targetIndex] = loadResult.schedule!
          return newDays
        })

        // Cache the loaded schedule
        setScheduleCache(prevCache => {
          const newCache = new Map(prevCache)
          newCache.set(nextDayDate, loadResult.schedule!)
          return newCache
        })

        // Navigate to next day
        setCurrentDayIndex(prevIndex => prevIndex + 1)

        return
      }

      // Step 3: No existing schedule found - check if past or future
      if (isDateInPast(nextDayDate)) {
        console.log('Next day is in the past and no schedule exists, showing empty state')

        // Show empty state for past dates
        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = currentDayIndex + 1

          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          newDays[targetIndex] = []
          return newDays
        })

        // Navigate to next day
        setCurrentDayIndex(prevIndex => prevIndex + 1)
        return
      }

      // Step 4: Future date with no existing schedule - centralize to backend autogeneration
      console.log('Next day is in the future and no schedule exists, autogenerating via backend')

      const auto = await autogenerateTodaySchedule(nextDayDate)
      if (auto.success && (auto.created || auto.existed) && Array.isArray(auto.schedule)) {
        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = currentDayIndex + 1
          while (newDays.length <= targetIndex) newDays.push([])
          newDays[targetIndex] = auto.schedule!
          return newDays
        })
        setScheduleCache(prev => {
          const map = new Map(prev)
          map.set(nextDayDate, auto.schedule!)
          return map
        })
      } else {
        throw new Error(auto.error || 'Autogenerate failed')
      }
    } catch (error) {
      console.error('Error in handleNextDay:', error)

      // Fallback: show empty schedule for future date if autogenerate failed
      if (!isDateInPast(nextDayDate)) {
        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = currentDayIndex + 1
          while (newDays.length <= targetIndex) newDays.push([])
          newDays[targetIndex] = []
          return newDays
        })
      } else {
        // For past dates, just show empty array
        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = currentDayIndex + 1

          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          newDays[targetIndex] = []
          return newDays
        })
      }
    }

    // Navigate to next day regardless of success/failure
    setCurrentDayIndex(prevIndex => prevIndex + 1)
  }, [currentDayIndex, filterTasksForNextDay, scheduleCache, toast, isDateInPast])

  /**
   * Navigate to a specific date selected from calendar
   * @param selectedDate - Date selected from calendar dropdown
   */
  const handleNavigateToDate = useCallback(async (selectedDate: Date) => {
    try {
      // Calculate the day offset from today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      selectedDate.setHours(0, 0, 0, 0)

      const timeDiff = selectedDate.getTime() - today.getTime()
      const dayOffset = Math.round(timeDiff / (1000 * 60 * 60 * 24))

      console.log(`Navigating to ${formatDateToString(selectedDate)}, offset: ${dayOffset}`)

      const targetDateStr = formatDateToString(selectedDate)

      // Check cache first
      if (scheduleCache.has(targetDateStr)) {
        console.log('Found existing schedule in cache, loading it')

        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = Math.abs(dayOffset)

          // Ensure array is large enough
          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          newDays[targetIndex] = scheduleCache.get(targetDateStr)!
          return newDays
        })

        setCurrentDayIndex(dayOffset)
        return
      }

      // Load schedule from backend
      const loadResult = await loadSchedule(targetDateStr)

      if (loadResult.success) {
        const targetSchedule = loadResult.schedule || []

        setScheduleDays(prevDays => {
          const newDays = [...prevDays]
          const targetIndex = Math.abs(dayOffset)

          // Ensure array is large enough
          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          newDays[targetIndex] = targetSchedule
          return newDays
        })

        // Cache the loaded schedule
        setScheduleCache(prevCache =>
          new Map(prevCache).set(targetDateStr, targetSchedule)
        )

        setCurrentDayIndex(dayOffset)

      } else {
        throw new Error(loadResult.error || 'Failed to load schedule')
      }
    } catch (error) {
      console.error('Error navigating to date:', error)
      toast({
        title: 'Error',
        description: 'Failed to navigate to selected date.',
        variant: 'destructive'
      })
    }
  }, [scheduleCache, toast])

  const handlePreviousDay = useCallback(async () => {
    const previousDayOffset = currentDayIndex - 1

    // Check if the previous day is before the user's account creation date
    if (isDateBeforeUserCreation(previousDayOffset)) {
      toast({
        title: 'Navigation Limit',
        description: 'Cannot navigate to dates before your account was created.'
      })
      return
    }

    const previousDayDate = getDateString(previousDayOffset)

    // Check if previous day schedule is in cache
    if (scheduleCache.has(previousDayDate)) {
      const cachedSchedule = scheduleCache.get(previousDayDate)!

      // Update UI to show cached previous day schedule
      setScheduleDays(prevDays => {
        const newDays = [...prevDays]

        // Calculate target index where render logic expects to find the data
        const targetIndex = Math.abs(currentDayIndex - 1)

        // Ensure array is large enough to accommodate the target index
        while (newDays.length <= targetIndex) {
          newDays.push([])
        }

        // Place cached schedule at the correct index for render logic
        newDays[targetIndex] = cachedSchedule

        return newDays
      })

      setCurrentDayIndex(prevIndex => prevIndex - 1)
      return
    }

    try {
      // Load previous day schedule from backend
      const result = await loadSchedule(previousDayDate)

      // Handle both successful results with schedules and empty schedules
      if (result.success) {
        const previousDaySchedule = result.schedule || []

        // Update schedule state
        setScheduleDays(prevDays => {
          const newDays = [...prevDays]

          // Calculate target index where render logic expects to find the data
          const targetIndex = Math.abs(currentDayIndex - 1)

          // Ensure array is large enough to accommodate the target index
          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          // Place previous day schedule at the correct index for render logic
          newDays[targetIndex] = previousDaySchedule

          return newDays
        })

        // Cache the loaded schedule (even if empty)
        setScheduleCache(prevCache =>
          new Map(prevCache).set(previousDayDate, previousDaySchedule)
        )

        setCurrentDayIndex(prevIndex => prevIndex - 1)
      } else {
        // Failed to load - show empty schedule anyway to allow navigation
        const emptySchedule: Task[] = []

        setScheduleDays(prevDays => {
          const newDays = [...prevDays]

          // Calculate target index where render logic expects to find the data
          const targetIndex = Math.abs(currentDayIndex - 1)

          // Ensure array is large enough to accommodate the target index
          while (newDays.length <= targetIndex) {
            newDays.push([])
          }

          // Place empty schedule at the correct index for render logic
          newDays[targetIndex] = emptySchedule

          return newDays
        })

        // Cache the empty schedule
        setScheduleCache(prevCache =>
          new Map(prevCache).set(previousDayDate, emptySchedule)
        )

        setCurrentDayIndex(prevIndex => prevIndex - 1)
      }
    } catch (error) {
      console.error('Error loading previous day:', error)

      // Even on error, allow navigation with empty schedule
      const emptySchedule: Task[] = []

      setScheduleDays(prevDays => {
        const newDays = [...prevDays]

        // Calculate target index where render logic expects to find the data
        const targetIndex = Math.abs(currentDayIndex - 1)

        // Ensure array is large enough to accommodate the target index
        while (newDays.length <= targetIndex) {
          newDays.push([])
        }

        // Place empty schedule at the correct index for render logic
        newDays[targetIndex] = emptySchedule

        return newDays
      })

      setScheduleCache(prevCache =>
        new Map(prevCache).set(previousDayDate, emptySchedule)
      )

      setCurrentDayIndex(prevIndex => prevIndex - 1)

      toast({
        title: 'Previous Day',
        description: 'Unable to load schedule data, showing empty schedule.',
        variant: 'destructive'
      })
    }
  }, [currentDayIndex, scheduleCache, toast, isDateBeforeUserCreation])

  const handleRequestSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true)

    try {
      const currentDate = getDateString(currentDayIndex)

      const response: GetAISuggestionsResponse = await fetchAISuggestions(
        state.name,
        currentDate,
        scheduleDays[currentDayIndex] || [],
        scheduleDays.slice(Math.max(0, currentDayIndex - 14), currentDayIndex),
        state.priorities || {},
        state.energy_patterns || []
      )

      const newSuggestions = response.suggestions.filter(
        suggestion => !shownSuggestionIds.has(suggestion.id)
      )

      newSuggestions.forEach(suggestion => {
        shownSuggestionIds.add(suggestion.id)
      })

      setSuggestions(newSuggestions)
    } catch (error) {
      console.error('Error requesting suggestions:', error)
      toast({
        title: 'Error',
        description: error instanceof Error
          ? error.message
          : 'Failed to get AI suggestions. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [
    currentDayIndex,
    scheduleDays,
    state.name,
    state.priorities,
    state.energy_patterns,
    shownSuggestionIds,
    toast
  ])

  const findRelevantTaskForSuggestion = useCallback((
    suggestion: AISuggestion,
    schedule: Task[]
  ): string => {
    const categoryMatch = schedule.find(task =>
      task.categories?.some(category =>
        suggestion.categories.includes(category)
      )
    )
    if (categoryMatch) return categoryMatch.id

    switch (suggestion.type) {
      case 'Energy Optimization':
        return schedule[0]?.id || 'schedule-start'
      case 'Priority Rebalancing':
        const priorityTask = schedule.find(task =>
          task.categories?.includes('high-priority')
        )
        return priorityTask?.id || 'schedule-start'
      default:
        return 'schedule-start'
    }
  }, [])

  useEffect(() => {
    if (suggestions.length === 0) return

    const currentSchedule = scheduleDays[currentDayIndex]
    if (!currentSchedule) return

    const newSuggestionsMap = new Map<string, AISuggestion[]>()

    suggestions.forEach(suggestion => {
      const relevantTaskId = findRelevantTaskForSuggestion(suggestion, currentSchedule)

      if (!newSuggestionsMap.has(relevantTaskId)) {
        newSuggestionsMap.set(relevantTaskId, [])
      }
      newSuggestionsMap.get(relevantTaskId)!.push(suggestion)
    })

    setSuggestionsMap(newSuggestionsMap)
  }, [suggestions, currentDayIndex, scheduleDays, findRelevantTaskForSuggestion])

  const findTargetIndexForSuggestion = useCallback((
    suggestion: AISuggestion,
    schedule: Task[]
  ): number => {
    const categoryMatchIndex = schedule.findIndex(task =>
      task.categories?.some(category =>
        suggestion.categories.includes(category)
      )
    )

    if (categoryMatchIndex !== -1) {
      return categoryMatchIndex + 1
    }

    switch (suggestion.type) {
      case 'Energy Optimization':
        return 0
      case 'Priority Rebalancing':
        const priorityIndex = schedule.findIndex(task =>
          task.categories?.includes('high-priority')
        )
        return priorityIndex !== -1 ? priorityIndex : 0
      case 'Time Management':
        return Math.floor(schedule.length / 2)
      case 'Task Structure':
        const structureIndex = schedule.findIndex(task =>
          task.text.toLowerCase().includes(suggestion.text.toLowerCase())
        )
        return structureIndex !== -1 ? structureIndex + 1 : schedule.length
      default:
        return schedule.length
    }
  }, [])

  const handleAcceptSuggestion = useCallback(async (suggestion: AISuggestion) => {
    try {
      const newTask: Task = {
        id: uuidv4(),
        text: suggestion.text,
        categories: suggestion.categories,
        is_subtask: false,
        completed: false,
        is_section: false,
        section: null,
        parent_id: null,
        level: 0,
        section_index: 0,
        type: 'task',
        start_time: null,
        end_time: null,
        is_recurring: null,
        start_date: getDateString(currentDayIndex)
      }

      const updatedSchedule = [...scheduleDays[currentDayIndex]]
      const targetIndex = findTargetIndexForSuggestion(suggestion, updatedSchedule)

      if (targetIndex > 0) {
        const prevTask = updatedSchedule[targetIndex - 1]
        newTask.section = prevTask.section
      }

      updatedSchedule.splice(targetIndex, 0, newTask)

      let sectionStartIndex = 0
      updatedSchedule.forEach((task, index) => {
        if (task.is_section) {
          sectionStartIndex = index
        }
        if (!task.is_section) {
          task.section_index = index - sectionStartIndex
        }
      })

      setScheduleDays(prev => {
        const newDays = [...prev]
        const dayIndex = Math.abs(currentDayIndex)
        newDays[dayIndex] = updatedSchedule
        return newDays
      })

      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
      setSuggestionsMap(prev => {
        const newMap = new Map(prev)
        Array.from(newMap.entries()).forEach(([taskId, suggestions]) => {
          newMap.set(
            taskId,
            suggestions.filter(s => s.id !== suggestion.id)
          )
        })
        return newMap
      })

      await updateSchedule(
        getDateString(currentDayIndex),
        updatedSchedule
      )

      toast({
        title: 'Success',
        description: 'Suggestion added to schedule'
      })
    } catch (error) {
      console.error('Error accepting suggestion:', error)
      toast({
        title: 'Error',
        description: 'Failed to add suggestion to schedule',
        variant: 'destructive'
      })
    }
  }, [currentDayIndex, scheduleDays, toast, findTargetIndexForSuggestion])

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    setSuggestionsMap(prev => {
      const newMap = new Map(prev)
      Array.from(newMap.entries()).forEach(([taskId, suggestions]) => {
        newMap.set(
          taskId,
          suggestions.filter(s => s.id !== suggestionId)
        )
      })
      return newMap
    })
  }, [])

  // Separate useEffect to detect calendar connection completion
  const prevCalendarStageRef = useRef(calendarConnectionStage)
  useEffect(() => {
    // Reset hasInitiallyLoaded when calendarConnectionStage changes from truthy to null
    // This allows schedule to reload with calendar events after connection completes
    if (prevCalendarStageRef.current && !calendarConnectionStage) {
      hasInitiallyLoaded.current = false
    }
    prevCalendarStageRef.current = calendarConnectionStage
  }, [calendarConnectionStage])

  useEffect(() => {
    // Prevent duplicate loads in React Strict Mode
    if (hasInitiallyLoaded.current) return

    const loadInitialSchedule = async () => {
      // Set flag immediately to prevent race conditions in React Strict Mode
      hasInitiallyLoaded.current = true
      setIsLoadingSchedule(true)

      const today = getDateString(0)

      try {
        // 1) Try loading existing schedule
        const existingSchedule = await loadSchedule(today)
        if (existingSchedule.success && existingSchedule.schedule) {
          setScheduleDays([existingSchedule.schedule])
          setScheduleCache(new Map([[today, existingSchedule.schedule]]))
          setIsLoadingSchedule(false)
          return
        }

        // 2) No existing schedule → trigger backend autogeneration with 10s timeout and single retry
        let timeoutReached = false
        const timeoutId = setTimeout(() => {
          timeoutReached = true
          setIsLoadingSchedule(false) // stop skeleton after 10s
        }, 10000)

        // First attempt
        const auto1 = await autogenerateTodaySchedule(today)
        if (auto1.success) {
          if (auto1.sourceFound === false) {
            // Immediate empty state when no source schedule exists
            clearTimeout(timeoutId)
            setIsLoadingSchedule(false)
            setScheduleDays([[]])
            return
          }

          if ((auto1.created || auto1.existed) && Array.isArray(auto1.schedule)) {
            clearTimeout(timeoutId)
            setScheduleDays([auto1.schedule])
            setScheduleCache(new Map([[today, auto1.schedule]]))
            setIsLoadingSchedule(false)
            return
          }
        } else {
          // First failure → show toast immediately and retry once
          toast({
            title: 'Autogenerate failed',
            description: auto1.error || 'Failed to autogenerate schedule',
            variant: 'destructive'
          })

          autogenerateTodaySchedule(today)
            .then((auto2) => {
              clearTimeout(timeoutId)
              if (auto2.success && (auto2.created || auto2.existed) && Array.isArray(auto2.schedule)) {
                setScheduleDays([auto2.schedule])
                setScheduleCache(prev => new Map(prev).set(today, auto2.schedule!))
                if (timeoutReached) {
                  toast({
                    title: 'Schedule ready',
                    description: 'Your schedule has been created',
                    variant: 'default'
                  })
                }
                setIsLoadingSchedule(false)
              } else {
                // Retry failed → show empty state + toast (already shown above)
                setIsLoadingSchedule(false)
                setScheduleDays([[]])
              }
            })
            .catch(() => {
              clearTimeout(timeoutId)
              setIsLoadingSchedule(false)
              setScheduleDays([[]])
            })

          // Keep skeleton until timeout or until retry resolves
          return
        }

        // If reached here without success, end loading and show empty
        clearTimeout(timeoutId)
        setIsLoadingSchedule(false)
        setScheduleDays([[]])
      } catch (error) {
        console.error('Error loading initial schedule:', error)
        setIsLoadingSchedule(false)
        setScheduleDays([[]])
      }
    }

    if (!state.formUpdate?.response && !hasInitiallyLoaded.current && !calendarConnectionStage) {
      loadInitialSchedule()
    }
  }, [state.formUpdate?.response, toast, calendarConnectionStage])

  // Midnight auto-refresh (local timezone)
  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const delay = midnight.getTime() - now.getTime()
    const timer = setTimeout(() => {
      try { window.location.reload() } catch (_) {}
    }, Math.max(0, delay))
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  useEffect(() => {
    let es: EventSource | null = null

    const connect = async () => {
      try {
        if (!currentUser) return
        const token = await currentUser.getIdToken()
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

        es = new EventSource(`${apiBase}/api/events/stream?token=${encodeURIComponent(token)}`)

        es.onmessage = async (ev) => {
          try {
            const payload = JSON.parse(ev.data)
            if (payload?.type === 'schedule_updated') {
              const eventDate = payload.date as string
              const currentDateStr = getDateString(currentDayIndex)
              if (eventDate === currentDateStr) {
                const res = await loadSchedule(currentDateStr)
                if (res.success && res.schedule) {
                  setScheduleDays(prev => {
                    const newDays = [...prev]
                    const dayIndex = Math.abs(currentDayIndex)
                    newDays[dayIndex] = res.schedule!
                    return newDays
                  })
                  setScheduleCache(prev => {
                    const newCache = new Map(prev)
                    newCache.set(currentDateStr, res.schedule!)
                    return newCache
                  })
                }
              }
            }
          } catch (_) {
            // ignore malformed messages
          }
        }

        es.onerror = () => {
          // allow native reconnection
        }
      } catch (e) {
        console.error('SSE connection error:', e)
      }
    }

    connect()

    return () => {
      if (es) es.close()
    }
  }, [currentDayIndex, currentUser?.uid])

  // Show calendar connection loader during OAuth flow
  if (calendarConnectionStage) {
    return <CalendarConnectionLoader stage={calendarConnectionStage} />
  }

  return (
    <SidebarLayout>
      <div className="flex flex-col mobile-viewport-height bg-background">

        <DashboardHeader
          onNextDay={handleNextDay}
          onPreviousDay={handlePreviousDay}
          onNavigateToDate={handleNavigateToDate}
          currentDate={currentDate}
          isCurrentDay={false}
          onAddTask={() => { setIsTaskDrawerOpen(true) }}
          showSidebarTrigger={true}
        />

        <div className="flex-1 overflow-y-auto mt-4 sm:mt-8 mobile-scroll">
          <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pb-6 mobile-padding-safe">

            {isLoadingSchedule
              ? (
              <div className="space-y-4" data-testid="dashboard-skeleton">
                <Skeleton className="h-6 w-1/3" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  {[...Array(6)].map((_, idx) => (
                    <Skeleton key={idx} className="h-10 w-full" />
                  ))}
                </div>
              </div>
                )
              : scheduleDays.length > 0 && scheduleDays[Math.abs(currentDayIndex)]?.length > 0
                ? (
              <>
                <EditableSchedule
                  tasks={scheduleDays[Math.abs(currentDayIndex)] || []}
                  onUpdateTask={handleScheduleTaskUpdate}
                  onReorderTasks={handleReorderTasks}
                  onRequestSuggestions={handleRequestSuggestions}
                  isLoadingSuggestions={isLoadingSuggestions}
                  suggestionsMap={suggestionsMap}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onArchiveTask={handleArchiveTask}
                />

                {isLoadingSuggestions && (
                  <div className="loading-container-sm mt-4">
                    <Loader2 className="loading-spinner-sm" />
                    <span className="loading-text">
                      Generating suggestions...
                    </span>
                  </div>
                )}
              </>
                  )
                : (
              <div className="empty-state-container">
                <p className="text-lg text-foreground">
                  {state.response
                    ? 'Processing your schedule...'
                    : 'No schedule found for selected date'
                  }
                </p>
              </div>
                  )}
          </div>
        </div>

        {isMobile && (
          <FloatingActionButton onClick={() => { setIsTaskDrawerOpen(true) }} />
        )}

        <TaskEditDrawer
          isOpen={isTaskDrawerOpen}
          onClose={() => { setIsTaskDrawerOpen(false) }}
          onCreateTask={addTask}
          currentDate={getDateString(currentDayIndex)}
        />

        <TaskEditDrawer
          isOpen={isEditDrawerOpen}
          onClose={handleEditDrawerClose}
          task={editingTask}
          onUpdateTask={handleScheduleTaskUpdate}
          currentDate={getDateString(currentDayIndex)}
        />
      </div>
    </SidebarLayout>
  )
}

export default Dashboard
