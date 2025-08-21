import React, { createContext, useContext, useState } from 'react'

/**
 * Context for tracking global drag state across the application
 * 
 * Following dev-guide principles:
 * - Simple implementation with minimal state
 * - TypeScript strict mode with proper interfaces
 * - Clear separation of concerns
 */

interface DragStateContextType {
  isDraggingAny: boolean
  setIsDraggingAny: (isDragging: boolean) => void
}

const DragStateContext = createContext<DragStateContextType | undefined>(undefined)

/**
 * Provider component for drag state context
 * Wraps components that need to be aware of global drag operations
 */
export const DragStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDraggingAny, setIsDraggingAny] = useState(false)

  return (
    <DragStateContext.Provider value={{ isDraggingAny, setIsDraggingAny }}>
      {children}
    </DragStateContext.Provider>
  )
}

/**
 * Custom hook for consuming drag state context
 * Provides isDraggingAny state and setter function
 */
export const useDragState = (): DragStateContextType => {
  const context = useContext(DragStateContext)
  
  if (context === undefined) {
    throw new Error('useDragState must be used within a DragStateProvider')
  }
  
  return context
}