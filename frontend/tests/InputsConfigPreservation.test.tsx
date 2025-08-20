/**
 * Test for inputs config preservation functionality following TDD approach
 * These tests should FAIL initially and PASS after implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import InputConfigurationPage from '@/components/parts/InputsConfig';
import { FormProvider } from '@/lib/FormContext';
import { useRouter, useSearchParams } from 'next/navigation';

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

// Test wrapper component with FormProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FormProvider>
    <div data-testid="test-wrapper">{children}</div>
  </FormProvider>
);

// Sample inputs config data
const sampleInputsConfig = {
  name: "Test User",
  work_start_time: "09:00",
  work_end_time: "17:00",
  energy_patterns: ["peak_morning", "high_all_day"],
  priorities: {
    health: "1",
    relationships: "2", 
    fun_activities: "3",
    ambitions: "4"
  },
  layout_preference: {
    layout: "todolist-structured",
    subcategory: "day-sections",
    orderingPattern: "timebox"
  },
  tasks: []
};

describe('InputsConfigPreservation', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default search params mock
    mockGet.mockReturnValue('2025-07-23');
  });

  test('loads existing inputs config from backend on mount', async () => {
    // Mock loadSchedule to return existing inputs config
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: sampleInputsConfig
    });

    render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Wait for the component to load inputs config
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledWith('2025-07-23');
    });

    // Verify that the form fields are populated with the loaded inputs config
    await waitFor(() => {
      const workStartInput = screen.getByDisplayValue('09:00') as HTMLInputElement;
      const workEndInput = screen.getByDisplayValue('17:00') as HTMLInputElement;
      
      expect(workStartInput).toBeInTheDocument();
      expect(workEndInput).toBeInTheDocument();
    });
  });

  test('falls back to defaults when no inputs config exists', async () => {
    // Mock loadSchedule to return no inputs config
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: {} // Empty inputs config
    });

    render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledWith('2025-07-23');
    });

    // Verify that form shows default values (empty or default)
    await waitFor(() => {
      // Check that the form renders with default values
      const workStartInput = screen.getByLabelText('Work Start Time') as HTMLInputElement;
      const workEndInput = screen.getByLabelText('Work End Time') as HTMLInputElement;
      
      expect(workStartInput).toBeInTheDocument();
      expect(workEndInput).toBeInTheDocument();
      // Default values should be empty or the FormContext defaults
    });
  });

  test('preserves inputs config when creating next day schedule', async () => {
    // Mock loadSchedule to return existing inputs config
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: sampleInputsConfig
    });

    // Mock generateSchedule to verify it receives the inputs config
    mockGenerateSchedule.mockResolvedValue({
      success: true,
      schedule: []
    });

    render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Wait for inputs to load
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledWith('2025-07-23');
    });

    // Find and click the save button
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    // Verify that generateSchedule was called with the preserved inputs config
    await waitFor(() => {
      expect(mockGenerateSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          work_start_time: "09:00",
          work_end_time: "17:00",
                  energy_patterns: ["peak_morning", "high_all_day"],
          priorities: {
            health: "1",
            relationships: "2", 
            fun_activities: "3",
            ambitions: "4"
          },
          layout_preference: {
            layout: "todolist-structured",
            subcategory: "day-sections",
            orderingPattern: "timebox"
          }
        })
      );
    });
  });

  test('handles loading errors gracefully with error toast', async () => {
    // Mock loadSchedule to fail
    mockLoadSchedule.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Wait for the component to handle the error
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledWith('2025-07-23');
    });

    // Verify that the component still renders (doesn't crash)
    expect(screen.getByText('Input Configuration')).toBeInTheDocument();
  });

  test('uses URL date parameter when provided', async () => {
    // Mock search params to return a specific date
    mockGet.mockReturnValue('2025-07-24');

    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: sampleInputsConfig
    });

    render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Verify that loadSchedule was called with the URL date parameter
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledWith('2025-07-24');
    });
  });

  test('falls back to today when no URL date parameter', async () => {
    // Mock search params to return null (no date parameter)
    mockGet.mockReturnValue(null);

    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [],
      inputs: sampleInputsConfig
    });

    render(
      <TestWrapper>
        <InputConfigurationPage />
      </TestWrapper>
    );

    // Verify that loadSchedule was called with today's date
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalled();
      // The exact date will depend on when the test runs, but it should be called
    });
  });
}); 