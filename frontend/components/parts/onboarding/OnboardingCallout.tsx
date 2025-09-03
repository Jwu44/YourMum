/**
 * @file OnboardingCallout.tsx
 * @description Callout content box component for the onboarding tour using Radix Popover
 */

'use client'

import React from 'react'
import { X } from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

interface OnboardingCalloutProps {
  title: string
  body: string
  stepCounter: string
  targetElement: Element | null
  showBackButton?: boolean
  nextButtonText?: string
  onNext?: () => void
  onBack?: () => void
  onClose: () => void
}

export const OnboardingCallout: React.FC<OnboardingCalloutProps> = ({
  title,
  body,
  stepCounter,
  targetElement,
  showBackButton = false,
  nextButtonText = 'Next',
  onNext,
  onBack,
  onClose
}) => {
  // Simple position preference based on step - Radix handles collision detection
  const getSide = React.useCallback((): "top" | "bottom" | "left" | "right" => {
    const isStep1 = stepCounter.includes('1 of 3')
    const isStep2or3 = stepCounter.includes('2 of 3') || stepCounter.includes('3 of 3')
    
    // Step-based positioning preferences (Radix will handle fallbacks)
    if (isStep1) return 'left'   // FAB positioning
    if (isStep2or3) return 'bottom' // Sidebar nav positioning  
    return 'bottom' // Default
  }, [stepCounter])

  const side = getSide()

  // Simple 8px offset for mobile, 16px for desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const sideOffset = isMobile ? 8 : 16

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault()
          if (onNext) onNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (onBack && showBackButton) onBack()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown) }
  }, [onNext, onBack, showBackButton])

  // Don't render if no target element (let parent handle centering)
  if (!targetElement) {
    return null
  }

  return (
    <Popover.Root open={true}>
      <Popover.Anchor
        style={{
          position: 'fixed',
          top: targetElement.getBoundingClientRect().top,
          left: targetElement.getBoundingClientRect().left,
          width: targetElement.getBoundingClientRect().width,
          height: targetElement.getBoundingClientRect().height,
        }}
      />
      <Popover.Portal>
        <Popover.Content
          side={side}
          sideOffset={sideOffset}
          avoidCollisions={true}
          collisionBoundary={undefined}
          className={cn(
            "bg-card border shadow-xl rounded-lg z-[70]",
            "w-[min(280px,calc(100vw-2rem))] md:w-[360px]",
            "p-2.5 md:p-4"
          )}
          role="dialog"
          aria-labelledby="onboarding-title"
          aria-describedby="onboarding-body"
        >
          <Popover.Arrow 
            className="fill-card drop-shadow-sm" 
            width={20} 
            height={10}
            style={{ fill: 'hsl(var(--card))', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          />
          
          <div className="space-y-1.5 md:space-y-3">
            {/* Responsive header */}
            <div className="flex items-start justify-between gap-2">
              <h3
                id="onboarding-title"
                className="text-sm md:text-base font-semibold text-foreground leading-tight flex-1"
              >
                {title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Close onboarding tour"
              >
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>

            {/* Responsive body */}
            <p
              id="onboarding-body"
              className="text-sm md:text-sm text-muted-foreground leading-snug md:leading-relaxed"
            >
              {body}
            </p>

            {/* Responsive footer */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs md:text-sm text-muted-foreground font-medium flex-shrink-0">
                {stepCounter}
              </span>

              <div className="flex items-center gap-2 md:gap-3">
                {showBackButton && onBack && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBack}
                    className="h-9 md:h-10 px-3 md:px-4 text-sm font-medium min-w-[60px]"
                  >
                    Back
                  </Button>
                )}

                {onNext && (
                  <Button
                    size="sm"
                    onClick={onNext}
                    className="gradient-accent hover:opacity-90 text-primary-foreground h-9 md:h-10 px-3 md:px-4 text-sm font-medium min-w-[60px]"
                  >
                    {nextButtonText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}