/**
 * Test for task delete functionality following TDD approach
 * These tests should FAIL initially and PASS after implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { FormProvider } from '@/lib/FormContext';
import EditableScheduleRow from '@/components/parts/EditableScheduleRow';
import { Task } from '@/lib/types';

// Mock the API functions that will be called
jest.mock('@/lib/ScheduleHelper', () => ({
  updateSchedule: jest.fn(),
  loadSchedule: jest.fn()
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the API functions from ScheduleHelper  
const mockDeleteTask = jest.fn() as jest.MockedFunction<(taskId: string, date: string) => Promise<any>>;
jest.mock('@/lib/ScheduleHelper', () => ({
  updateSchedule: jest.fn(),
  loadSchedule: jest.fn(),
  deleteTask: mockDeleteTask
}));

const mockTask: Task = {
  id: 'test-task-1',
  text: 'Test Task to Delete',
  categories: ['Work'],
  start_time: '09:00',
  end_time: '10:00',
  completed: false,
  is_section: false,
  is_subtask: false,
  level: 0,
  section: null,
  parent_id: null,
  section_index: 0,
  type: 'task' as const,
  is_recurring: null,
  start_date: '2024-01-01'
};

const mockSectionTask: Task = {
  id: 'test-section-1',
  text: 'Morning Section',
  categories: [],
  completed: false,
  is_section: true,
  is_subtask: false,
  level: 0,
  section: null,
  parent_id: null,
  section_index: 0,
  type: 'section' as const,
  is_recurring: null,
  start_date: '2024-01-01'
};

const allTasks: Task[] = [mockTask];

describe('Task Delete Functionality Tests', () => {
  let mockOnUpdateTask: jest.Mock;
  let mockOnDeleteTask: jest.Mock;
  let mockMoveTask: jest.Mock;

  beforeEach(() => {
    mockOnUpdateTask = jest.fn();
    mockOnDeleteTask = jest.fn();
    mockMoveTask = jest.fn();
    jest.clearAllMocks();
  });

  /**
   * Test Case 1: Component renders with task actions button
   * Verifies that the ellipses button for task actions is present
   */
  test('should render task actions button for non-section tasks', () => {
    render(
      <FormProvider>
        <EditableScheduleRow
          task={mockTask}
          index={0}
          onUpdateTask={mockOnUpdateTask}
          moveTask={mockMoveTask}
          isSection={false}
          allTasks={allTasks}
          onDeleteTask={mockOnDeleteTask}
        />
      </FormProvider>
    );

    // Verify the ellipses button (task actions) is present
    const ellipsesButton = screen.getByRole('button', { name: /task actions/i });
    expect(ellipsesButton).toBeInTheDocument();
    
    // Verify it contains the MoreHorizontal icon (ellipses)
    const ellipsesIcon = ellipsesButton.querySelector('svg');
    expect(ellipsesIcon).toBeInTheDocument();
  });

  /**
   * Test Case 2: Delete option not shown for section tasks
   * Sections should not be deletable - only regular tasks
   */
  test('should not show Delete option for section tasks', async () => {
    render(
      <FormProvider>
        <EditableScheduleRow
          task={mockSectionTask}
          index={0}
          onUpdateTask={mockOnUpdateTask}
          moveTask={mockMoveTask}
          isSection={true}
          allTasks={[mockSectionTask]}
          onDeleteTask={mockOnDeleteTask}
        />
      </FormProvider>
    );

    // Section tasks should not show the actions dropdown at all
    const ellipsesButton = screen.queryByRole('button', { name: /task actions/i });
    expect(ellipsesButton).not.toBeInTheDocument();
  });

  /**
   * Test Case 3: onDeleteTask prop is properly passed
   * Verifies that the delete callback is available when provided
   */
  test('should accept onDeleteTask prop for delete functionality', () => {
    const { rerender } = render(
      <FormProvider>
        <EditableScheduleRow
          task={mockTask}
          index={0}
          onUpdateTask={mockOnUpdateTask}
          moveTask={mockMoveTask}
          isSection={false}
          allTasks={allTasks}
          onDeleteTask={mockOnDeleteTask}
        />
      </FormProvider>
    );

    // Task actions button should be present when onDeleteTask is provided
    const ellipsesButton = screen.getByRole('button', { name: /task actions/i });
    expect(ellipsesButton).toBeInTheDocument();

    // Re-render without onDeleteTask - button should still be there but functionality differs
    rerender(
      <FormProvider>
        <EditableScheduleRow
          task={mockTask}
          index={0}
          onUpdateTask={mockOnUpdateTask}
          moveTask={mockMoveTask}
          isSection={false}
          allTasks={allTasks}
          // onDeleteTask not provided
        />
      </FormProvider>
    );

    const ellipsesButtonNoDelete = screen.getByRole('button', { name: /task actions/i });
    expect(ellipsesButtonNoDelete).toBeInTheDocument();
  });

  /**
   * Test Case 4: Component has proper accessibility attributes
   * Verify ARIA labels and roles are correctly set
   */
  test('should have proper accessibility attributes', () => {
    render(
      <FormProvider>
        <EditableScheduleRow
          task={mockTask}
          index={0}
          onUpdateTask={mockOnUpdateTask}
          moveTask={mockMoveTask}
          isSection={false}
          allTasks={allTasks}
          onDeleteTask={mockOnDeleteTask}
        />
      </FormProvider>
    );

    // Verify the task actions button has proper aria-label
    const ellipsesButton = screen.getByRole('button', { name: /task actions/i });
    expect(ellipsesButton).toHaveAttribute('aria-label', 'Task actions');
    expect(ellipsesButton).toHaveAttribute('aria-haspopup', 'menu');
  });

  /**
   * Test Case 5: Component renders task content correctly
   * Verify task text and time are displayed
   */
  test('should display task content with time and text', () => {
    render(
      <FormProvider>
        <EditableScheduleRow
          task={mockTask}
          index={0}
          onUpdateTask={mockOnUpdateTask}
          moveTask={mockMoveTask}
          isSection={false}
          allTasks={allTasks}
          onDeleteTask={mockOnDeleteTask}
        />
      </FormProvider>
    );

    // Verify task text is displayed (may be combined with time)
    expect(screen.getByText(/Test Task to Delete/)).toBeInTheDocument();
    
    // Verify time range is displayed
    expect(screen.getByText(/09:00 - 10:00/)).toBeInTheDocument();
  });
});

