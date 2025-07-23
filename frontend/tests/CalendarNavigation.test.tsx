import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import DashboardHeader from '@/components/parts/DashboardHeader';
import { userApi } from '@/lib/api/users';
import { loadSchedule } from '@/lib/ScheduleHelper';

// Mock the dependencies
jest.mock('@/lib/api/users');
jest.mock('@/lib/ScheduleHelper');
jest.mock('@/auth/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' }
  }
}));

const mockUserApi = userApi as jest.Mocked<typeof userApi>;
const mockLoadSchedule = loadSchedule as jest.MockedFunction<typeof loadSchedule>;

describe('Calendar Navigation Dropdown', () => {
  const mockProps = {
    isLoadingSuggestions: false,
    onRequestSuggestions: jest.fn(async () => {}),
    onNextDay: jest.fn(),
    onPreviousDay: jest.fn(),
    currentDate: new Date('2024-07-23'),
    isCurrentDay: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock user creation date
    mockUserApi.getUserCreationDate.mockResolvedValue(new Date('2024-07-02'));
  });

  describe('Calendar Icon Display', () => {
    it('should display calendar icon instead of sparkle icon', () => {
      render(<DashboardHeader {...mockProps} />);
      
      // Should have calendar icon
      expect(screen.getByTestId('calendar-dropdown-trigger')).toBeInTheDocument();
      
      // Should not have sparkle icon
      expect(screen.queryByLabelText('Request AI Suggestions')).not.toBeInTheDocument();
    });

    it('should show calendar icon as clickable button', () => {
      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      expect(calendarButton).toBeEnabled();
      expect(calendarButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Calendar Dropdown Behavior', () => {
    it('should open calendar dropdown when calendar icon is clicked', async () => {
      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
    });

    it('should close calendar dropdown when clicking outside', async () => {
      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // Click outside
      fireEvent.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByTestId('calendar-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('Available Date Range Logic', () => {
    it('should allow clicking on dates from user creation date to today', async () => {
      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // Dates from July 2-23 should be clickable
      const july15 = screen.getByRole('button', { name: /15/ });
      expect(july15).not.toHaveAttribute('disabled');
    });

    it('should disable dates before user creation date', async () => {
      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // July 1st should be disabled (before user creation date of July 2)
      const july1 = screen.getByRole('button', { name: /1/ });
      expect(july1).toHaveAttribute('disabled');
    });

    it('should disable future dates without existing schedules', async () => {
      // Mock that July 24 has no schedule
      mockLoadSchedule.mockResolvedValue({
        success: false,
        schedule: undefined,
        error: 'No schedule found'
      });

      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // July 24 should be disabled (no existing schedule)
      const july24 = screen.getByRole('button', { name: /24/ });
      expect(july24).toHaveAttribute('disabled');
    });

    it('should enable future dates with existing schedules', async () => {
      // Mock that July 24 has a schedule
      mockLoadSchedule.mockResolvedValue({
        success: true,
        schedule: [{ id: '1', text: 'Test task', completed: false, is_section: false, categories: [], is_subtask: false, section: null, parent_id: null, level: 0, section_index: 0, type: 'task', start_time: null, end_time: null, is_recurring: null, start_date: '2024-07-24' }],
        metadata: {
          totalTasks: 1,
          calendarEvents: 0,
          recurringTasks: 0,
          generatedAt: '2024-07-24T00:00:00Z'
        }
      });

      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // Wait for async date checking to complete
      await waitFor(() => {
        const july24 = screen.getByRole('button', { name: /24/ });
        expect(july24).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('Date Selection Navigation', () => {
    it('should close dropdown after date selection', async () => {
      render(<DashboardHeader {...mockProps} />);
      
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // Click on July 15 (this test will verify dropdown closes after selection)
      const july15 = screen.getByRole('button', { name: /15/ });
      fireEvent.click(july15);
      
      await waitFor(() => {
        expect(screen.queryByTestId('calendar-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should cache available dates to avoid repeated API calls', async () => {
      render(<DashboardHeader {...mockProps} />);
      
      // Open calendar first time
      const calendarButton = screen.getByTestId('calendar-dropdown-trigger');
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // Close and reopen
      fireEvent.click(document.body);
      await waitFor(() => {
        expect(screen.queryByTestId('calendar-dropdown')).not.toBeInTheDocument();
      });
      
      fireEvent.click(calendarButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('calendar-dropdown')).toBeInTheDocument();
      });
      
      // getUserCreationDate should only be called once due to caching
      expect(mockUserApi.getUserCreationDate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Existing Navigation Integration', () => {
    it('should keep existing left/right arrow navigation functional', () => {
      render(<DashboardHeader {...mockProps} />);
      
      // Previous day button should still exist
      const prevButton = screen.getByLabelText('Previous day');
      expect(prevButton).toBeInTheDocument();
      
      // Next day button should still exist  
      const nextButton = screen.getByLabelText('Next day');
      expect(nextButton).toBeInTheDocument();
      
      // Clicking should trigger existing handlers
      fireEvent.click(prevButton);
      expect(mockProps.onPreviousDay).toHaveBeenCalled();
      
      fireEvent.click(nextButton);
      expect(mockProps.onNextDay).toHaveBeenCalled();
    });
  });
}); 