import React, { useCallback, useState, useEffect, useRef } from 'react';
import { format as dateFormat } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

// Custom Components
import { TypographyH3 } from '@/app/fonts/text';

// API and Helpers
import { userApi } from '@/lib/api/users';
import { loadSchedule } from '@/lib/ScheduleHelper';
import { formatDateToString } from '@/lib/helper';

interface DashboardHeaderProps {
    onNextDay: () => void;
    onPreviousDay: () => void;
    onNavigateToDate?: (date: Date) => void;
    currentDate: Date | undefined;
    isCurrentDay: boolean;
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
    isCurrentDay
  }) => {

  // State for calendar dropdown
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // State for date range management
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [userCreationDate, setUserCreationDate] = useState<Date | null>(null);
  
  // Cache reference to avoid repeated API calls
  const datesCache = useRef<{
    userCreationDate: Date | null;
    availableDates: Set<string>;
    lastUpdated: number;
  }>({
    userCreationDate: null,
    availableDates: new Set(),
    lastUpdated: 0
  });

  /**
   * Memoized date formatting to prevent unnecessary recalculations
   * @returns Formatted date string or error fallback
   */
  const formattedDate = useCallback(() => {
    try {
      if (!currentDate) return 'Invalid Date';
      return dateFormat(currentDate, 'EEE, d MMM');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }, [currentDate]);

  /**
   * Get available dates for the calendar
   * Performance optimized with caching and reasonable date range limits
   */
  const loadAvailableDates = useCallback(async () => {
    // Check cache first (valid for 5 minutes)
    const now = Date.now();
    const cacheValidTime = 5 * 60 * 1000; // 5 minutes
    
    if (datesCache.current.lastUpdated && 
        (now - datesCache.current.lastUpdated) < cacheValidTime &&
        datesCache.current.userCreationDate) {
      setUserCreationDate(datesCache.current.userCreationDate);
      setAvailableDates(datesCache.current.availableDates);
      return;
    }
    
    try {
      // Get user creation date
      const creationDate = await userApi.getUserCreationDate();
      setUserCreationDate(creationDate);
      
      const today = new Date();
      const availableDatesSet = new Set<string>();
      
      // Add all dates from user creation to today (always available)
      const currentDate = new Date(creationDate);
      while (currentDate <= today) {
        availableDatesSet.add(formatDateToString(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Check future dates (next 30 days) for existing schedules
      // Performance optimization: limit range to reasonable bounds
      const checkPromises: Promise<any>[] = [];
      for (let i = 1; i <= 30; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        const dateStr = formatDateToString(futureDate);
        
        checkPromises.push(
          loadSchedule(dateStr).then(result => ({
            date: dateStr,
            hasSchedule: result.success && result.schedule && result.schedule.length > 0
          }))
        );
      }
      
      // Execute all schedule checks in parallel for performance
      const results = await Promise.allSettled(checkPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.hasSchedule) {
          availableDatesSet.add(result.value.date);
        }
      });
      
      // Update cache and state
      datesCache.current = {
        userCreationDate: creationDate,
        availableDates: availableDatesSet,
        lastUpdated: now
      };
      
      setAvailableDates(availableDatesSet);
      
    } catch (error) {
      console.error('Error loading available dates:', error);
      // Fallback: just allow dates from creation to today
      if (userCreationDate) {
        const today = new Date();
        const fallbackDates = new Set<string>();
        const currentDate = new Date(userCreationDate);
        
        while (currentDate <= today) {
          fallbackDates.add(formatDateToString(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setAvailableDates(fallbackDates);
      }
    } finally {
      // Loading state management removed for simplicity
    }
  }, [userCreationDate]);

  /**
   * Check if a date is available for selection
   * @param date - Date to check
   */
  const isDateAvailable = useCallback((date: Date): boolean => {
    const dateStr = formatDateToString(date);
    return availableDates.has(dateStr);
  }, [availableDates]);

  /**
   * Handle date selection from calendar
   * @param date - Selected date from calendar
   */
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date && isDateAvailable(date)) {
      // Navigate to selected date using parent callback
      if (onNavigateToDate) {
        onNavigateToDate(date);
      }
      setIsCalendarOpen(false);
    }
  }, [isDateAvailable, onNavigateToDate]);

  /**
   * Load available dates when calendar is first opened
   */
  useEffect(() => {
    if (isCalendarOpen && availableDates.size === 0) {
      loadAvailableDates();
    }
  }, [isCalendarOpen, loadAvailableDates, availableDates.size]);

  return (
    <div className="flex justify-between items-center mb-6">
      {/* Left section: Title with navigation and AI Suggestions */}
      <div className="flex items-center gap-4">
        {/* Date display with navigation chevrons */}
        <div className="flex items-center gap-2">
          {/* Calendar navigation dropdown - Positioned before the date */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Open calendar navigation"
                data-testid="calendar-dropdown-trigger"
              >
                <Calendar className="!h-[20px] !w-[20px] text-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0" 
              align="start"
              data-testid="calendar-dropdown"
            >
              {availableDates.size === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading available dates...
                </div>
              ) : (
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
  
          <TypographyH3 className="text-foreground">
            {formattedDate()}
          </TypographyH3>
            <div className="flex items-center gap-1 ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onPreviousDay()}
                      disabled={false}
                      className="h-9 w-9 hover-selection"
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="h-5 w-5 text-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View previous day</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onNextDay()}
                    disabled={isCurrentDay}
                    className="h-9 w-9 hover-selection"
                    aria-label="Next day"
                  >
                    <ChevronRight className="h-5 w-5 text-foreground" />
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View next day</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardHeader);