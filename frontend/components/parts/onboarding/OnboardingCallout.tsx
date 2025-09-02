/**
 * @file OnboardingCallout.tsx
 * @description Callout content box component for the onboarding tour
 */

'use client'

import React from 'react'
import { X } from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

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
  // Calculate optimal position for the callout relative to target element
  const getCalloutPosition = React.useCallback(() => {
    if (!targetElement) {
      // Fallback to center if no target element
      return {
        styles: {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '400px',
          width: '90vw'
        },
        arrowDirection: null as 'top' | 'bottom' | 'left' | 'right' | null
      }
    }

    const rect = targetElement.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    
    const calloutWidth = 360
    const calloutHeight = 200 // Approximate height
    const padding = 16
    const arrowSize = 12

    // Check if this is step 2 or 3 to prioritize right positioning
    const isStep2or3 = stepCounter.includes('2 of 3') || stepCounter.includes('3 of 3')

    // For steps 2 and 3, try positioning to the right first (arrow points left to target)
    if (isStep2or3 && rect.right + calloutWidth + padding < viewport.width) {
      return {
        styles: {
          position: 'fixed' as const,
          top: Math.max(padding, Math.min(
            viewport.height - calloutHeight - padding,
            rect.top + rect.height / 2 - calloutHeight / 2
          )),
          left: rect.right + arrowSize + 4,
          maxWidth: `${calloutWidth}px`,
          width: 'auto'
        },
        arrowDirection: 'left' as const
      }
    }

    // Try positioning below first (arrow points up to target) - for step 1 or fallback
    if (!isStep2or3 && rect.bottom + calloutHeight + padding < viewport.height) {
      return {
        styles: {
          position: 'fixed' as const,
          top: rect.bottom + arrowSize + 4, // Reduced gap for arrow
          left: Math.max(padding, Math.min(
            viewport.width - calloutWidth - padding,
            rect.left + rect.width / 2 - calloutWidth / 2
          )),
          maxWidth: `${calloutWidth}px`,
          width: 'auto'
        },
        arrowDirection: 'top' as const
      }
    }
    
    // Try positioning above (arrow points down to target)
    if (rect.top - calloutHeight - padding > 0) {
      return {
        styles: {
          position: 'fixed' as const,
          top: rect.top - calloutHeight - arrowSize - 4, // Reduced gap for arrow
          left: Math.max(padding, Math.min(
            viewport.width - calloutWidth - padding,
            rect.left + rect.width / 2 - calloutWidth / 2
          )),
          maxWidth: `${calloutWidth}px`,
          width: 'auto'
        },
        arrowDirection: 'bottom' as const
      }
    }
    
    
    // Try positioning to the left (arrow points right to target)
    if (rect.left - calloutWidth - padding > 0) {
      return {
        styles: {
          position: 'fixed' as const,
          top: Math.max(padding, Math.min(
            viewport.height - calloutHeight - padding,
            rect.top + rect.height / 2 - calloutHeight / 2
          )),
          left: rect.left - calloutWidth - arrowSize - 4, // Reduced gap for arrow
          maxWidth: `${calloutWidth}px`,
          width: 'auto'
        },
        arrowDirection: 'right' as const
      }
    }
    
    // Fallback to center if no good position found
    return {
      styles: {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '400px',
        width: '90vw'
      },
      arrowDirection: null
    }
  }, [targetElement])

  const positionData = getCalloutPosition()
  const { styles: positionStyles, arrowDirection } = positionData

  // Render arrow based on direction
  const renderArrow = () => {
    if (!arrowDirection) return null

    // Create simple triangle without the connecting border
    const arrowClasses = {
      top: 'absolute -top-2 left-1/2 -translate-x-1/2 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-card drop-shadow-sm',
      bottom: 'absolute -bottom-2 left-1/2 -translate-x-1/2 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent border-t-card drop-shadow-sm',
      left: 'absolute -left-2 top-1/2 -translate-y-1/2 border-t-[8px] border-b-[8px] border-r-[8px] border-transparent border-r-card drop-shadow-sm',
      right: 'absolute -right-2 top-1/2 -translate-y-1/2 border-t-[8px] border-b-[8px] border-l-[8px] border-transparent border-l-card drop-shadow-sm'
    }

    return <div className={arrowClasses[arrowDirection]} />
  }

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
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onNext, onBack, showBackButton])

  return (
    <div className="relative" style={positionStyles}>
      {renderArrow()}
      <Card 
        className="bg-card border shadow-lg"
        role="dialog"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-body"
      >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 
            id="onboarding-title"
            className="text-lg font-semibold text-foreground"
          >
            {title}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Close onboarding tour"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="w-full h-px bg-border mt-2" />
      </CardHeader>
      
      <CardContent className="pt-0 pb-4">
        <p 
          id="onboarding-body"
          className="text-muted-foreground mb-4 leading-relaxed"
        >
          {body}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">
            {stepCounter}
          </span>
          
          <div className="flex items-center gap-2">
            {showBackButton && onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="gap-2"
              >
                Back
              </Button>
            )}
            
            {onNext && (
              <Button
                size="sm"
                onClick={onNext}
                className="gradient-accent hover:opacity-90 text-primary-foreground gap-2"
              >
                {nextButtonText}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}