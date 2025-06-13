import React, { useState, useEffect, useCallback } from 'react';
import { format as dateFormat } from 'date-fns';
import { Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { checkScheduleExists } from '@/lib/helper';

// Custom Components
import { TypographyH3 } from '@/app/fonts/text';

// Types
import { FormData, Priority, Task } from '@/lib/types';

interface DashboardHeaderProps {
    isLoadingSuggestions: boolean;
    onRequestSuggestions: () => Promise<void>;
    onNextDay: () => Promise<void>;
    onPreviousDay: () => void;
    currentDate: Date | undefined;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    isLoadingSuggestions,
    onRequestSuggestions,
    onNextDay,
    onPreviousDay,
    currentDate
  }) => {
    // State to track button disabled states
  const [isPrevDisabled, setIsPrevDisabled] = useState(true);
  const [isNextDisabled, setIsNextDisabled] = useState(false);

  // Memoize the date formatting to prevent unnecessary recalculations
  const formattedDate = useCallback(() => {
    try {
      if (!currentDate) return 'Invalid Date';
      return dateFormat(currentDate, 'EEEE, MMMM d');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }, [currentDate]);

  // Memoized function to check if previous day is available
  const isPreviousDayAvailable = useCallback(async (): Promise<boolean> => {
    if (!currentDate) return false;
    
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if yesterday's schedule exists using helper function
    return await checkScheduleExists(yesterday);
  }, [currentDate]);

  // Memoized function to check if next day is available
  const isNextDayAvailable = useCallback(async (): Promise<boolean> => {
    if (!currentDate) return false;
    
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Allow navigation to next day if it's tomorrow (can generate new schedule)
    const actualTomorrow = new Date();
    actualTomorrow.setDate(actualTomorrow.getDate() + 1);
    
    if (tomorrow.toDateString() === actualTomorrow.toDateString()) {
      return true;
    }
    
    // Check if next day's schedule exists using helper function
    return await checkScheduleExists(tomorrow);
  }, [currentDate]);

  // Effect to update button states
  useEffect(() => {
    const updateNavigationStates = async () => {
      const [prevAvailable, nextAvailable] = await Promise.all([
        isPreviousDayAvailable(),
        isNextDayAvailable()
      ]);
      
      setIsPrevDisabled(!prevAvailable);
      setIsNextDisabled(!nextAvailable);
    };

    updateNavigationStates();
  }, [currentDate, isPreviousDayAvailable, isNextDayAvailable]);

  return (
    <div className="flex justify-between items-center mb-6">
      {/* Left section: Title with navigation and AI Suggestions */}
      <div className="flex items-center gap-4">
        {/* Date display with navigation chevrons */}
        <div className="flex items-center gap-2">
          {/* AI suggestions button - Positioned before the date */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRequestSuggestions}
            disabled={isLoadingSuggestions}
            className="h-9 w-9"
            aria-label="Request AI Suggestions"
          >
            {isLoadingSuggestions ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
          </Button>
  
          <TypographyH3 className="text-foreground">
            {formattedDate()}
          </TypographyH3>
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPreviousDay()}
                disabled={isPrevDisabled}
                className={`h-9 w-9 transition-opacity ${
                  isPrevDisabled ? 'opacity-50' : 'opacity-100 hover:opacity-80'
                }`}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNextDay()}
                disabled={isNextDisabled}
                className={`h-9 w-9 transition-opacity ${
                  isNextDisabled ? 'opacity-50' : 'opacity-100 hover:opacity-80'
                }`}
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5 text-primary" />
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardHeader);