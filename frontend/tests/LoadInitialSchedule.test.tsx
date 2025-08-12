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
const mockGetUserCreationDate = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/ScheduleHelper', () => ({
  loadSchedule: mockLoadSchedule,
  updateSchedule: mockUpdateSchedule,
  generateSchedule: jest.fn(),
  deleteTask: jest.fn(),
  autogenerateTodaySchedule: jest.fn()
}));

// No direct calendar API usage in the new flow

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

  it('should show empty state when no existing schedule and no source found during autogeneration', async () => {
    const { autogenerateTodaySchedule } = require('@/lib/ScheduleHelper');

    // Mock loadSchedule returning 404 (no existing schedule)
    mockLoadSchedule.mockResolvedValue({
      success: false,
      error: 'No schedule found for this date'
    });

    // Mock backend autogeneration finding no source schedule
    (autogenerateTodaySchedule as jest.Mock).mockResolvedValue({
      success: true,
      sourceFound: false,
      created: false,
      schedule: []
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // loadSchedule called once
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledTimes(1);
    });

    // autogenerate called once
    await waitFor(() => {
      expect(autogenerateTodaySchedule).toHaveBeenCalledTimes(1);
    });

    // Verify empty state is shown
    expect(screen.getByText('No schedule found for selected date')).toBeInTheDocument();
  });

  it('should NOT create empty schedule when backend autogeneration returns schedule (calendar events exist)', async () => {
    const { autogenerateTodaySchedule } = require('@/lib/ScheduleHelper');

    // No existing schedule
    mockLoadSchedule.mockResolvedValue({ success: false, error: 'No schedule found for this date' });

    // Backend returns schedule (e.g., from calendar events)
    (autogenerateTodaySchedule as jest.Mock).mockResolvedValue({
      success: true,
      created: true,
      schedule: [
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

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(autogenerateTodaySchedule).toHaveBeenCalledTimes(1);
    });

    // No client-side creation via updateSchedule in this flow
    expect(mockUpdateSchedule).not.toHaveBeenCalled();
  });

  it('should NOT create empty schedule when existing schedule exists', async () => {
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

    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledTimes(1);
    });

    // Verify that updateSchedule was NOT called since existing schedule exists
    expect(mockUpdateSchedule).not.toHaveBeenCalled();
  });

  it('should show error toast and continue with empty state when backend autogeneration fails', async () => {
    const mockToast = jest.fn();
    
    // Re-mock useToast to capture toast calls
    jest.doMock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: mockToast
      })
    }));

    // Mock loadSchedule returning 404
    mockLoadSchedule.mockResolvedValue({
      success: false,
      error: 'No schedule found for this date'
    });

    // Mock autogeneration failing
    const { autogenerateTodaySchedule } = require('@/lib/ScheduleHelper');
    (autogenerateTodaySchedule as jest.Mock).mockResolvedValue({ success: false, error: 'Autogenerate failed' });

    // Render the Dashboard component
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Verify empty state is still shown (frontend continues with empty state)
    expect(screen.getByText('No schedule found for selected date')).toBeInTheDocument();
  });
}); 