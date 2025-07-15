import React, { useCallback } from 'react';
import { format as dateFormat } from 'date-fns';
import { Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Custom Components
import { TypographyH3 } from '@/app/fonts/text';

interface DashboardHeaderProps {
    isLoadingSuggestions: boolean;
    onRequestSuggestions: () => Promise<void>;
    onNextDay: () => Promise<void>;
    onPreviousDay: () => void;
    currentDate: Date | undefined;
    isPreviousDayAvailable: boolean;
    isCurrentDay: boolean;
}

/**
 * DashboardHeader component provides navigation controls and AI suggestions for the dashboard
 * Navigation buttons are always enabled to avoid unnecessary API calls for schedule checking
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    isLoadingSuggestions,
    onRequestSuggestions,
    onNextDay,
    onPreviousDay,
    currentDate,
    isPreviousDayAvailable,
    isCurrentDay
  }) => {

  /**
   * Memoized date formatting to prevent unnecessary recalculations
   * @returns Formatted date string or error fallback
   */
  const formattedDate = useCallback(() => {
    try {
      if (!currentDate) return 'Invalid Date';
      return dateFormat(currentDate, 'EEEE, MMMM d');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }, [currentDate]);

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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onPreviousDay()}
                      disabled={!isPreviousDayAvailable}
                      className="h-9 w-9 transition-opacity opacity-100 hover:opacity-80"
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="h-5 w-5 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View previous day</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNextDay()}
                disabled={isCurrentDay}
                className="h-9 w-9 transition-opacity opacity-100 hover:opacity-80"
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