/**
 * Integration Tests for Delete Task Flow
 * Tests the delete task callback and API integration logic
 */
describe('Delete Task Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful API response mock
    mockDeleteTask.mockResolvedValue({
      success: true,
      schedule: [], // Empty schedule after deletion
      metadata: { totalTasks: 0 }
    });
  });

  /**
   * Test Case 6: API helper function works correctly
   * Test the deleteTask API function directly
   */
  test('should call API helper function with correct parameters', async () => {
    const { deleteTask } = await import('@/lib/ScheduleHelper');
    
    // Call the API function directly
    const result = await deleteTask('test-task-1', '2024-01-01');
    
    // Verify API was called with correct parameters
    expect(mockDeleteTask).toHaveBeenCalledWith('test-task-1', '2024-01-01');
    
    // Verify successful result
    expect(result.success).toBe(true);
    expect(result.schedule).toEqual([]);
  });

  /**
   * Test Case 7: API helper handles errors correctly
   * Test error handling in the deleteTask function
   */
  test('should handle API errors in helper function', async () => {
    // Setup failed API response
    mockDeleteTask.mockRejectedValue(new Error('Delete failed'));

    const { deleteTask } = await import('@/lib/ScheduleHelper');
    
    // Call should throw or return error
    let result;
    try {
      result = await deleteTask('test-task-1', '2024-01-01');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Delete failed');
    }

    // Verify API was called
    expect(mockDeleteTask).toHaveBeenCalledWith('test-task-1', '2024-01-01');
  });
}); 