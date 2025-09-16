import React, { useState, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import data from '@emoji-mart/data'
import { motion } from 'framer-motion'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import MicrostepSuggestions from '@/components/parts/MicrostepSuggestions'
import MobileTaskActionDrawer from '@/components/parts/MobileTaskActionDrawer'
import { TypographyH4 } from '@/app/dashboard/fonts/text'
import { Pickaxe, Loader2, MoreHorizontal, Pencil, Trash2, Archive, GripVertical, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForm } from '../../lib/FormContext'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  type Task
} from '../../lib/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { triggerHapticFeedback, HapticPatterns } from '@/lib/haptics'

// Import our new hooks and contexts
import { useDragDropTask } from '../../hooks/use-drag-drop-task'
import { useDragState } from '../../contexts/DragStateContext'
import { useMicrostepDecomposition } from '@/hooks/useMicrostepDecomposition'
import { useDecompositionContext } from '@/contexts/DecompositionContext'

interface CustomDropdownItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface EditableScheduleRowProps {
  task: Task
  index: number
  onUpdateTask: (task: Task) => void
  moveTask: (dragIndex: number, hoverIndex: number, dragType: 'indent' | 'outdent' | 'reorder', targetSection: string | null) => void
  isSection: boolean
  children?: React.ReactNode
  allTasks: Task[]
  onEditTask?: (task: Task) => void // New prop for edit functionality
  onDeleteTask?: (task: Task) => void // New prop for delete functionality
  onArchiveTask?: (task: Task) => void // New prop for archive functionality
  onMicrostepInsert?: (newSubtask: Task, parentId: string) => void // New prop for simplified microstep insertion
  customDropdownItems?: CustomDropdownItem[] // Custom dropdown items for specific contexts
}

/**
 * Get custom emoji from localStorage
 */
const getCustomEmojis = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem('sectionCustomEmojis')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * Save custom emoji to localStorage
 */
const saveCustomEmoji = (sectionName: string, emoji: string) => {
  if (typeof window === 'undefined') return
  try {
    const customEmojis = getCustomEmojis()
    customEmojis[sectionName] = emoji
    localStorage.setItem('sectionCustomEmojis', JSON.stringify(customEmojis))
  } catch (error) {
    console.error('Failed to save custom emoji:', error)
  }
}

/**
 * Common emojis for quick selection
 */
const COMMON_EMOJIS = [
  '⚡️', '✏️', '☕️', '🌅', '🌆', '🎑', '🦕',
  '🎯', '💼', '🏠', '💪', '🧠', '❤️', '🎉',
  '📚', '🍎', '🚀', '⭐', '🔥', '💎', '🌟',
  '📝', '💻', '🎨', '🎵', '🏃', '🛏️', '🍽️'
]

/**
 * Simple emoji picker component using Popover
 */
interface EmojiPickerProps {
  currentEmoji: string
  onEmojiChange: (emoji: string) => void
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ currentEmoji, onEmojiChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Lazy-load Emoji Mart Picker (@emoji-mart/react) for SSR safety
  const EmojiMartPicker = useMemo(() => (
    dynamic(() => import('@emoji-mart/react'), { ssr: false })
  ), [])

  const handleEmojiSelect = useCallback((emoji: string) => {
    onEmojiChange(emoji)
    setIsOpen(false)
  }, [onEmojiChange])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'text-lg cursor-pointer transition-all duration-200 select-none border-none bg-transparent p-1 rounded hover-selection',
            isHovered && 'scale-110'
          )}
          onMouseEnter={() => { setIsHovered(true) }}
          onMouseLeave={() => { setIsHovered(false) }}
          title="Click to change emoji"
        >
          {currentEmoji}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 border-0 shadow-none bg-transparent">
        {/* Emoji Mart Picker */}
        <EmojiMartPicker
          data={data}
          onEmojiSelect={(e: any) => {
            const native = e?.native
            if (typeof native === 'string' && native.length > 0) {
              handleEmojiSelect(native)
            }
          }}
          theme="light"
          previewPosition="none"
          skinTonePosition="search"
          perLine={8}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Get the appropriate logo for a task based on its source
 * Returns the logo element or null if no logo should be displayed
 */
