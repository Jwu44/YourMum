/**
 * @file ArchiveIntegration.test.tsx
 * @description Integration test for archive functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ArchivedTaskItem } from '../components/parts/ArchivedTaskItem'
import { type Task } from '../lib/types'

// Mock the toast hook
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

describe('Archive Integration', () => {
  const mockTask: Task = {
    id: 'test-task-123',
    text: 'Test archived task',
    type: 'task',
    is_section: false,
    categories: ['Work', 'Important'],
    start_time: '10:00',
    end_time: '11:00',
    is_recurring: null,
    completed: false,
    is_subtask: false,
    section: null,
    parent_id: null,
    level: 0,
    section_index: 0,
    start_date: '2024-01-15'
  }

  describe('ArchivedTaskItem Component', () => {
    it('should render archived task with correct content', () => {
      const mockOnMoveToToday = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <ArchivedTaskItem
          task={mockTask}
          onMoveToToday={mockOnMoveToToday}
          onDelete={mockOnDelete}
        />
      )

      // Check task text is displayed
      expect(screen.getByText('Test archived task')).toBeInTheDocument()
      
      // Check categories are displayed
      expect(screen.getByText('Work')).toBeInTheDocument()
      expect(screen.getByText('Important')).toBeInTheDocument()
      
      // Check time range is displayed
      expect(screen.getByText('10:00')).toBeInTheDocument()
      expect(screen.getByText('11:00')).toBeInTheDocument()
      expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('should show correct action menu options', async () => {
      const mockOnMoveToToday = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <ArchivedTaskItem
          task={mockTask}
          onMoveToToday={mockOnMoveToToday}
          onDelete={mockOnDelete}
        />
      )

      // Find and click the three-dot menu button
      const menuButton = screen.getByRole('button', { name: /archived task actions/i })
      fireEvent.click(menuButton)

      // Check for "Move to today" option
      await waitFor(() => {
        expect(screen.getByText('Move to today')).toBeInTheDocument()
      })

      // Check for "Delete" option
      expect(screen.getByText('Delete')).toBeInTheDocument()
      
      // Verify "Edit" option is NOT present (as specified in requirements)
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      
      // Verify "Archive" option is NOT present (already archived)
      expect(screen.queryByText('Archive')).not.toBeInTheDocument()
    })

    it('should call onMoveToToday when "Move to today" is clicked', async () => {
      const mockOnMoveToToday = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <ArchivedTaskItem
          task={mockTask}
          onMoveToToday={mockOnMoveToToday}
          onDelete={mockOnDelete}
        />
      )

      // Open the menu
      const menuButton = screen.getByRole('button', { name: /archived task actions/i })
      fireEvent.click(menuButton)

      // Click "Move to today"
      const moveButton = await screen.findByText('Move to today')
      fireEvent.click(moveButton)

      // Verify the callback was called
      await waitFor(() => {
        expect(mockOnMoveToToday).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onDelete when "Delete" is clicked', async () => {
      const mockOnMoveToToday = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <ArchivedTaskItem
          task={mockTask}
          onMoveToToday={mockOnMoveToToday}
          onDelete={mockOnDelete}
        />
      )

      // Open the menu
      const menuButton = screen.getByRole('button', { name: /archived task actions/i })
      fireEvent.click(menuButton)

      // Click "Delete"
      const deleteButton = await screen.findByText('Delete')
      fireEvent.click(deleteButton)

      // Verify the callback was called
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle tasks without timing information', () => {
      const taskWithoutTime: Task = {
        ...mockTask,
        start_time: '',
        end_time: ''
      }

      const mockOnMoveToToday = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <ArchivedTaskItem
          task={taskWithoutTime}
          onMoveToToday={mockOnMoveToToday}
          onDelete={mockOnDelete}
        />
      )

      // Task text should still be displayed
      expect(screen.getByText('Test archived task')).toBeInTheDocument()
      
      // Time information should not be displayed
      expect(screen.queryByText('10:00')).not.toBeInTheDocument()
      expect(screen.queryByText('11:00')).not.toBeInTheDocument()
    })

    it('should handle tasks without categories', () => {
      const taskWithoutCategories: Task = {
        ...mockTask,
        categories: []
      }

      const mockOnMoveToToday = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <ArchivedTaskItem
          task={taskWithoutCategories}
          onMoveToToday={mockOnMoveToToday}
          onDelete={mockOnDelete}
        />
      )

      // Task text should still be displayed
      expect(screen.getByText('Test archived task')).toBeInTheDocument()
      
      // Categories should not be displayed
      expect(screen.queryByText('Work')).not.toBeInTheDocument()
      expect(screen.queryByText('Important')).not.toBeInTheDocument()
    })
  })
}) 