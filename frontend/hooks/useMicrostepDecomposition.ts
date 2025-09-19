import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { handleMicrostepDecomposition } from '@/lib/helper'
import { type Task } from '@/lib/types'

interface MicrostepDecompositionState {
  isDecomposing: boolean
  suggestedMicrosteps: Task[]
  showMicrosteps: boolean
}

interface MicrostepDecompositionActions {
  decompose: (task: Task, formData: any) => Promise<void>
  acceptMicrostep: (microstep: Task, onUpdateTask: (task: Task) => void) => void
  rejectMicrostep: (microstep: Task) => void
  setSuggestedMicrosteps: (microsteps: Task[]) => void
  setShowMicrosteps: (show: boolean) => void
  clearMicrosteps: () => void
}

type UseMicrostepDecompositionReturn = MicrostepDecompositionState & MicrostepDecompositionActions

/**
 * Custom hook for managing microstep decomposition state and operations
 * 
 * Handles:
 * - API calls for task decomposition
 * - State management for microstep suggestions
 * - Accept/reject operations
 * - Error handling and user feedback
 */
export const useMicrostepDecomposition = (): UseMicrostepDecompositionReturn => {
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [suggestedMicrosteps, setSuggestedMicrosteps] = useState<Task[]>([])
  const [showMicrosteps, setShowMicrosteps] = useState(false)
  
  const { toast } = useToast()

  /**
   * Decomposes a task into microsteps using AI
   */
  const decompose = useCallback(async (task: Task, formData: any) => {
    try {
      setIsDecomposing(true)
      setShowMicrosteps(false)

      // Get microstep texts from backend
      const microstepTexts = await handleMicrostepDecomposition(task, formData)

      // Convert microstep texts into full Task objects
      const microstepTasks = microstepTexts.map((step: string | {
        text: string
        rationale?: string
        estimated_time?: string
        energy_level_required?: 'low' | 'medium' | 'high'
      }) => {
        // Handle both string and object formats
        const isObject = typeof step !== 'string'
        const text = isObject ? step.text : step
        const rationale = isObject ? step.rationale : undefined
        const estimatedTime = isObject ? step.estimated_time : undefined
        const energyLevel = isObject ? step.energy_level_required : undefined

        return {
          id: crypto?.randomUUID?.() || `microstep-${Date.now()}-${Math.random()}`,
          text,
          rationale,
          estimated_time: estimatedTime,
          energy_level_required: energyLevel,
          is_microstep: true,
          completed: false,
          is_section: false,
          section: task.section,
          parent_id: task.id,
          level: (task.level || 0) + 1,
          type: 'microstep',
          categories: task.categories || [],
          section_index: 0
        }
      })

      setSuggestedMicrosteps(microstepTasks)
      setShowMicrosteps(true)

      toast({
        title: 'Success!',
        description: 'Select relevant subtasks to add.',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error decomposing task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to break down task.',
        variant: 'destructive'
      })
    } finally {
      setIsDecomposing(false)
    }
  }, [toast])

  /**
   * Accepts a microstep suggestion and converts it to a subtask
   * Uses a direct callback approach to avoid complex state synchronization issues
   */
  const acceptMicrostep = useCallback((
    microstep: Task, 
    onDirectInsert: (newSubtask: Task, parentId: string) => void
  ) => {
    try {
      // Create a new subtask from the microstep
      const newSubtask: Task = {
        ...microstep,
        id: crypto?.randomUUID?.() || `subtask-${Date.now()}-${Math.random()}`,
        is_subtask: true,
        is_microstep: false,
        type: 'task',
        start_time: null,
        end_time: null,
        is_recurring: null,
        section_index: 0
      }

      console.log('🚀 Creating microstep subtask:', {
        text: newSubtask.text,
        parentId: newSubtask.parent_id
      })

      // Use direct insertion callback instead of generic update function
      onDirectInsert(newSubtask, microstep.parent_id!)

      // Remove from suggestions
      setSuggestedMicrosteps(prev => {
        const filtered = prev.filter(step => step.id !== microstep.id)
        // Hide microsteps if this was the last one
        if (filtered.length === 0) {
          setShowMicrosteps(false)
        }
        return filtered
      })
    } catch (error) {
      console.error('Error accepting microstep:', error)
      toast({
        title: 'Error',
        description: 'Failed to add subtask to schedule.',
        variant: 'destructive'
      })
    }
  }, [toast])

  /**
   * Rejects a microstep suggestion
   */
  const rejectMicrostep = useCallback((microstep: Task) => {
    setSuggestedMicrosteps(prev => {
      const filtered = prev.filter(step => step.id !== microstep.id)
      // Hide microsteps if this was the last one
      if (filtered.length === 0) {
        setShowMicrosteps(false)
      }
      return filtered
    })
  }, [])

  /**
   * Clears all microstep suggestions
   */
  const clearMicrosteps = useCallback(() => {
    setSuggestedMicrosteps([])
    setShowMicrosteps(false)
  }, [])

  return {
    // State
    isDecomposing,
    suggestedMicrosteps,
    showMicrosteps,
    // Actions
    decompose,
    acceptMicrostep,
    rejectMicrostep,
    setSuggestedMicrosteps,
    setShowMicrosteps,
    clearMicrosteps
  }
}