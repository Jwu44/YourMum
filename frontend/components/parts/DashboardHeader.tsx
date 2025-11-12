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
import { getAvailableDates } from '@/lib/ScheduleHelper'
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
  scheduleVersion?: number // Increment this to trigger available dates refresh
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
  isLoading = false,
  scheduleVersion = 0
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
   * Performance optimized with bulk endpoint and caching
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

      // Use bulk endpoint to check future dates (next 30 days) for existing schedules
      // Single API call replaces 30 parallel requests - major performance improvement
      const futureStartDate = new Date(today)
      futureStartDate.setDate(today.getDate() + 1)
      const futureEndDate = new Date(today)
      futureEndDate.setDate(today.getDate() + 30)

      const result = await getAvailableDates(
        formatDateToString(futureStartDate),
        formatDateToString(futureEndDate)
      )

      if (result.success && result.available_dates) {
        result.available_dates.forEach(date => availableDatesSet.add(date))
      }

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
      if (datesCache.current.userCreationDate) {
        const today = new Date()
        const fallbackDates = new Set<string>()
        const currentDate = new Date(datesCache.current.userCreationDate)

        while (currentDate <= today) {
          fallbackDates.add(formatDateToString(currentDate))
          currentDate.setDate(currentDate.getDate() + 1)
        }

        setAvailableDates(fallbackDates)
      }
    }
  }, []) // No dependencies - stable function

  /**
   * Check if a date is available for selection
   * Logic: Allow all past/present dates, only allow future dates with existing schedules
   * @param date - Date to check
   */
  const isDateAvailable = useCallback((date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    // Allow all dates up to and including today
    if (checkDate <= today) {
      // Optionally: could add user creation date check here if needed
      return true
    }

    // For future dates, only allow if schedule exists
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
   * Preload available dates on component mount for instant calendar opening
   * This eliminates the 3-second delay by loading dates in the background
   */
  useEffect(() => {
    loadAvailableDates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  /**
   * Invalidate cache and reload when schedules change
   * This ensures newly created future schedules appear in the calendar
   */
  useEffect(() => {
    if (scheduleVersion > 0) {
      // Clear cache to force fresh load
      datesCache.current = {
        userCreationDate: null,
        availableDates: new Set(),
        lastUpdated: 0
      }
      // Reload available dates
      loadAvailableDates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleVersion]) // Only trigger on version change, loadAvailableDates is stable

  /**
   * Load available dates when calendar is first opened (fallback)
   */
  useEffect(() => {
    if (isCalendarOpen && availableDates.size === 0) {
      loadAvailableDates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalendarOpen, availableDates.size]) // loadAvailableDates is stable

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 mb-3 sm:mb-4">
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
