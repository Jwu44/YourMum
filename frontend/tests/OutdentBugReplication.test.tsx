import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { useDragDropTask } from '../hooks/use-drag-drop-task'
import { useDragDropProvider } from '../hooks/use-drag-drop-provider'
import { type Task } from '../lib/types'

/**
 * Test to replicate the exact scenario from @image3.png
 * Task F (child) dragged to Task D (parent) red zone shows "indent | L:1" 
 * when it should show "outdent"
 */

// Exact mock data matching the scenario in image3.png
const mockTasksFromImage3: Task[] = [
  {
    id: 'task-d',
    text: 'Task D',
    completed: false,
    categories: ['Evening'],
    is_section: false,
    is_subtask: false,
    is_microstep: false,
    level: 0, // Parent level
    parent_id: null,
    section: 'Evening',
    section_index: 1,
    type: 'task'
  },
  {
    id: 'task-f',
    text: 'Task F',
    completed: false,
    categories: ['Evening'],
    is_section: false,
    is_subtask: true,
    is_microstep: false,
    level: 1, // Child level (indented)
    parent_id: 'task-d', // Child of Task D
    section: 'Evening',
    section_index: 2,
    type: 'task'
  }
]

// Test component that logs drag state for debugging
const DebuggingTaskRow: React.FC<{
  task: Task
  index: number
  allTasks: Task[]
  moveTask: jest.Mock
}> = ({ task, index, allTasks, moveTask }) => {
  
  const dragDropHook = useDragDropTask({
    task,
    index,
    isSection: false,
    allTasks,
    moveTask
  })

  // Log indentation state changes for debugging
  React.useEffect(() => {
    console.log(`📊 TASK ${task.text} INDENTATION STATE:`, {
      dragType: dragDropHook.indentationState.dragType,
      cursorPosition: dragDropHook.indentationState.cursorPosition,
      targetIndentLevel: dragDropHook.indentationState.targetIndentLevel,
      isDragging: dragDropHook.isDragging,
      isOver: dragDropHook.isOver
    })
  }, [dragDropHook.indentationState, dragDropHook.isDragging, dragDropHook.isOver, task.text])

  return (
    <div
      ref={dragDropHook.setNodeRef}
      {...dragDropHook.attributes}
      {...dragDropHook.listeners}
      data-testid={`task-${task.id}`}
      data-task-level={task.level || 0}
      data-sortable-id={task.id}
      className={dragDropHook.getRowClassName()}
      style={{ 
        transform: dragDropHook.transform,
        marginLeft: (task.level && task.level > 0) ? `${task.level * 30}px` : 0,
      }}
      onMouseMove={(e) => {
        // Simulate real drag behavior - only track when this is the drop target
        if (dragDropHook.isOver && !dragDropHook.isDragging) {
          console.log(`🖱️ MOUSE MOVE on ${task.text} at x=${e.clientX}`)
          dragDropHook.updateCursorPosition(e.clientX, e.clientY, e.currentTarget as HTMLElement)
        }
      }}
    >
      <span data-testid={`task-text-${task.id}`}>{task.text}</span>
      <div data-testid={`drag-type-${task.id}`} className="debug-info">
        {dragDropHook.indentationState.dragType} | L:{dragDropHook.indentationState.targetIndentLevel}
      </div>
    </div>
  )
}

