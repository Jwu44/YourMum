/**
 * @file OnboardingOverlay.tsx
 * @description Overlay component for the onboarding tour that dims the background and highlights target elements
 */

'use client'

import React from 'react'
import { createPortal } from 'react-dom'

interface OnboardingOverlayProps {
  targetElement: Element | null
  children: React.ReactNode
  onClose: () => void
  showSpotlight?: boolean
  stepCounter?: string
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  targetElement,
  children,
  onClose,
  showSpotlight = true,
  stepCounter
}) => {
  const overlayRef = React.useRef<HTMLDivElement>(null)

  // Handle clicks on the overlay (but not the callout) to close the tour
  const handleOverlayClick = React.useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }, [onClose])

  // Handle escape key to close tour
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => { document.removeEventListener('keydown', handleEscape) }
  }, [onClose])

  // Get spotlight position and size based on target element
  const getSpotlightStyles = React.useCallback(() => {
    if (!targetElement || !showSpotlight) {
      return {}
    }

    const rect = targetElement.getBoundingClientRect()
    const padding = 12

    // Debug logging for step 2 positioning
    if (stepCounter?.includes('2 of 3')) {
      console.log('Step 2 spotlight positioning:', {
        stepCounter,
        element: targetElement,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        sidebarState: document.querySelector('[data-sidebar="sidebar"]')?.getAttribute('data-state'),
        isSidebarElement: !!targetElement.closest('[data-sidebar="sidebar"]'),
        sidebarRect: targetElement.closest('[data-sidebar="sidebar"]')?.getBoundingClientRect()
      })
    }

    // Check if this is a sidebar navigation element
    const isSidebarElement = targetElement.closest('[data-sidebar="sidebar"]')
    
    let adjustedX = rect.left - padding
    
    // Step 1 (FAB button) - keep centered positioning
    if (stepCounter?.includes('1 of 3')) {
      adjustedX = rect.left - padding
    }
    // Steps 2-3 (sidebar navigation) - use boundary-aware positioning
    else if (isSidebarElement) {
      // For sidebar elements, ensure we don't cut off the left side
      const sidebarRect = isSidebarElement.getBoundingClientRect()
      const minX = Math.max(0, sidebarRect.left)
      adjustedX = Math.max(minX, rect.left - padding)
      
      // Also ensure we don't go off the right side of the viewport
      const maxX = window.innerWidth - rect.width - padding
      adjustedX = Math.min(maxX, adjustedX)
    } else {
      // For other elements, use standard boundary checking
      const minX = Math.max(0, rect.left - padding)
      const maxX = Math.min(window.innerWidth - rect.width - padding, rect.left)
      adjustedX = Math.max(minX, maxX)
    }

    return {
      '--spotlight-x': `${adjustedX}px`,
      '--spotlight-y': `${rect.top - padding}px`,
      '--spotlight-width': `${rect.width + padding * 2}px`,
      '--spotlight-height': `${rect.height + padding * 2}px`
    } as React.CSSProperties
  }, [targetElement, showSpotlight, stepCounter])

  const overlayContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60]"
      style={getSpotlightStyles()}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
    >
      {/* Spotlight effect - dims everything except the target area */}
      {targetElement && showSpotlight && (
        <div
          className="absolute bg-transparent rounded-lg pointer-events-none"
          style={{
            left: 'var(--spotlight-x)',
            top: 'var(--spotlight-y)',
            width: 'var(--spotlight-width)',
            height: 'var(--spotlight-height)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
          }}
          data-debug="spotlight"
          data-step={stepCounter}
          data-x="var(--spotlight-x)"
          data-y="var(--spotlight-y)"
          data-width="var(--spotlight-width)"
          data-height="var(--spotlight-height)"
        />
      )}

      {/* Fallback overlay when no spotlight */}
      {(!targetElement || !showSpotlight) && (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Radix Popover will handle its own Portal and positioning */}
      {children}
    </div>
  )

  // Render in portal to ensure proper z-index
  return typeof window !== 'undefined'
    ? createPortal(overlayContent, document.body)
    : null
}
