import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface DecompositionContextValue {
  decomposingTaskId: string | null
  isAnyDecomposing: boolean
  setDecomposingTask: (taskId: string) => void
  clearDecomposingTask: () => void
  canDecompose: (taskId: string) => boolean
}

const DecompositionContext = createContext<DecompositionContextValue | undefined>(undefined)

interface DecompositionProviderProps {
  children: ReactNode
}

/**
 * Provider component for managing global decomposition state
 * 
 * Prevents concurrent task decompositions by tracking which task
 * is currently being decomposed and providing utilities to check
 * if a task can be decomposed.
 */
export const DecompositionProvider: React.FC<DecompositionProviderProps> = ({ children }) => {
  const [decomposingTaskId, setDecomposingTaskId] = useState<string | null>(null)

  const setDecomposingTask = useCallback((taskId: string) => {
    setDecomposingTaskId(taskId)
  }, [])

  const clearDecomposingTask = useCallback(() => {
    setDecomposingTaskId(null)
  }, [])

  const canDecompose = useCallback((taskId: string) => {
    // Can decompose if no task is being decomposed, or if it's the same task
    return decomposingTaskId === null || decomposingTaskId === taskId
  }, [decomposingTaskId])

  const isAnyDecomposing = decomposingTaskId !== null

  const value: DecompositionContextValue = {
    decomposingTaskId,
    isAnyDecomposing,
    setDecomposingTask,
    clearDecomposingTask,
    canDecompose
  }

  return (
    <DecompositionContext.Provider value={value}>
      {children}
    </DecompositionContext.Provider>
  )
}

/**
 * Hook to access decomposition context
 * 
 * @throws Error if used outside DecompositionProvider
 */
export const useDecompositionContext = (): DecompositionContextValue => {
  const context = useContext(DecompositionContext)
  if (context === undefined) {
    throw new Error('useDecompositionContext must be used within a DecompositionProvider')
  }
  return context
}