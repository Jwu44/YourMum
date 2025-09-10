import React, { useCallback, useMemo } from 'react'
import { type Task } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface MicrostepSuggestionsProps {
  microsteps: Task[]
  onAccept: (microstep: Task) => void
  onReject: (microstep: Task) => void
  className?: string
}

/**
 * Optimized MicrostepSuggestions component
 * 
 * Performance improvements:
 * - Fixed height animations to prevent expensive layout recalculations
 * - Memoized callbacks to prevent unnecessary re-renders
 * - Optimized animation variants for better performance
 * - Added proper accessibility labels
 */
const MicrostepSuggestions: React.FC<MicrostepSuggestionsProps> = ({
  microsteps,
  onAccept,
  onReject,
  className
}) => {
  // Memoize animation variants to prevent recreation on every render
  const containerVariants = useMemo(() => ({
    initial: { opacity: 0, scaleY: 0 },
    animate: { opacity: 1, scaleY: 1 },
    exit: { opacity: 0, scaleY: 0 }
  }), [])

  const itemVariants = useMemo(() => ({
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 }
  }), [])

  // Memoized accept handler to prevent recreation on every render
  const handleAccept = useCallback((microstep: Task) => {
    onAccept(microstep)
  }, [onAccept])

  // Memoized reject handler to prevent recreation on every render
  const handleReject = useCallback((microstep: Task) => {
    onReject(microstep)
  }, [onReject])

  // Memoize the microstep items to prevent unnecessary re-renders
  const microstepItems = useMemo(() => {
    return microsteps.map((microstep) => (
      <motion.div
        key={microstep.id}
        variants={itemVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        layout // Use layout animation for smoother transitions
        className="flex items-center justify-between p-2 bg-gray-800 rounded-md border border-gray-700"
      >
        {/* Checkbox and text container */}
        <div className="flex items-center flex-1 mr-4">
          {/* Visual consistency checkbox */}
          <div className="flex items-center">
            <Checkbox
              checked={false}
              disabled
              className="mr-2 border-checkbox-border opacity-50"
              aria-label="Microstep checkbox (disabled)"
            />
          </div>
          {/* Text content */}
          <div className="flex-1">
            <p className="text-sm text-white">{microstep.text}</p>
            {microstep.rationale && (
              <p className="text-xs text-gray-400 mt-1">{microstep.rationale}</p>
            )}
          </div>
        </div>

        {/* Action buttons with proper accessibility */}
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-success hover:text-success/80 transition-colors"
            onClick={() => handleAccept(microstep)}
            aria-label="Accept microstep"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive/80 transition-colors"
            onClick={() => handleReject(microstep)}
            aria-label="Reject microstep"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    ))
  }, [microsteps, itemVariants, handleAccept, handleReject])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ 
          duration: 0.2,
          ease: "easeInOut"
        }}
        className={cn("space-y-2 pl-8 overflow-hidden", className)}
        style={{
          // Use fixed transform origin for consistent scaling
          transformOrigin: 'top'
        }}
      >
        <AnimatePresence>
          {microstepItems}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

export default React.memo(MicrostepSuggestions)
