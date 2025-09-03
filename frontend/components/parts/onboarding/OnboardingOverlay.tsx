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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const isStep1 = stepCounter?.includes('1 of 3')

    // Use minimal padding for step 1 FAB on mobile to avoid oversized spotlight
    // Step 1 targets a 56x56px FAB button - minimal padding is sufficient
    let padding: number
    if (isMobile && isStep1) {
      padding = 8  // Minimal padding for FAB button on mobile
    } else if (isMobile) {
      padding = 30 // Generous padding for other mobile targets
    } else {
      padding = 12 // Standard desktop padding
    }

    // Debug: log target element info
    console.log('Spotlight target element:')
    console.log('- Element:', targetElement)
    console.log('- Tag:', targetElement.tagName)
    console.log('- Class:', targetElement.className)
    console.log('- Rect:', rect.left, rect.top, rect.width, rect.height)

    return {
      '--spotlight-x': `${rect.left - padding}px`,
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