const getTaskSourceLogo = (task: Task): React.ReactNode => {
  // Only show logos for non-section tasks
  if (task.is_section) return null

  // Check for Slack source
  if (task.source === 'slack') {
    return (
      <img
        src="/images/integrations/slack_logo_task.svg"
        alt="Slack"
        className="flex-shrink-0"
        width={16}
        height={16}
      />
    )
  }

  // Check for Google Calendar source (identified by gcal_event_id)
  if (task.gcal_event_id || task.source === 'calendar') {
    return (
      <img
        src="/images/integrations/gcal_logo_task.svg"
        alt="Google Calendar"
        className="flex-shrink-0"
        width={16}
        height={16}
      />
    )
  }

  return null
}

/**
 * Get the appropriate emoji for a section based on its name
 * First checks for custom emojis, then falls back to hardcoded mapping
 */
const getSectionIcon = (sectionName: string, onEmojiChange?: (emoji: string) => void): React.ReactNode => {
  const customEmojis = getCustomEmojis()

  // Check for custom emoji first
  if (customEmojis[sectionName]) {
    return (
      <EmojiPicker
        currentEmoji={customEmojis[sectionName]}
        onEmojiChange={(emoji) => {
          saveCustomEmoji(sectionName, emoji)
          onEmojiChange?.(emoji)
        }}
      />
    )
  }

  const lowerName = sectionName.toLowerCase()
  let defaultEmoji = '🦕' // Default emoji

  // Category-based sections
  if (lowerName.includes('work')) {
    defaultEmoji = '💼'
  } else if (lowerName.includes('relationships')) {
    defaultEmoji = '❤️'
  } else if (lowerName.includes('fun')) {
    defaultEmoji = '🎉'
  } else if (lowerName.includes('ambition')) {
    defaultEmoji = '🚀'
  } else if (lowerName.includes('exercise')) {
    defaultEmoji = '🍎'
  }
  // Priority-based sections
  else if (lowerName.includes('high priority')) {
    defaultEmoji = '⚡️'
  } else if (lowerName.includes('medium priority')) {
    defaultEmoji = '✏️'
  } else if (lowerName.includes('low priority')) {
    defaultEmoji = '☕️'
  }
  // Time-based sections
  else if (lowerName.includes('morning')) {
    defaultEmoji = '🌅'
  } else if (lowerName.includes('afternoon') || lowerName.includes('arvo')) {
    defaultEmoji = '🌆'
  } else if (lowerName.includes('evening') || lowerName.includes('night')) {
    defaultEmoji = '🎑'
  }

  return (
    <EmojiPicker
      currentEmoji={defaultEmoji}
      onEmojiChange={(emoji) => {
        saveCustomEmoji(sectionName, emoji)
        onEmojiChange?.(emoji)
      }}
    />
  )
}

/**
 * EditableScheduleRow Component
 *
 * Renders a single task or section row with drag and drop functionality.
 *
 * Follows dev-guide principles:
 * - Simple implementation using @dnd-kit for drag and drop
 * - Modular architecture with clear separation of concerns
 * - Focus on rendering with drag logic handled by custom hooks
 *
 * Features:
 * - Drag and drop reordering with purple visual feedback
 * - Microstep decomposition for complex tasks
 * - Edit and delete actions
 * - Section and task rendering with proper styling
 * - Mobile-friendly touch support
 */
