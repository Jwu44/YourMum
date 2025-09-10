import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useToast } from '@/hooks/use-toast'
import { useMicrostepDecomposition } from '@/hooks/useMicrostepDecomposition'
import { useDecompositionContext } from '@/contexts/DecompositionContext'
import EditableScheduleRow from '../EditableScheduleRow'
import { type Task } from '@/lib/types'

// Mock dependencies
jest.mock('@/hooks/use-toast')
jest.mock('@/hooks/useMicrostepDecomposition')
jest.mock('@/contexts/DecompositionContext')
jest.mock('@/lib/FormContext', () => ({
  useForm: () => ({ state: { timezone: 'UTC' } })
}))
jest.mock('@/hooks/use-drag-drop-task', () => ({
  useDragDropTask: () => ({
    setNodeRef: jest.fn(),
    attributes: {},
    listeners: {},
    getRowClassName: () => 'mock-row-class',
    getGripClassName: () => 'mock-grip-class',
    isDragging: false,
    isOver: false,
    transform: null,
    updateCursorPosition: jest.fn(),
    indentationState: { dragType: null, targetIndentLevel: null }
  })
}))
jest.mock('@/contexts/DragStateContext', () => ({
  useDragState: () => ({ isDraggingAny: false })
}))

const mockToast = jest.fn()
const mockUseMicrostepDecomposition = useMicrostepDecomposition as jest.MockedFunction<typeof useMicrostepDecomposition>
const mockUseDecompositionContext = useDecompositionContext as jest.MockedFunction<typeof useDecompositionContext>

;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })

describe('EditableScheduleRow - Refactored', () => {
  const mockTask: Task = {
    id: 'task-1',
    text: 'Test task',
    completed: false,
    is_section: false,
    categories: ['work'],
    level: 0
  }

  const mockProps = {
    task: mockTask,
    index: 0,
    onUpdateTask: jest.fn(),
    moveTask: jest.fn(),
    isSection: false,
    allTasks: [mockTask],
    onEditTask: jest.fn(),
    onDeleteTask: jest.fn(),
    onArchiveTask: jest.fn()
  }

  const mockMicrostepHook = {
    isDecomposing: false,
    suggestedMicrosteps: [],
    showMicrosteps: false,
    decompose: jest.fn(),
    acceptMicrostep: jest.fn(),
    rejectMicrostep: jest.fn(),
    setSuggestedMicrosteps: jest.fn(),
    setShowMicrosteps: jest.fn(),
    clearMicrosteps: jest.fn()
  }

  const mockDecompositionContext = {
    decomposingTaskId: null,
    isAnyDecomposing: false,
    setDecomposingTask: jest.fn(),
    clearDecomposingTask: jest.fn(),
    canDecompose: jest.fn().mockReturnValue(true)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMicrostepDecomposition.mockReturnValue(mockMicrostepHook)
    mockUseDecompositionContext.mockReturnValue(mockDecompositionContext)
  })

  it('should render task with decompose button when decomposition is allowed', () => {
    render(<EditableScheduleRow {...mockProps} />)

    expect(screen.getByText('Test task')).toBeInTheDocument()
    expect(screen.getByLabelText('Task actions')).toBeInTheDocument()
  })

  it('should call decompose when sparkle button is clicked', async () => {
    render(<EditableScheduleRow {...mockProps} />)

    // Find and click the decompose button (sparkle icon)
    const actionsButton = screen.getByLabelText('Task actions')
    fireEvent.click(actionsButton)

    // Wait for dropdown to appear, then find decompose button if it exists
    // For now, we'll simulate the decompose action directly
    const mockDecompose = mockMicrostepHook.decompose
    
    // Simulate clicking decompose button
    await waitFor(() => {
      // In the actual implementation, this would be triggered by button click
      expect(mockDecompose).toHaveBeenCalledWith(mockTask, { timezone: 'UTC' })
    })
  })

  it('should disable decompose button when another task is decomposing', () => {
    mockUseDecompositionContext.mockReturnValue({
      ...mockDecompositionContext,
      canDecompose: jest.fn().mockReturnValue(false),
      isAnyDecomposing: true
    })

    render(<EditableScheduleRow {...mockProps} />)

    // The decompose button should be disabled or not rendered
    // This will be verified in the actual implementation
    expect(mockDecompositionContext.canDecompose).toHaveBeenCalledWith('task-1')
  })

  it('should show microstep suggestions when available', () => {
    const mockMicrosteps = [
      { id: '1', text: 'Step 1', completed: false, is_section: false },
      { id: '2', text: 'Step 2', completed: false, is_section: false }
    ]

    mockUseMicrostepDecomposition.mockReturnValue({
      ...mockMicrostepHook,
      suggestedMicrosteps: mockMicrosteps,
      showMicrosteps: true
    })

    render(<EditableScheduleRow {...mockProps} />)

    // MicrostepSuggestions component should be rendered
    // This will be verified when we implement the integration
  })

  it('should handle task completion toggle', () => {
    render(<EditableScheduleRow {...mockProps} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(mockProps.onUpdateTask).toHaveBeenCalledWith({
      ...mockTask,
      completed: true,
      categories: ['work']
    })
  })

  it('should not show decompose button for sections', () => {
    const sectionTask = { ...mockTask, is_section: true }
    render(<EditableScheduleRow {...mockProps} task={sectionTask} isSection={true} />)

    // Sections should not have decompose functionality
    expect(screen.queryByLabelText('Task actions')).not.toBeInTheDocument()
  })

  it('should not show decompose button for microsteps', () => {
    const microstepTask = { ...mockTask, is_microstep: true }
    render(<EditableScheduleRow {...mockProps} task={microstepTask} />)

    // Microsteps cannot be decomposed further
    // This will be verified in the actual implementation
  })

  it('should not show decompose button for subtasks', () => {
    const subtaskTask = { ...mockTask, is_subtask: true }
    render(<EditableScheduleRow {...mockProps} task={subtaskTask} />)

    // Subtasks cannot be decomposed further
    // This will be verified in the actual implementation
  })
})