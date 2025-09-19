import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { DecompositionProvider, useDecompositionContext } from '../DecompositionContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DecompositionProvider>{children}</DecompositionProvider>
)

describe('DecompositionContext', () => {
  it('should initialize with no task being decomposed', () => {
    const { result } = renderHook(() => useDecompositionContext(), { wrapper })

    expect(result.current.decomposingTaskId).toBeNull()
    expect(result.current.isAnyDecomposing).toBe(false)
  })

  it('should set decomposing task and prevent other decompositions', () => {
    const { result } = renderHook(() => useDecompositionContext(), { wrapper })

    act(() => {
      result.current.setDecomposingTask('task-1')
    })

    expect(result.current.decomposingTaskId).toBe('task-1')
    expect(result.current.isAnyDecomposing).toBe(true)
    expect(result.current.canDecompose('task-2')).toBe(false)
    expect(result.current.canDecompose('task-1')).toBe(true)
  })

  it('should clear decomposing task', () => {
    const { result } = renderHook(() => useDecompositionContext(), { wrapper })

    act(() => {
      result.current.setDecomposingTask('task-1')
    })

    expect(result.current.isAnyDecomposing).toBe(true)

    act(() => {
      result.current.clearDecomposingTask()
    })

    expect(result.current.decomposingTaskId).toBeNull()
    expect(result.current.isAnyDecomposing).toBe(false)
    expect(result.current.canDecompose('task-2')).toBe(true)
  })

  it('should allow decomposition of the same task that is already decomposing', () => {
    const { result } = renderHook(() => useDecompositionContext(), { wrapper })

    act(() => {
      result.current.setDecomposingTask('task-1')
    })

    expect(result.current.canDecompose('task-1')).toBe(true)
  })

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      renderHook(() => useDecompositionContext())
    }).toThrow('useDecompositionContext must be used within a DecompositionProvider')

    consoleError.mockRestore()
  })
})