const EditableScheduleRow: React.FC<EditableScheduleRowProps> = ({
  task,
  index,
  onUpdateTask,
  moveTask,
  isSection,
  allTasks,
  onEditTask, // New prop for edit functionality
  onDeleteTask, // New prop for delete functionality
  onArchiveTask, // New prop for archive functionality
  onMicrostepInsert, // New prop for simplified microstep insertion
  customDropdownItems // Custom dropdown items for specific contexts
}) => {
  // Use our new drag drop hook instead of complex local state
  const dragDropHook = useDragDropTask({
    task,
    index,
    isSection,
    allTasks,
    moveTask
  })

  // Global drag state for suppressing hover effects
  const { isDraggingAny } = useDragState()

  // Mobile detection
  const isMobile = useIsMobile()

  // Refs for DOM measurements (keep for compatibility)
  const checkboxRef = useRef<HTMLDivElement>(null)

  // State to track dropdown menu visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  // Long press state for mobile drag
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [isDragMode, setIsDragMode] = useState(false)
  const [hasTouchMoved, setHasTouchMoved] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressStartTime = useRef<number>(0)

  // Hooks
  const { state: formData } = useForm()
  const { toast } = useToast()
  
  // Use new microstep decomposition hook
  const microstepHook = useMicrostepDecomposition()
  
  // Use decomposition context for global state management
  const decompositionContext = useDecompositionContext()

  // Memoize canDecompose calculation to prevent unnecessary re-renders
  const canDecompose = useMemo(() => {
    const isDecomposableType = !isSection && !task.is_microstep && !task.is_subtask
    return isDecomposableType && decompositionContext.canDecompose(task.id)
  }, [isSection, task.is_microstep, task.is_subtask, task.id, decompositionContext])

  // Add state for re-rendering when emoji changes (optimized)
  const [emojiVersion, setEmojiVersion] = useState(0)

  // Memoized callback to force re-render when emoji changes
  const handleEmojiChange = useCallback(() => {
    setEmojiVersion(prev => prev + 1)
  }, [])

  // Memoize expensive getSectionIcon computation to prevent localStorage access on every render
  const sectionIcon = useMemo(() => {
    if (!isSection) return null
    return getSectionIcon(task.text, handleEmojiChange)
  }, [isSection, task.text, handleEmojiChange, emojiVersion])

  // Handlers for task operations
  const handleToggleComplete = useCallback((checked: boolean) => {
    onUpdateTask({
      ...task,
      completed: checked,
      categories: task.categories || []
    })
  }, [task, onUpdateTask])

  /**
   * Handle edit task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleEditTask = useCallback(() => {
    try {
      if (onEditTask) {
        // 🔧 FIX: Add small delay to allow dropdown overlay cleanup
        // This prevents race condition between dropdown and drawer overlays
        setTimeout(() => {
          onEditTask(task)
        }, 50) // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering edit task:', error)
      toast({
        title: 'Error',
        description: 'Failed to open edit dialog',
        variant: 'destructive'
      })
    }
  }, [task, onEditTask, toast])

  /**
   * Handle delete task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleDeleteTask = useCallback(() => {
    try {
      if (onDeleteTask) {
        // 🔧 FIX: Add small delay to allow dropdown overlay cleanup
        // This prevents race condition between dropdown overlays
        setTimeout(() => {
          onDeleteTask(task)
        }, 50) // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering delete task:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive'
      })
    }
  }, [task, onDeleteTask, toast])

  /**
   * Handle archive task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleArchiveTask = useCallback(() => {
    try {
      if (onArchiveTask) {
        // Add small delay to allow dropdown overlay cleanup
        setTimeout(() => {
          onArchiveTask(task)
        }, 50) // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering archive task:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive task',
        variant: 'destructive'
      })
    }
  }, [task, onArchiveTask, toast])

  /**
   * Handle mobile tap to open action drawer
   */
  const handleMobileTap = useCallback(() => {
    if (isMobile && !isSection && !isDragMode) {
      triggerHapticFeedback(HapticPatterns.TAP)
      setIsMobileDrawerOpen(true)
    }
  }, [isMobile, isSection, isDragMode])

  /**
   * Handle mobile drawer close
   */
  const handleMobileDrawerClose = useCallback(() => {
    setIsMobileDrawerOpen(false)
  }, [])

  /**
   * Scroll-friendly touch handlers for mobile
   * Only treats touches as intentional taps when there's minimal movement
   */
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null)
  const TOUCH_MOVEMENT_THRESHOLD = 10 // pixels

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isSection) return

    // Store initial touch position for movement detection
    const touch = e.touches[0]
    touchStartPosition.current = { x: touch.clientX, y: touch.clientY }

    longPressStartTime.current = Date.now()
    setIsLongPressing(true)
    setHasTouchMoved(false)

    // Start long press timer (600ms threshold - increased to avoid conflicts with scrolling)
    longPressTimer.current = setTimeout(() => {
      // Only trigger drag mode if user hasn't moved significantly
      if (!hasTouchMoved) {
        // Clear any existing text selection to prevent interference
        if (document.getSelection) {
          const selection = document.getSelection()
          if (selection && selection.removeAllRanges) {
            selection.removeAllRanges()
          }
        }

        triggerHapticFeedback(HapticPatterns.LONG_PRESS)
        setIsDragMode(true)
        setIsLongPressing(false)

        // Trigger drag start if we have listeners
        if (dragDropHook.listeners && typeof dragDropHook.listeners.onTouchStart === 'function') {
          dragDropHook.listeners.onTouchStart(e as any)
        }
      }
    }, 600) // Increased from 500ms to reduce conflicts with scroll gestures
  }, [isMobile, isSection, dragDropHook.listeners, hasTouchMoved])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isSection) return

    const pressDuration = Date.now() - longPressStartTime.current

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    setIsLongPressing(false)

    // Only treat as tap if it was short, didn't move, and not in drag mode
    // Also ensure minimal movement (< 10px) to distinguish from scroll
    if (pressDuration < 600 && !isDragMode && !hasTouchMoved) {
      handleMobileTap()
    }

    // Exit drag mode on touch end
    if (isDragMode) {
      setIsDragMode(false)

      // Trigger drag end if we have listeners
      if (dragDropHook.listeners && typeof dragDropHook.listeners.onTouchEnd === 'function') {
        dragDropHook.listeners.onTouchEnd(e as any)
      }
    }

    // Reset touch position
    touchStartPosition.current = null
  }, [isMobile, isSection, isDragMode, handleMobileTap, hasTouchMoved, dragDropHook.listeners])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || isSection) return

    // Calculate movement distance from start position
    const touch = e.touches[0]
    if (touchStartPosition.current) {
      const deltaX = Math.abs(touch.clientX - touchStartPosition.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartPosition.current.y)
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Detect if this is primarily a vertical scroll gesture
      if (totalMovement > TOUCH_MOVEMENT_THRESHOLD) {
        // If movement is primarily vertical (scroll gesture), don't interfere
        if (deltaY > deltaX && deltaY > TOUCH_MOVEMENT_THRESHOLD) {
          setHasTouchMoved(true)

          // Cancel long press immediately for scroll gestures
          if (isLongPressing && longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
            setIsLongPressing(false)
          }

          // Don't prevent default for vertical scrolling - let browser handle it
          return
        }

        // For non-vertical movement, mark as moved for potential drag
        setHasTouchMoved(true)

        // Cancel long press on significant movement (likely intentional drag preparation)
        if (isLongPressing && longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
          setIsLongPressing(false)
        }
      }
    }

    // If we're in drag mode, handle drag move
    if (isDragMode && dragDropHook.listeners && typeof dragDropHook.listeners.onTouchMove === 'function') {
      dragDropHook.listeners.onTouchMove(e as any)
    }
  }, [isMobile, isSection, isDragMode, isLongPressing, dragDropHook.listeners])

  // Cleanup long press timer on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  // TODO: Remove old drag handlers - replaced by @dnd-kit hook
  // The old handlers (handleDragStart, handleDragOver, etc.) are no longer needed
  // @dnd-kit handles all drag events through the hook

  // Progressive visual feedback system for indentation levels
  // Shows increasingly complex purple lines based on target indentation depth
  const getDragIndicators = useCallback(() => {
    // Only show indicators when this task is being hovered over as a drop target
    if (!dragDropHook.isOver || dragDropHook.isDragging) return null

    // For sections, always show the regular purple reorder line
    if (isSection) {
      return (
        <div className="absolute right-0 left-0 h-1 bg-purple-500 opacity-60 bottom-[-1px]" />
      )
    }

    const { dragType, targetIndentLevel } = dragDropHook.indentationState
    const currentDragType = dragType || 'reorder'

    // Progressive opacity system based on requirements
    const renderProgressiveIndentLine = (levels: number) => {
      // Cap at 4 segments maximum as per requirements
      const segmentCount = Math.min(levels, 4)
      const segments = []

      // Responsive visual feedback to match actual drag zones
      // Mobile: 40% outdent/reorder : 60% indent
      // Desktop: 10% outdent/reorder : 90% indent
      const firstSegmentWidth = isMobile ? 40 : 10 // Mobile: 40%, Desktop: 10%
      const remainingWidth = isMobile ? 60 : 90 // Mobile: 60%, Desktop: 90%

      // Always have at least 2 segments total (dark + regular)
      const totalSegments = Math.max(segmentCount, 2)
      const otherSegmentWidth = remainingWidth / (totalSegments - 1)

      for (let i = 0; i < totalSegments; i++) {
        const isFirst = i === 0
        const width = isFirst ? firstSegmentWidth : otherSegmentWidth

        // Progressive opacity: darkest to lightest (using inline styles for dynamic values)
        const opacity = isFirst ? 0.9 : Math.max(0.6 - (i - 1) * 0.15, 0.6)
        const backgroundColor = isFirst ? '#7c3aed' : '#a855f7' // purple-600 : purple-500

        segments.push(
          <div
            key={i}
            style={{
              width: `${width}%`,
              backgroundColor,
              opacity
            }}
          />
        )
      }

      return (
        <div className="absolute right-0 left-0 h-1 bottom-[-1px] flex">
          {segments}
        </div>
      )
    }

    // Simplified visual feedback system
    switch (currentDragType) {
      case 'indent':
        // Progressive opacity based on target indent level
        const indentLevel = targetIndentLevel || 1
        return renderProgressiveIndentLine(indentLevel)

      case 'outdent':
        // Simple purple line for outdent
        return (
          <div className="absolute right-0 left-0 h-1 bg-purple-500 opacity-80 bottom-[-1px]" />
        )

      case 'reorder':
      default:
        // Simple purple line for reorder
        return (
          <div className="absolute right-0 left-0 h-1 bg-purple-500 opacity-60 bottom-[-1px]" />
        )
    }
  }, [dragDropHook.isOver, dragDropHook.isDragging, dragDropHook.indentationState.dragType, dragDropHook.indentationState.targetIndentLevel, isSection, task.text, isMobile])

  /**
   * Handles task decomposition using the new hook and context
   * 
   * Optimized version that uses the decomposition hook and prevents
   * concurrent decompositions across all tasks.
   */
  const handleDecompose = useCallback(async () => {
    // Guard clause - only proceed if decomposition is allowed
    if (!canDecompose || microstepHook.isDecomposing) return

    try {
      // Set global decomposition state to prevent concurrent operations
      decompositionContext.setDecomposingTask(task.id)
      
      // Use the hook to handle decomposition
      await microstepHook.decompose(task, formData)
    } catch (error) {
      // Error handling is managed by the hook
      console.error('Error in handleDecompose:', error)
    } finally {
      // Clear global decomposition state
      decompositionContext.clearDecomposingTask()
    }
  }, [canDecompose, microstepHook, decompositionContext, task, formData])

  /**
   * Handles user acceptance of a suggested microstep
   * 
   * Optimized version that uses the microstep hook for all logic
   */
  const handleMicrostepAccept = useCallback((microstep: Task) => {
    microstepHook.acceptMicrostep(microstep, onUpdateTask)
  }, [microstepHook, onUpdateTask])

  /**
   * Handles user rejection of a suggested microstep
   * 
   * Optimized version that uses the microstep hook for all logic
   */
  const handleMicrostepReject = useCallback((microstep: Task) => {
    microstepHook.rejectMicrostep(microstep)
  }, [microstepHook])

  // Enhanced task actions with decompose button and ellipses dropdown (Desktop only)
  const renderTaskActions = () => {
    // Don't render desktop actions on mobile - mobile uses tap drawer instead
    if (isMobile) return null

    return (
      <div
        className={cn(
          'flex items-center gap-2 transition-opacity duration-200',
          isDraggingAny ? 'opacity-0' : 'opacity-0 group-hover:opacity-100',
          isDropdownOpen && 'opacity-100' // Keep visible when dropdown is open
        )}
      >
      {/* Slack "View" link - only for top-level Slack tasks */}
      {task.source === 'slack' && !isSection && !task.is_section && !task.is_subtask && (
        (() => {
          const slackLink = task.slack_metadata?.deep_link || task.slack_metadata?.message_url || task.slack_message_url
          if (!slackLink) return null
          return (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <a href={slackLink} target="_blank" rel="noopener noreferrer" aria-label="View Slack message" className="inline-flex items-center gap-1">
                <ExternalLink className="h-4 w-4" />
                <span>View</span>
              </a>
            </Button>
          )
        })()
      )}
      {/* Decompose button - existing functionality */}
      {canDecompose && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDecompose}
              disabled={microstepHook.isDecomposing || !canDecompose}
              className="h-8 w-8 p-0 gradient-accent hover:bg-transparent text-primary-foreground hover:scale-105 transition-all duration-200"
            >
              {microstepHook.isDecomposing
                ? (
                <Loader2 className="h-4 w-4 animate-spin" />
                  )
                : (
                <Pickaxe className="h-4 w-4 animate-sparkle" />
                  )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Breakdown task</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Ellipses dropdown menu - new functionality */}
      <DropdownMenu onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            aria-label="Task actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {customDropdownItems ? (
            // Use custom dropdown items when provided
            customDropdownItems.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onClick={item.onClick}
                className={`flex items-center gap-2 cursor-pointer ${
                  item.variant === 'destructive' ? 'text-destructive hover-selection' : ''
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </DropdownMenuItem>
            ))
          ) : (
            // Default dropdown items
            <>
              <DropdownMenuItem
                onClick={handleEditTask}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {/* Archive option - only show for non-section tasks */}
              {!isSection && !task.is_section && onArchiveTask && (
                <DropdownMenuItem
                  onClick={handleArchiveTask}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDeleteTask}
                className="flex items-center gap-2 cursor-pointer text-destructive hover-selection"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {/* Container with grip positioned outside task row */}
      <div
        className={cn(
          'relative', // Use relative positioning for proper layout
          // Move group class to container so grip hover works
          !isSection && 'group'
        )}
        style={{
          marginLeft: (task.level && task.level > 0) ? `${task.level * 30}px` : 0
        }}
      >
        {/* Drag Handle - positioned absolutely outside task row */}
        {!isSection && (
          <div
            className={cn(
              // Use hook's grip classes only when no task is being dragged
              !isDraggingAny && dragDropHook.getGripClassName(),
              // When any task is dragging, use static classes without hover states
              isDraggingAny && 'opacity-0 cursor-grab transition-opacity duration-200 mr-2',
              'absolute left-[-24px] top-1/2 -translate-y-1/2 flex-shrink-0 z-10', // Position grip 24px to the left
              isMobile && 'hidden' // Hide grip entirely on mobile
            )}
            {...(dragDropHook.listeners || {})}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </div>
        )}

        {/* Main task row - now without internal grip */}
        <div
          ref={dragDropHook.setNodeRef}
          {...dragDropHook.attributes}
          data-sortable-id={task.id}
          className={cn(
            dragDropHook.getRowClassName(),
            isSection ? 'cursor-default' : '',
            microstepHook.isDecomposing && 'task-decomposing',
            // Mobile touch feedback
            isMobile && !isSection && 'active:scale-[0.98] transition-transform duration-100',
            // Long press visual feedback
            isLongPressing && 'scale-[1.02] shadow-lg',
            // Drag mode visual feedback
            isDragMode && 'scale-[1.05] shadow-xl z-50 rotate-1',
            // Section styling - removed px-4 to align with task content
            isSection ? 'mt-2.5 mb-2.5 w-full'
            // Task card styling - conditional right padding for mobile
              : isMobile
                ? 'p-4 pr-4 my-2 rounded-xl border border-border bg-card transition-[background-color,border-color,box-shadow,transform,scale] duration-200 shadow-soft w-full'
                : 'p-4 my-2 rounded-xl border border-border bg-card hover:bg-task-hover transition-[background-color,border-color,box-shadow] duration-200 shadow-soft w-full'
          )}
          style={{
            minHeight: isSection ? '48px' : 'auto',
            transform: dragDropHook.transform, // Only applies to actively dragged items
            // 🔧 FIX: Prevent shuffling - only dragged items get transform optimization
            willChange: dragDropHook.isDragging ? 'transform' : 'auto',
            // Only disable transitions for the actively dragged item
            transition: dragDropHook.isDragging ? 'none' : undefined
          }}
          // Desktop mouse events
          onMouseEnter={(e) => {
            // 🔧 FIX: Only track cursor position when this task is a drop target (isOver)
            // This ensures we track position relative to the TARGET task, not dragged task
            if (!isMobile && dragDropHook.isOver && !dragDropHook.isDragging) {
              dragDropHook.updateCursorPosition(e.clientX, e.clientY, e.currentTarget as HTMLElement)
            }
          }}
          onMouseMove={(e) => {
            // 🔧 FIX: Only track cursor position when this task is a drop target (isOver)
            // This enables real-time drag type updates relative to the TARGET task
            if (!isMobile && dragDropHook.isOver && !dragDropHook.isDragging) {
              dragDropHook.updateCursorPosition(e.clientX, e.clientY, e.currentTarget as HTMLElement)
            }
          }}
          // Mobile touch events
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {/* Task/Section Content */}
          {!isSection && (
            <div
              ref={checkboxRef}
              className={cn(
                "flex items-center",
                isMobile ? "p-2.5 -m-2.5" : "" // 44x44 touch target with centered 24x24 checkbox
              )}
              // Prevent touch events from bubbling to parent task row
              onTouchStart={(e) => {
                e.stopPropagation()
                if (isMobile) {
                  triggerHapticFeedback(HapticPatterns.TAP)
                }
              }}
              onTouchEnd={(e) => {
                e.stopPropagation()
              }}
              onTouchMove={(e) => {
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={handleToggleComplete}
                className="h-6 w-6 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200"
              />
            </div>
          )}

          {/* Task Source Logo - positioned 16px from checkbox, 8px from text */}
          {!isSection && getTaskSourceLogo(task) && (
            <div className="ml-4 mr-2 flex items-center">
              {getTaskSourceLogo(task)}
            </div>
          )}

          {isSection
            ? (
            <div className="flex items-center gap-3 py-3">
              {sectionIcon}
              <TypographyH4 className="text-foreground font-semibold mb-0">
                {task.text}
              </TypographyH4>
            </div>
              )
            : (
            <span
              className={cn(
                'flex-1 text-foreground transition-[color] duration-200',
                task.completed && 'line-through text-muted-foreground',
                // Add 16px left margin only when no logo is present
                !getTaskSourceLogo(task) && 'ml-4',
                // On mobile, extend to full width since no action buttons shown
                isMobile && 'pr-0',
                // Prevent text selection on mobile to avoid interference with drag positioning
                isMobile && 'select-none'
              )}
              style={{
                // Additional webkit-specific prevention for better mobile compatibility
                WebkitUserSelect: isMobile ? 'none' : 'auto',
                WebkitTouchCallout: isMobile ? 'none' : 'inherit'
              } as React.CSSProperties}
              data-task-content="true"
            >
              {task.start_time && task.end_time
                ? `${task.start_time} - ${task.end_time}: `
                : ''}
              {task.text}
            </span>
              )}

          {/* Task Actions - only show for non-section tasks */}
          {!isSection && renderTaskActions()}

          {/* Enhanced Drag Indicators */}
          {getDragIndicators()}
        </div>
      </div>

      {/* Microstep Suggestions */}
      {microstepHook.showMicrosteps && microstepHook.suggestedMicrosteps.length > 0 && (
        <MicrostepSuggestions
          microsteps={microstepHook.suggestedMicrosteps}
          onAccept={handleMicrostepAccept}
          onReject={handleMicrostepReject}
          className="mt-2"
        />
      )}

      {/* Mobile Action Drawer */}
      {isMobile && !isSection && (
        <MobileTaskActionDrawer
          task={task}
          isOpen={isMobileDrawerOpen}
          onClose={handleMobileDrawerClose}
          onBreakdown={canDecompose ? handleDecompose : undefined}
          onEdit={onEditTask ? () => onEditTask(task) : undefined}
          onArchive={onArchiveTask ? () => onArchiveTask(task) : undefined}
          onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
        />
      )}
    </motion.div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(EditableScheduleRow)
