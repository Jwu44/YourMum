/**
 * Test for task edit functionality to reproduce the bug
 * Following TDD principle: test first, then implement fix
 * 
 * These tests should FAIL initially and PASS after implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { FormProvider } from '@/lib/FormContext';
import TaskEditDrawer from '@/components/parts/TaskEditDrawer';
import { Task } from '@/lib/types';

// Mock the API functions that will be called
jest.mock('@/lib/ScheduleHelper', () => ({
  updateSchedule: jest.fn()
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

const mockTask: Task = {
  id: 'test-task-1',
  text: 'Original Task Text',
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

describe('TaskEditDrawer Bug Reproduction Tests', () => {
  let mockOnUpdateTask: jest.Mock;
  let mockOnClose: jest.Mock;

  beforeEach(() => {
    mockOnUpdateTask = jest.fn();
    mockOnClose = jest.fn();
    jest.clearAllMocks();
  });

  /**
   * Test Case 1: Race Condition Bug
   * 
   * Reproduces the issue where backend doesn't receive updated task data
   * due to race condition in handleScheduleTaskUpdate
   */
  test('should call onUpdateTask with correct updated data (Race Condition Test)', async () => {
    // This test should FAIL initially due to race condition
    render(
      <FormProvider>
        <TaskEditDrawer
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Find and modify the task text
    const textInput = screen.getByDisplayValue('Original Task Text');
    fireEvent.change(textInput, { target: { value: 'Updated Task Text' } });

    // Modify time fields
    const startTimeInput = screen.getByDisplayValue('09:00');
    fireEvent.change(startTimeInput, { target: { value: '10:00' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Verify onUpdateTask was called with the UPDATED data, not original data
    await waitFor(() => {
      expect(mockOnUpdateTask).toHaveBeenCalledWith({
        ...mockTask,
        text: 'Updated Task Text',
        start_time: '10:00'
      });
    });

    // Verify drawer closes after successful save
    expect(mockOnClose).toHaveBeenCalled();
  });

  /**
   * Test Case 2: Modal Overlay Persistence Bug
   * 
   * Reproduces the issue where modal overlay persists after drawer closes,
   * making dashboard elements unclickable
   */
  test('should properly cleanup modal state and not block interactions (Modal Overlay Test)', async () => {
    const { rerender } = render(
      <FormProvider>
        <TaskEditDrawer
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Save task to trigger drawer close
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Wait for save to complete
    await waitFor(() => {
      expect(mockOnUpdateTask).toHaveBeenCalled();
    });

    // Simulate drawer being closed by parent component
    rerender(
      <FormProvider>
        <TaskEditDrawer
          isOpen={false}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Verify no modal overlay elements persist in DOM
    const modalOverlays = document.querySelectorAll('[data-state="open"]');
    expect(modalOverlays).toHaveLength(0);

    // Verify no elements have pointer-events disabled
    const blockedElements = document.querySelectorAll('[style*="pointer-events: none"]');
    expect(blockedElements).toHaveLength(0);
  });

  /**
   * Test Case 3: Error Handling During Save
   * 
   * Ensures drawer doesn't close if save operation fails,
   * and modal state is properly maintained
   */
  test('should keep drawer open when save fails and maintain proper modal state', async () => {
    // Mock a failing save operation
    const failingMockOnUpdateTask = jest.fn().mockImplementation(() => {
      throw new Error('Backend error');
    });

    render(
      <FormProvider>
        <TaskEditDrawer
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={failingMockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Modify task
    const textInput = screen.getByDisplayValue('Original Task Text');
    fireEvent.change(textInput, { target: { value: 'Updated Task Text' } });

    // Attempt to save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Wait for save attempt to complete
    await waitFor(() => {
      expect(failingMockOnUpdateTask).toHaveBeenCalled();
    });

    // Verify drawer remains open (onClose not called)
    expect(mockOnClose).not.toHaveBeenCalled();

    // Verify save button is still available for retry
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    // Verify form still contains user's changes
    expect(screen.getByDisplayValue('Updated Task Text')).toBeInTheDocument();
  });

  /**
   * Test Case 4: Form Reset on Close
   * 
   * Ensures form state is properly reset when drawer is closed
   * without saving, following dev-guide.md error prevention principles
   */
  test('should reset form state when drawer is closed without saving', async () => {
    const { rerender } = render(
      <FormProvider>
        <TaskEditDrawer
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Modify task but don't save
    const textInput = screen.getByDisplayValue('Original Task Text');
    fireEvent.change(textInput, { target: { value: 'Unsaved Changes' } });

    // Close drawer without saving
    rerender(
      <FormProvider>
        <TaskEditDrawer
          isOpen={false}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Reopen drawer
    rerender(
      <FormProvider>
        <TaskEditDrawer
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Verify form shows original task data, not unsaved changes
    expect(screen.getByDisplayValue('Original Task Text')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Unsaved Changes')).not.toBeInTheDocument();
  });
});

describe('TaskEditDrawer Vaul Integration Fix', () => {
  let mockOnUpdateTask: jest.Mock;
  let mockOnClose: jest.Mock;

  beforeEach(() => {
    mockOnUpdateTask = jest.fn();
    mockOnClose = jest.fn();
    jest.clearAllMocks();
  });

  /**
   * Test Case 1: Proper State Management
   * Ensures vaul handles all modal state transitions
   */
  test('should let vaul manage modal state without race conditions', async () => {
    render(
      <FormProvider>
        <TaskEditDrawer
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Modify task
    const textInput = screen.getByDisplayValue('Original Task Text');
    fireEvent.change(textInput, { target: { value: 'Updated Task Text' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Verify onUpdateTask was called with correct data
    await waitFor(() => {
      expect(mockOnUpdateTask).toHaveBeenCalledWith({
        ...mockTask,
        text: 'Updated Task Text'
      });
    });

    // Verify onClose is NOT called manually from handleSave
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  /**
   * Test Case 2: Modal Cleanup Validation
   * Ensures no modal artifacts remain after proper vaul close
   */
  test('should cleanup modal state properly when vaul closes drawer', async () => {
    const { rerender } = render(
      <FormProvider>
        <TaskEditDrawer
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Save task
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Wait for save completion
    await waitFor(() => {
      expect(mockOnUpdateTask).toHaveBeenCalled();
    });

    // Simulate vaul closing the drawer (parent manages state)
    rerender(
      <FormProvider>
        <TaskEditDrawer
          isOpen={false}
          onClose={mockOnClose}
          task={mockTask}
          onUpdateTask={mockOnUpdateTask}
          currentDate="2024-01-01"
        />
      </FormProvider>
    );

    // Verify complete cleanup
    await waitFor(() => {
      const modalOverlays = document.querySelectorAll('[data-state="open"]');
      expect(modalOverlays).toHaveLength(0);

      const blockedElements = document.querySelectorAll('[style*="pointer-events: none"]');
      expect(blockedElements).toHaveLength(0);

      const bodyElement = document.querySelector('body');
      expect(bodyElement?.style.pointerEvents).not.toBe('none');
    });
  });
});