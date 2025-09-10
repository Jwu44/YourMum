import { renderHook, act, waitFor } from '@testing-library/react'
import { useToast } from '@/hooks/use-toast'
import { handleMicrostepDecomposition } from '@/lib/helper'
import { useMicrostepDecomposition } from '../useMicrostepDecomposition'
import { type Task } from '@/lib/types'

// Mock dependencies
jest.mock('@/hooks/use-toast')
jest.mock('@/lib/helper')

const mockToast = jest.fn()
const mockHandleMicrostepDecomposition = handleMicrostepDecomposition as jest.MockedFunction<typeof handleMicrostepDecomposition>

;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })

describe('useMicrostepDecomposition', () => {
  const mockTask: Task = {
    id: 'task-1',
    text: 'Test task',
    completed: false,
    is_section: false,
    categories: ['work']
  }

  const mockFormData = { timezone: 'UTC' }
  
  const mockMicrostepResponse = [
    { text: 'Step 1', rationale: 'First step' },
    { text: 'Step 2', rationale: 'Second step' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useMicrostepDecomposition())

    expect(result.current.isDecomposing).toBe(false)
    expect(result.current.suggestedMicrosteps).toEqual([])
    expect(result.current.showMicrosteps).toBe(false)
  })

  it('should handle successful decomposition', async () => {
    mockHandleMicrostepDecomposition.mockResolvedValueOnce(mockMicrostepResponse)

    const { result } = renderHook(() => useMicrostepDecomposition())

    await act(async () => {
      await result.current.decompose(mockTask, mockFormData)
    })

    expect(result.current.isDecomposing).toBe(false)
    expect(result.current.showMicrosteps).toBe(true)
    expect(result.current.suggestedMicrosteps).toHaveLength(2)
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Select which microsteps to add'
    })
  })

  it('should handle decomposition errors', async () => {
    const error = new Error('API Error')
    mockHandleMicrostepDecomposition.mockRejectedValueOnce(error)

    const { result } = renderHook(() => useMicrostepDecomposition())

    await act(async () => {
      await result.current.decompose(mockTask, mockFormData)
    })

    await waitFor(() => {
      expect(result.current.isDecomposing).toBe(false)
      expect(result.current.showMicrosteps).toBe(false)
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'API Error',
        variant: 'destructive'
      })
    })
  })

  it('should accept microstep and remove from suggestions', async () => {
    const { result } = renderHook(() => useMicrostepDecomposition())
    
    // Set up initial state
    act(() => {
      result.current.setSuggestedMicrosteps([
        { id: '1', text: 'Step 1', completed: false, is_section: false },
        { id: '2', text: 'Step 2', completed: false, is_section: false }
      ])
      result.current.setShowMicrosteps(true)
    })

    const mockCallback = jest.fn()
    const microstepToAccept = result.current.suggestedMicrosteps[0]

    act(() => {
      result.current.acceptMicrostep(microstepToAccept, mockCallback)
    })

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Step 1',
        is_subtask: true
      }))
      expect(result.current.suggestedMicrosteps).toHaveLength(1)
    })
  })

  it('should reject microstep and remove from suggestions', () => {
    const { result } = renderHook(() => useMicrostepDecomposition())
    
    // Set up initial state
    act(() => {
      result.current.setSuggestedMicrosteps([
        { id: '1', text: 'Step 1', completed: false, is_section: false },
        { id: '2', text: 'Step 2', completed: false, is_section: false }
      ])
    })

    const microstepToReject = result.current.suggestedMicrosteps[0]

    act(() => {
      result.current.rejectMicrostep(microstepToReject)
    })

    expect(result.current.suggestedMicrosteps).toHaveLength(1)
    expect(result.current.suggestedMicrosteps[0].id).toBe('2')
  })

  it('should hide microsteps when all are processed', () => {
    const { result } = renderHook(() => useMicrostepDecomposition())
    
    // Set up initial state with one microstep
    act(() => {
      result.current.setSuggestedMicrosteps([
        { id: '1', text: 'Step 1', completed: false, is_section: false }
      ])
      result.current.setShowMicrosteps(true)
    })

    const microstepToReject = result.current.suggestedMicrosteps[0]

    act(() => {
      result.current.rejectMicrostep(microstepToReject)
    })

    expect(result.current.showMicrosteps).toBe(false)
    expect(result.current.suggestedMicrosteps).toHaveLength(0)
  })
})