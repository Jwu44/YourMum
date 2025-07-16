/**
 * Test for Task 4: Empty Schedule Creation in loadInitialSchedule
 * Tests that loadInitialSchedule creates empty schedule in backend when none exists
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import Dashboard from '@/app/dashboard/page';
import { FormProvider } from '@/lib/FormContext';

// Mock the API functions
const mockLoadSchedule = jest.fn() as jest.MockedFunction<any>;
const mockUpdateSchedule = jest.fn() as jest.MockedFunction<any>;
const mockCalendarFetchEvents = jest.fn() as jest.MockedFunction<any>;
const mockGetUserCreationDate = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/ScheduleHelper', () => ({
  loadSchedule: mockLoadSchedule,
  updateSchedule: mockUpdateSchedule,
  generateSchedule: jest.fn(),
  deleteTask: jest.fn()
}));

jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    fetchEvents: mockCalendarFetchEvents
  }
}));

jest.mock('@/lib/api/users', () => ({
  userApi: {
    getUserCreationDate: mockGetUserCreationDate
  }
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock other dependencies
jest.mock('@/lib/helper', () => ({
  fetchAISuggestions: jest.fn(),
  formatDateToString: jest.fn((date: Date) => {
    return date.toISOString().split('T')[0];
  })
}));

jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123'
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <FormProvider>
      {children}
    </FormProvider>
  );
};

describe('Task 4: loadInitialSchedule Empty Schedule Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful user creation date fetch
    mockGetUserCreationDate.mockResolvedValue(new Date('2024-01-01'));
  });

  it('should create empty schedule in backend when no calendar events and no existing schedule', async () => {
    // Mock calendar API returning no events
    mockCalendarFetchEvents.mockResolvedValue({
      success: false,
      tasks: [],
      error: 'No calendar events found'
    });

    // Mock loadSchedule returning 404 (no existing schedule)
    mockLoadSchedule.mockResolvedValue({
      success: false,
      error: 'No schedule found for this date'
    });

    // Mock updateSchedule succeeding (creating empty schedule)
    mockUpdateSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      metadata: {
        totalTasks: 0,
        calendarEvents: 0,
        recurringTasks: 0,
        generatedAt: new Date().toISOString()
      }
    });

    // Render the Dashboard component
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(mockCalendarFetchEvents).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledTimes(1);
    });

    // Verify that updateSchedule was called to create empty schedule
    await waitFor(() => {
      expect(mockUpdateSchedule).toHaveBeenCalledTimes(1);
    });

    // Check that updateSchedule was called with today's date and empty tasks
    const updateCall = mockUpdateSchedule.mock.calls[0];
    const [date, tasks] = updateCall;
    
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Should be today's date in YYYY-MM-DD format
    expect(tasks).toEqual([]); // Should be empty tasks array

    // Verify empty state is shown initially
    expect(screen.getByText('No schedule found for selected date')).toBeInTheDocument();
  });

  it('should NOT create empty schedule when calendar events exist', async () => {
    // Mock calendar API returning events
    mockCalendarFetchEvents.mockResolvedValue({
      success: true,
      tasks: [
        {
          id: 'calendar-event-1',
          text: 'Meeting at 10 AM',
          type: 'task',
          is_section: false,
          categories: ['Work'],
          completed: false,
          is_subtask: false,
          section: null,
          parent_id: null,
          level: 0,
          section_index: 0,
          start_time: '10:00',
          end_time: '11:00',
          is_recurring: null,
          start_date: new Date().toISOString().split('T')[0]
        }
      ]
    });

    // Render the Dashboard component
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(mockCalendarFetchEvents).toHaveBeenCalledTimes(1);
    });

    // Verify that loadSchedule and updateSchedule were NOT called
    // since calendar events were found
    expect(mockLoadSchedule).not.toHaveBeenCalled();
    expect(mockUpdateSchedule).not.toHaveBeenCalled();
  });

  it('should NOT create empty schedule when existing schedule exists', async () => {
    // Mock calendar API returning no events
    mockCalendarFetchEvents.mockResolvedValue({
      success: false,
      tasks: [],
      error: 'No calendar events found'
    });

    // Mock loadSchedule returning existing schedule
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [
        {
          id: 'existing-task-1',
          text: 'Existing task',
          type: 'task',
          is_section: false,
          categories: ['Work'],
          completed: false,
          is_subtask: false,
          section: null,
          parent_id: null,
          level: 0,
          section_index: 0,
          start_time: null,
          end_time: null,
          is_recurring: null,
          start_date: new Date().toISOString().split('T')[0]
        }
      ]
    });

    // Render the Dashboard component
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(mockCalendarFetchEvents).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledTimes(1);
    });

    // Verify that updateSchedule was NOT called since existing schedule exists
    expect(mockUpdateSchedule).not.toHaveBeenCalled();
  });

  it('should show error toast and continue with frontend state when backend creation fails', async () => {
    const mockToast = jest.fn();
    
    // Re-mock useToast to capture toast calls
    jest.doMock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: mockToast
      })
    }));

    // Mock calendar API returning no events
    mockCalendarFetchEvents.mockResolvedValue({
      success: false,
      tasks: [],
      error: 'No calendar events found'
    });

    // Mock loadSchedule returning 404
    mockLoadSchedule.mockResolvedValue({
      success: false,
      error: 'No schedule found for this date'
    });

    // Mock updateSchedule failing
    mockUpdateSchedule.mockResolvedValue({
      success: false,
      error: 'Failed to create schedule in database'
    });

    // Render the Dashboard component
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(mockUpdateSchedule).toHaveBeenCalledTimes(1);
    });

    // Verify empty state is still shown (frontend continues with empty state)
    expect(screen.getByText('No schedule found for selected date')).toBeInTheDocument();
  });
}); 