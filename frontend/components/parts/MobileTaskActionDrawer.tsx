import React, { useCallback } from 'react'
import { Pickaxe, Pencil, Archive, Trash2 } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type Task } from '@/lib/types'
import { triggerHapticFeedback, HapticPatterns } from '@/lib/haptics'

interface MobileTaskActionDrawerProps {
  /** The task for which actions are being shown */
  task: Task
  /** Whether the drawer is open */
  isOpen: boolean
  /** Callback to close the drawer */
  onClose: () => void
  /** Callback for breakdown action (optional - only shown if provided and applicable) */
  onBreakdown?: () => void
  /** Callback for edit action */
  onEdit?: () => void
  /** Callback for archive action (optional - only shown if provided and applicable) */
  onArchive?: () => void
  /** Callback for delete action */
  onDelete?: () => void
}

interface ActionOption {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  variant?: 'default' | 'destructive'
  show: boolean
}

/**
 * Mobile Task Action Drawer
 *
 * Bottom slide-up drawer for mobile task actions, replacing hover menu.
 * Dynamically shows applicable actions based on task type and available handlers.
 */
const MobileTaskActionDrawer: React.FC<MobileTaskActionDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onBreakdown,
  onEdit,
  onArchive,
  onDelete
}) => {
  // Determine which actions should be shown based on task type and available handlers
  const actionOptions: ActionOption[] = [
    {
      id: 'breakdown',
      label: 'Breakdown',
      icon: Pickaxe,
      action: () => {
        triggerHapticFeedback(HapticPatterns.TAP)
        onBreakdown?.()
        onClose()
      },
      variant: 'default',
      // Show breakdown only for decomposable tasks (not sections, not microsteps, not subtasks)
      show: !!(onBreakdown && !task.is_section && !task.is_microstep && !task.is_subtask)
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Pencil,
      action: () => {
        triggerHapticFeedback(HapticPatterns.TAP)
        onEdit?.()
        onClose()
      },
      variant: 'default',
      // Edit is always available if handler is provided
      show: !!onEdit
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      action: () => {
        triggerHapticFeedback(HapticPatterns.TAP)
        onArchive?.()
        onClose()
      },
      variant: 'default',
      // Show archive only for non-section tasks
      show: !!(onArchive && !task.is_section)
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      action: () => {
        triggerHapticFeedback(HapticPatterns.TAP)
        onDelete?.()
        onClose()
      },
      variant: 'destructive',
      // Delete is always available if handler is provided
      show: !!onDelete
    }
  ]

  // Filter to only show applicable actions
  const visibleActions = actionOptions.filter(action => action.show)

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="focus:outline-none">
        <div className="px-4 py-4">
          <div className="space-y-2">
            {visibleActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="lg"
                className={cn(
                  'w-full justify-start h-14 text-base font-normal',
                  action.variant === 'destructive'
                    ? 'text-destructive hover:text-destructive'
                    : 'text-foreground'
                )}
                onClick={action.action}
              >
                <div className="flex items-center gap-3 w-full">
                  {action.id === 'breakdown' ? (
                    <div className="h-8 w-8 p-0 gradient-accent flex items-center justify-center rounded-md flex-shrink-0">
                      <action.icon className="h-4 w-4 animate-sparkle text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                      <action.icon className={cn(
                        "h-5 w-5",
                        action.variant === 'destructive' && 'text-destructive'
                      )} />
                    </div>
                  )}
                  <span className={cn(
                    action.variant === 'destructive' && 'text-destructive'
                  )}>
                    {action.label}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default MobileTaskActionDrawer