// Full test component
const TestComponentWithDebugging: React.FC<{
  tasks: Task[]
  onMoveTask?: jest.Mock
  onReorderTasks?: jest.Mock
}> = ({ tasks, onMoveTask = jest.fn(), onReorderTasks = jest.fn() }) => {
  
  const dragDropProvider = useDragDropProvider({
    tasks,
    onReorderTasks,
    moveTask: onMoveTask
  })

  return (
    <DndContext
      sensors={dragDropProvider.sensors}
      collisionDetection={dragDropProvider.collisionDetection}
      onDragStart={dragDropProvider.onDragStart}
      onDragOver={dragDropProvider.onDragOver}
      onDragMove={dragDropProvider.onDragMove}
      onDragEnd={dragDropProvider.onDragEnd}
    >
      <SortableContext
        items={dragDropProvider.items}
        strategy={dragDropProvider.strategy}
      >
        <div data-testid="drag-container" style={{ width: '800px', height: '200px', position: 'relative' }}>
          {tasks.map((task, index) => (
            <DebuggingTaskRow
              key={task.id}
              task={task}
              index={index}
              allTasks={tasks}
              moveTask={onMoveTask}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

describe('Outdent Bug Replication (Image 3)', () => {
  let mockMoveTask: jest.Mock
  let mockReorderTasks: jest.Mock
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    mockMoveTask = jest.fn()
    mockReorderTasks = jest.fn()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('should replicate the exact scenario from image3.png', () => {
    render(
      <TestComponentWithDebugging 
        tasks={mockTasksFromImage3} 
        onMoveTask={mockMoveTask}
        onReorderTasks={mockReorderTasks}
      />
    )

    const taskD = screen.getByTestId('task-task-d') // Parent
    const taskF = screen.getByTestId('task-task-f') // Child

    // Verify initial setup matches image3.png
    expect(taskD).toHaveAttribute('data-task-level', '0')
    expect(taskF).toHaveAttribute('data-task-level', '1')
    expect(taskD).toHaveAttribute('data-sortable-id', 'task-d')
    expect(taskF).toHaveAttribute('data-sortable-id', 'task-f')

    // Get element bounds for precise red zone calculation
    const taskDRect = taskD.getBoundingClientRect()
    const redZoneX = taskDRect.left + (taskDRect.width * 0.05) // 5% into red zone (should be < 10%)
    const redZoneY = taskDRect.top + (taskDRect.height / 2)

    console.log('🎯 TEST SCENARIO: Task F → Task D red zone')
    console.log('🎯 Task D bounds:', taskDRect)
    console.log('🎯 Red zone X coordinate:', redZoneX)
    console.log('🎯 Expected: dragType should be "outdent"')

    // Simulate Task F being dragged over Task D's red zone
    fireEvent.mouseMove(taskD, {
      clientX: redZoneX,
      clientY: redZoneY
    })

    // Allow React to process state updates
    setTimeout(() => {
      // Check what dragType was calculated
      const dragTypeDisplay = screen.getByTestId('drag-type-task-d')
      console.log('🎯 RESULT: dragType display:', dragTypeDisplay.textContent)
      
      // This should show "outdent" but currently shows "indent | L:1"
      // The test will help us see the actual console logs to debug why
    }, 100)
  })

  it('should show detailed logging for debugging', () => {
    render(
      <TestComponentWithDebugging 
        tasks={mockTasksFromImage3} 
        onMoveTask={mockMoveTask}
        onReorderTasks={mockReorderTasks}
      />
    )

    console.log('🐛 DEBUG TEST: Checking task relationships')
    console.log('🐛 Task D:', mockTasksFromImage3[0])
    console.log('🐛 Task F:', mockTasksFromImage3[1])
    console.log('🐛 Task F parent_id:', mockTasksFromImage3[1].parent_id)
    console.log('🐛 Task D id:', mockTasksFromImage3[0].id)
    console.log('🐛 Should draggedTaskIsOverItsParent be true?', mockTasksFromImage3[1].parent_id === mockTasksFromImage3[0].id)

    // This test will show us the debug logs when the component renders
    expect(screen.getByTestId('task-task-d')).toBeInTheDocument()
    expect(screen.getByTestId('task-task-f')).toBeInTheDocument()
  })

  it('should demonstrate the exact bug described in the issue', () => {
    render(
      <TestComponentWithDebugging 
        tasks={mockTasksFromImage3} 
        onMoveTask={mockMoveTask}
        onReorderTasks={mockReorderTasks}
      />
    )

    // This is the bug: Task F (child) dragged to Task D (parent) red zone 
    // currently shows "indent | L:1" when it should show "outdent"
    
    const taskD = screen.getByTestId('task-task-d')
    const taskF = screen.getByTestId('task-task-f')

    // Task F is at level 1, parent is Task D
    expect(taskF).toHaveAttribute('data-task-level', '1')
    
    // When Task F is dragged over Task D's red zone, it should trigger outdent
    // But currently it's showing indent - this test will help us see why
    
    expect(taskD).toBeInTheDocument()
    expect(taskF).toBeInTheDocument()
  })
})