import React, { useCallback, useState, useEffect, useRef } from 'react'
import { format as dateFormat } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { SidebarTrigger } from '@/components/ui/sidebar'

// API and Helpers
import { userApi } from '@/lib/api/users'
import { loadSchedule } from '@/lib/ScheduleHelper'
import { formatDateToString } from '@/lib/helper'

// Hooks
import { useIsMobile } from '@/hooks/use-mobile'

interface DashboardHeaderProps {
  onNextDay: () => void
  onPreviousDay: () => void
  onNavigateToDate?: (date: Date) => void
  currentDate: Date | undefined
  isCurrentDay: boolean
  onAddTask?: () => void
  showSidebarTrigger?: boolean
  isLoading?: boolean
}

/**
 * DashboardHeader component provides navigation controls and AI suggestions for the dashboard
 * Navigation buttons are always enabled to avoid unnecessary API calls for schedule checking
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onNextDay,
  onPreviousDay,
  onNavigateToDate,
  currentDate,
  isCurrentDay,
  onAddTask,
  showSidebarTrigger = false,
  isLoading = false
}) => {
  // Mobile detection hook
  const isMobile = useIsMobile()

  // State for calendar dropdown
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // State for date range management
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [userCreationDate, setUserCreationDate] = useState<Date | null>(null)

  // Cache reference to avoid repeated API calls
  const datesCache = useRef<{
    userCreationDate: Date | null
    availableDates: Set<string>
    lastUpdated: number
  }>({
    userCreationDate: null,
    availableDates: new Set(),
    lastUpdated: 0
  })

  /**
   * Memoized date formatting to prevent unnecessary recalculations
   * @returns Formatted date string or error fallback
   */
  const formattedDate = useCallback(() => {
    try {
      if (!currentDate) return 'Invalid Date'
      return dateFormat(currentDate, 'EEE, d MMM')
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid Date'
    }
  }, [currentDate])

  /**
   * Get available dates for the calendar
   * Performance optimized with caching and reasonable date range limits
   */
  const loadAvailableDates = useCallback(async () => {
    // Check cache first (valid for 5 minutes)
    const now = Date.now()
    const cacheValidTime = 5 * 60 * 1000 // 5 minutes

    if (datesCache.current.lastUpdated &&
        (now - datesCache.current.lastUpdated) < cacheValidTime &&
        datesCache.current.userCreationDate) {
      setUserCreationDate(datesCache.current.userCreationDate)
      setAvailableDates(datesCache.current.availableDates)
      return
    }

    try {
      // Get user creation date
      const creationDate = await userApi.getUserCreationDate()
      setUserCreationDate(creationDate)

      const today = new Date()
      const availableDatesSet = new Set<string>()

      // Add all dates from user creation to today (always available)
      const currentDate = new Date(creationDate)
      while (currentDate <= today) {
        availableDatesSet.add(formatDateToString(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Check future dates (next 30 days) for existing schedules
      // Performance optimization: limit range to reasonable bounds
      const checkPromises: Array<Promise<any>> = []
      for (let i = 1; i <= 30; i++) {
        const futureDate = new Date(today)
        futureDate.setDate(today.getDate() + i)
        const dateStr = formatDateToString(futureDate)

        checkPromises.push(
          loadSchedule(dateStr).then(result => ({
            date: dateStr,
            hasSchedule: result.success && result.schedule && result.schedule.length > 0
          }))
        )
      }

      // Execute all schedule checks in parallel for performance
      const results = await Promise.allSettled(checkPromises)

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.hasSchedule) {
          availableDatesSet.add(result.value.date)
        }
      })

      // Update cache and state
      datesCache.current = {
        userCreationDate: creationDate,
        availableDates: availableDatesSet,
        lastUpdated: now
      }

      setAvailableDates(availableDatesSet)
    } catch (error) {
      console.error('Error loading available dates:', error)
      // Fallback: just allow dates from creation to today
      if (userCreationDate) {
        const today = new Date()
        const fallbackDates = new Set<string>()
        const currentDate = new Date(userCreationDate)

        while (currentDate <= today) {
          fallbackDates.add(formatDateToString(currentDate))
          currentDate.setDate(currentDate.getDate() + 1)
        }

        setAvailableDates(fallbackDates)
      }
    } finally {
      // Loading state management removed for simplicity
    }
  }, [userCreationDate])

  /**
   * Check if a date is available for selection
   * @param date - Date to check
   */
  const isDateAvailable = useCallback((date: Date): boolean => {
    const dateStr = formatDateToString(date)
    return availableDates.has(dateStr)
  }, [availableDates])

  /**
   * Handle date selection from calendar
   * @param date - Selected date from calendar
   */
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date && isDateAvailable(date)) {
      // Navigate to selected date using parent callback
      if (onNavigateToDate) {
        onNavigateToDate(date)
      }
      setIsCalendarOpen(false)
    }
  }, [isDateAvailable, onNavigateToDate])

  /**
   * Load available dates when calendar is first opened
   */
  useEffect(() => {
    if (isCalendarOpen && availableDates.size === 0) {
      loadAvailableDates()
    }
  }, [isCalendarOpen, loadAvailableDates, availableDates.size])

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6">
      {isMobile ? (
        /* Mobile: Three-section layout with even spacing */
        <div className="flex items-center justify-between gap-2">
          {/* Left section: Sidebar trigger */}
          <div className="flex items-center gap-2 flex-shrink-0 w-12">
            {showSidebarTrigger && (
              <>
                <SidebarTrigger className="-ml-1 h-11 w-11 p-2 [&>svg]:!w-5 [&>svg]:!h-5" />
                <div className="h-4 w-px bg-sidebar-border" />
              </>
            )}
          </div>

          {/* Center section: Date navigation */}
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onPreviousDay() }}
                    disabled={isLoading}
                    className={`h-11 w-11 p-0 transition-colors duration-200 ${
                      isLoading 
                        ? 'text-muted-foreground/50 cursor-not-allowed' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label="Previous day"
                    aria-disabled={isLoading}
                  >
                    <ChevronLeft size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View previous day</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <h1 className="text-lg font-semibold text-foreground truncate">
              {formattedDate()}
            </h1>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onNextDay() }}
                    disabled={isLoading || isCurrentDay}
                    className={`h-11 w-11 p-0 transition-colors duration-200 ${
                      isLoading || isCurrentDay
                        ? 'text-muted-foreground/50 cursor-not-allowed' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label="Next day"
                    aria-disabled={isLoading || isCurrentDay}
                  >
                    <ChevronRight size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View next day</p>
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>

          {/* Right section: Calendar */}
          <div className="flex items-center gap-2 flex-shrink-0 w-12 justify-end">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className={`h-11 w-11 p-0 transition-colors duration-200 ${
                    isLoading 
                      ? 'text-muted-foreground/50 cursor-not-allowed' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="Open calendar navigation"
                  aria-disabled={isLoading}
                  data-testid="calendar-dropdown-trigger"
                >
                  <Calendar className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="center"
                data-testid="calendar-dropdown"
              >
                {availableDates.size === 0
                  ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading available dates...
                  </div>
                    )
                  : (
                  <CalendarComponent
                    mode="single"
                    selected={currentDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => !isDateAvailable(date)}
                    initialFocus
                  />
                    )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ) : (
        /* Desktop: Previous implementation with calendar on left side */
        <div className="flex items-center justify-between">
          {/* Left-aligned section with date navigation and calendar */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Calendar navigation dropdown */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className={`h-8 w-8 p-0 transition-colors duration-200 ${
                    isLoading 
                      ? 'text-muted-foreground/50 cursor-not-allowed' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="Open calendar navigation"
                  aria-disabled={isLoading}
                  data-testid="calendar-dropdown-trigger"
                >
                  <Calendar className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start"
                data-testid="calendar-dropdown"
              >
                {availableDates.size === 0
                  ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading available dates...
                  </div>
                    )
                  : (
                  <CalendarComponent
                    mode="single"
                    selected={currentDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => !isDateAvailable(date)}
                    initialFocus
                  />
                    )}
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-3 min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { onPreviousDay() }}
                      disabled={isLoading}
                      className={`h-8 w-8 p-0 transition-colors duration-200 ${
                        isLoading 
                          ? 'text-muted-foreground/50 cursor-not-allowed' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label="Previous day"
                      aria-disabled={isLoading}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View previous day</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <h1 className="text-xl font-semibold text-foreground truncate">
                {formattedDate()}
              </h1>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { onNextDay() }}
                      disabled={isLoading || isCurrentDay}
                      className={`h-8 w-8 p-0 transition-colors duration-200 ${
                        isLoading || isCurrentDay
                          ? 'text-muted-foreground/50 cursor-not-allowed' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label="Next day"
                      aria-disabled={isLoading || isCurrentDay}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View next day</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Create Task button - desktop only since mobile uses FAB */}
          {onAddTask && (
            <div className="flex-shrink-0 ml-2">
              <Button
                size="sm"
                onClick={onAddTask}
                disabled={isLoading}
                className={`gap-2 px-4 shadow-soft transition-all duration-200 ${
                  isLoading 
                    ? 'bg-muted text-muted-foreground/50 cursor-not-allowed shadow-none' 
                    : 'gradient-accent hover:opacity-90 text-primary-foreground hover:shadow-card hover:scale-105'
                }`}
                aria-disabled={isLoading}
                data-testid="create-task-button"
              >
                <Plus size={16} />
                Create Task
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(DashboardHeader)
