'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ThumbsUp, ThumbsDown, X } from 'lucide-react'
import { feedbackApi, type FeedbackResponse } from '@/lib/api/feedback'
import { useAuth } from '@/auth/AuthContext'

/**
 * FeedbackSonner component
 *
 * Shows a persistent feedback prompt to users who have created 2+ schedules
 * and haven't seen the prompt before. Displayed as a sticky toast on bottom-left.
 */
export function FeedbackSonner (): null {
  const { user } = useAuth()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Only check once per session and only if user is authenticated
    if (user == null || hasChecked) return

    const checkAndShowFeedback = async (): Promise<void> => {
      try {
        const { should_show: shouldShow } = await feedbackApi.shouldShowFeedback()

        if (shouldShow) {
          showFeedbackToast()
        }
      } catch (error) {
        console.error('Error checking feedback status:', error)
      } finally {
        setHasChecked(true)
      }
    }

    // Small delay to ensure user is fully authenticated
    const timer = setTimeout(() => {
      void checkAndShowFeedback()
    }, 2000)

    return () => clearTimeout(timer)
  }, [user, hasChecked])

  const handleFeedbackResponse = async (response: FeedbackResponse, toastId: string | number): Promise<void> => {
    try {
      await feedbackApi.submitFeedback(response)
      toast.dismiss(toastId)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.dismiss(toastId)
    }
  }

  const showFeedbackToast = (): void => {
    toast.custom(
      (toastId) => {
        // Internal component with state for button selection
        const FeedbackToastContent = () => {
          const [selected, setSelected] = useState<'thumbs_up' | 'thumbs_down' | null>(null)

          const handleClick = async (response: 'thumbs_up' | 'thumbs_down'): Promise<void> => {
            setSelected(response)
            await handleFeedbackResponse(response, toastId)
          }

          return (
            <div className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-md">
              {/* Close button - top right */}
              <button
                onClick={() => {
                  void handleFeedbackResponse('dismissed', toastId)
                }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="pr-6">
                <p className="text-sm text-foreground mb-3 font-medium">
                  Would you find YourMum useful if she could action simple tasks for you?
                  <br />
                  <span className="text-muted-foreground font-normal">e.g. Create meeting with X at Y time.</span>
                </p>

                {/* Thumbs up/down buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { void handleClick('thumbs_up') }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      selected === 'thumbs_up'
                        ? 'bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400'
                        : 'bg-muted hover:bg-green-500/10 text-muted-foreground'
                    }`}
                    aria-label="Thumbs up"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Yes</span>
                  </button>
                  <button
                    onClick={() => { void handleClick('thumbs_down') }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      selected === 'thumbs_down'
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400'
                        : 'bg-muted hover:bg-red-500/10 text-muted-foreground'
                    }`}
                    aria-label="Thumbs down"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    <span className="text-sm font-medium">No</span>
                  </button>
                </div>
              </div>
            </div>
          )
        }

        return <FeedbackToastContent />
      },
      {
        duration: Infinity, // Show indefinitely until user interacts
        position: 'bottom-left',
        id: 'feature-feedback'
      }
    )
  }

  // This component doesn't render anything - it just manages the feedback toast
  return null
}
