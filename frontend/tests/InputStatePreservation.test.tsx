/**
 * Test for input state preservation when navigating away and back
 * Following TDD approach - these tests should FAIL initially and PASS after implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { FormProvider, useForm, hasFormModifications } from '@/lib/FormContext';
import { act } from 'react-dom/test-utils';

// Create mock functions first
const mockLoadSchedule = jest.fn() as jest.MockedFunction<any>;
const mockGenerateSchedule = jest.fn() as jest.MockedFunction<any>;

// Mock the API functions that will be called
jest.mock('@/lib/ScheduleHelper', () => ({
  loadSchedule: mockLoadSchedule,
  generateSchedule: mockGenerateSchedule
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock Next.js navigation
const mockPush = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useSearchParams: () => ({
    get: mockGet
  })
}));

// Test component to simulate user making changes
const TestFormModifier: React.FC = () => {
  const { state, dispatch } = useForm();
  
  return (
    <div data-testid="form-modifier">
      <button
        data-testid="modify-energy"
        onClick={() => dispatch({
          type: 'UPDATE_FIELD',
          field: 'energy_patterns',
          value: ['peak_morning', 'high_all_day']
        })}
      >
        Modify Energy
      </button>
      <button
        data-testid="modify-work-time"
        onClick={() => dispatch({
          type: 'UPDATE_FIELD',
          field: 'work_start_time',
          value: '08:00'
        })}
      >
        Modify Work Time
      </button>
      <div data-testid="current-energy">{JSON.stringify(state.energy_patterns)}</div>
      <div data-testid="current-work-time">{state.work_start_time}</div>
    </div>
  );
};

// Test wrapper component with FormProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FormProvider>
    <div data-testid="test-wrapper">{children}</div>
  </FormProvider>
);

// Sample backend data
const backendInputsConfig = {
  name: "Backend User",
  work_start_time: "09:00",
  work_end_time: "17:00",
  energy_patterns: ["peak_afternoon"],
  priorities: {
    health: "1",
    relationships: "2", 
    fun_activities: "3",
    ambitions: "4"
  },
  layout_preference: {
    layout: "todolist-structured",
    subcategory: "day-sections",
    timing: "timebox"
  },
  tasks: []
};

describe('InputStatePreservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue('2025-07-23');
  });

  test('should preserve unsaved FormContext changes when remounting inputs page', async () => {
    // Setup: Mock backend to return different data than user changes
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: backendInputsConfig
    });

    // First render - simulate user making changes
    const { rerender } = render(
      <TestWrapper>
        <TestFormModifier />
      </TestWrapper>
    );

    // User modifies form data
    await act(async () => {
      fireEvent.click(screen.getByTestId('modify-energy'));
      fireEvent.click(screen.getByTestId('modify-work-time'));
    });

    // Verify changes are in FormContext
    await waitFor(() => {
      expect(screen.getByTestId('current-energy')).toHaveTextContent('["peak_morning","high_all_day"]');
      expect(screen.getByTestId('current-work-time')).toHaveTextContent('08:00');
    });

    // Now render the inputs page - this should NOT overwrite the FormContext changes
    rerender(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // The bug: loadCurrentScheduleTasks should NOT be called when FormContext has user changes
    // After fix: loadSchedule should NOT be called or should preserve existing FormContext
    await waitFor(() => {
      // This test will initially FAIL because the current implementation always calls loadSchedule
      // After fix, loadSchedule should either not be called or should preserve FormContext state
      expect(mockLoadSchedule).not.toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  test('should only load backend data when FormContext is in initial state', async () => {
    // Mock backend data
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: backendInputsConfig
    });

    // Render inputs page with clean FormContext (initial state)
    render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Should load from backend when FormContext is in initial state
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledWith('2025-07-23');
    });

    // Verify backend data is loaded into form
    await waitFor(() => {
      const workStartInput = screen.getByDisplayValue('09:00');
      expect(workStartInput).toBeInTheDocument();
    });
  });

  test('should detect when FormContext has user modifications', async () => {
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: backendInputsConfig
    });

    // First, render and load initial data
    const { rerender } = render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledTimes(1);
    });

    // Clear the mock to track subsequent calls
    jest.clearAllMocks();

    // Now simulate user making changes via a different component
    rerender(
      <TestWrapper>
        <TestFormModifier />
      </TestWrapper>
    );

    // User makes changes
    await act(async () => {
      fireEvent.click(screen.getByTestId('modify-energy'));
    });

    // Now re-render inputs page - should NOT reload from backend
    rerender(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // After fix: Should not call loadSchedule when FormContext has user changes
    await waitFor(() => {
      expect(mockLoadSchedule).not.toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  test('should preserve user changes across multiple navigation cycles', async () => {
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: backendInputsConfig
    });

    // Initial render with user changes
    const { rerender } = render(
      <TestWrapper>
        <TestFormModifier />
      </TestWrapper>
    );

    // User makes changes
    await act(async () => {
      fireEvent.click(screen.getByTestId('modify-work-time'));
    });

    // Navigate to inputs page multiple times
    for (let i = 0; i < 3; i++) {
      rerender(
        <TestWrapper>
          <InputConfigurationPage />
        </TestWrapper>
      );

      // Navigate away
      rerender(
        <TestWrapper>
          <div>Other page</div>
        </TestWrapper>
      );
    }

    // Final navigation to inputs page
    rerender(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Should still preserve the user's work time change
    await waitFor(() => {
      const workTimeInput = screen.getByDisplayValue('08:00');
      expect(workTimeInput).toBeInTheDocument();
    });
  });

  test('should still allow save functionality to work correctly', async () => {
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: backendInputsConfig
    });

    mockGenerateSchedule.mockResolvedValue({
      success: true,
      schedule: []
    });

    // First make user changes
    const { rerender } = render(
      <TestWrapper>
        <TestFormModifier />
      </TestWrapper>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('modify-work-time'));
    });

    // Navigate to inputs page
    rerender(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Find and click save button
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Should save with user modifications
    await waitFor(() => {
      expect(mockGenerateSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          work_start_time: '08:00' // User's modified value, not backend value
        })
      );
    });
  });
});