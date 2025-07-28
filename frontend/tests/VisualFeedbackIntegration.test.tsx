import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import EditableScheduleRow from '../components/parts/EditableScheduleRow'
import { useDragDropProvider } from '../hooks/use-drag-drop-provider'
import { FormProvider } from '../lib/FormContext'
import { Task } from '../lib/types'

// Mock tasks for testing
const mockTasks: Task[] = [
  {
    id: 'task-1',
    text: 'First task',
    completed: false,
    is_section: false,
    is_subtask: false,
    level: 0,
    parent_id: null,
    section: 'Morning',
    categories: ['Morning'],
    section_index: 1,
    type: 'task'
  },
  {
    id: 'task-2', 
    text: 'Second task',
    completed: false,
    is_section: false,
    is_subtask: false,
    level: 0,
    parent_id: null,
    section: 'Morning',
    categories: ['Morning'],
    section_index: 2,
    type: 'task'
  },
  {
    id: 'section-1',
    text: 'Morning Section',
    completed: false,
    is_section: true,
    is_subtask: false,
    level: 0,
    parent_id: null,
    section: 'Morning',
    categories: ['Morning'],
    section_index: 0,
    type: 'section'
  }
]

// Test component wrapper with drag context
const TestDragRowComponent = ({ 
  task, 
  shouldIndent = false, 
  horizontalOffset = 0,
  onUpdateTask = jest.fn(),
  moveTask = jest.fn()
}: { 
  task: Task
  shouldIndent?: boolean
  horizontalOffset?: number
  onUpdateTask?: (task: Task) => void
  moveTask?: (dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => void
}) => {
  const dragDropProvider = useDragDropProvider({
    tasks: mockTasks,
    onReorderTasks: jest.fn()
  })

  // Override the provider's state for testing
  const mockProvider = {
    ...dragDropProvider,
    shouldIndent,
    horizontalOffset
  }

  return (
    <FormProvider>
      <DndContext
        sensors={mockProvider.sensors}
        collisionDetection={mockProvider.collisionDetection}
        onDragStart={mockProvider.onDragStart}
        onDragOver={mockProvider.onDragOver}
        onDragEnd={mockProvider.onDragEnd}
      >
        <SortableContext
          items={mockProvider.items}
          strategy={mockProvider.strategy}
        >
          <EditableScheduleRow
            task={task}
            index={0}
            onUpdateTask={onUpdateTask}
            moveTask={moveTask}
            isSection={task.is_section || false}
            allTasks={mockTasks}
            shouldIndent={shouldIndent}
            horizontalOffset={horizontalOffset}
          />
        </SortableContext>
      </DndContext>
    </FormProvider>
  )
}

describe('Visual Feedback Integration', () => {
  const mockOnUpdateTask = jest.fn()
  const mockMoveTask = jest.fn()

  beforeEach(() => {
    mockOnUpdateTask.mockClear()
    mockMoveTask.mockClear()
  })

  describe('purple line rendering', () => {
    test('should not show purple line when not dragging (horizontalOffset = 0)', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={false}
          horizontalOffset={0}
        />
      )

      // Should not find any purple line indicators
      const purpleLines = document.querySelectorAll('[class*="bg-purple"]')
      expect(purpleLines).toHaveLength(0)
    })

    test('should not show purple line for insufficient horizontal offset (< 20px)', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={false}
          horizontalOffset={15}
        />
      )

      // Should not show purple line since shouldIndent is false
      const purpleLines = document.querySelectorAll('[class*="bg-purple"]')
      expect(purpleLines).toHaveLength(0)
    })

    test('should show purple line for sufficient horizontal offset (>= 20px)', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Should show purple line since shouldIndent is true
      const purpleLines = document.querySelectorAll('[class*="bg-purple"]')
      expect(purpleLines.length).toBeGreaterThan(0)
    })

    test('should show level 1 indentation visual feedback', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Look for level 1 indentation indicator
      const level1Indicator = document.querySelector('[data-testid="indent-level-1"]')
      expect(level1Indicator).toBeInTheDocument()
    })

    test('should show level 2 indentation visual feedback for deeper horizontal offset', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={45} // Deeper horizontal offset
        />
      )

      // Should show deeper indentation level
      const deeperIndent = document.querySelector('[data-testid="indent-level-2"]')
      expect(deeperIndent).toBeInTheDocument()
    })

    test('should cap indentation at level 3 maximum', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={100} // Very large horizontal offset
        />
      )

      // Should cap at level 3, not go beyond
      const level3Indicator = document.querySelector('[data-testid="indent-level-3"]')
      const level4Indicator = document.querySelector('[data-testid="indent-level-4"]')
      
      expect(level3Indicator).toBeInTheDocument()
      expect(level4Indicator).not.toBeInTheDocument()
    })
  })

  describe('invalid indent targets', () => {
    test('should not show visual feedback for sections', () => {
      const sectionTask = mockTasks.find(task => task.is_section)!
      
      render(
        <TestDragRowComponent 
          task={sectionTask} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Should not show purple line for sections
      const purpleLines = document.querySelectorAll('[class*="bg-purple"]')
      expect(purpleLines).toHaveLength(0)
    })

    test('should not show visual feedback when target cannot accept children', () => {
      // Test with a completed task that might not accept children
      const completedTask = {
        ...mockTasks[0],
        completed: true
      }

      render(
        <TestDragRowComponent 
          task={completedTask} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Completed tasks can still accept children based on requirements
      // So this should still show visual feedback
      const purpleLines = document.querySelectorAll('[class*="bg-purple"]')
      expect(purpleLines.length).toBeGreaterThan(0)
    })
  })

  describe('real-time visual feedback', () => {
    test('should update visual feedback immediately when shouldIndent changes', () => {
      const { rerender } = render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={false}
          horizontalOffset={15}
        />
      )

      // Initially no purple line
      let purpleLines = document.querySelectorAll('[class*="bg-purple"]')
      expect(purpleLines).toHaveLength(0)

      // Re-render with shouldIndent true
      rerender(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Should now show purple line immediately
      purpleLines = document.querySelectorAll('[class*="bg-purple"]')
      expect(purpleLines.length).toBeGreaterThan(0)
    })

    test('should update indentation level based on horizontal offset', () => {
      const { rerender } = render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Should show level 1
      let level1 = document.querySelector('[data-testid="indent-level-1"]')
      expect(level1).toBeInTheDocument()

      // Re-render with deeper offset (40px = level 2)
      rerender(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={40}
        />
      )

      // Should now show level 2 (40px / 20 = 2)
      const level2 = document.querySelector('[data-testid="indent-level-2"]')
      expect(level2).toBeInTheDocument()
    })
  })

  describe('purple line styling', () => {
    test('should use correct purple color classes', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Should use purple-500 for base indentation line
      const purpleLine = document.querySelector('.bg-purple-500')
      expect(purpleLine).toBeInTheDocument()
    })

    test('should show darker purple for deeper indentation levels', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={45}
        />
      )

      // Should use darker purple for deeper levels
      const darkerPurple = document.querySelector('.bg-purple-600, .bg-purple-700')
      expect(darkerPurple).toBeInTheDocument()
    })

    test('should position purple line correctly', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Should be positioned at bottom of row
      const purpleLine = document.querySelector('[class*="bottom-"]')
      expect(purpleLine).toBeInTheDocument()
    })
  })

  describe('accessibility and performance', () => {
    test('should not affect screen reader accessibility', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Visual indicators should be aria-hidden
      const visualIndicators = document.querySelectorAll('[aria-hidden="true"]')
      expect(visualIndicators.length).toBeGreaterThan(0)
    })

    test('should render efficiently without excessive DOM elements', () => {
      render(
        <TestDragRowComponent 
          task={mockTasks[0]} 
          shouldIndent={true}
          horizontalOffset={25}
        />
      )

      // Should not create excessive DOM elements
      const allElements = document.querySelectorAll('*')
      expect(allElements.length).toBeLessThan(50) // Reasonable limit
    })
  })
}) 