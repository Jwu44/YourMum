/**
 * @file useOnboardingTour.tsx
 * @description Hook for managing onboarding tour state and logic
 */

'use client'

import React from 'react'

interface TourStep {
  id: string
  title: string
  body: string
  targetSelector?: string
  targetAttribute?: string
  position?: 'below' | 'above' | 'left' | 'right' | 'auto'
}

interface UseOnboardingTourOptions {
  autoStart?: boolean
  storageKey?: string
}

export const useOnboardingTour = (
  steps: TourStep[],
  options: UseOnboardingTourOptions = {}
) => {
  const {
    autoStart = true,
    storageKey = 'onboarding-tour-completed'
  } = options

  // State
  const [isActive, setIsActive] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [targetElement, setTargetElement] = React.useState<Element | null>(null)

  // Check if tour has been completed
  const isTourCompleted = React.useCallback(() => {
    if (typeof window === 'undefined') return true
    
    // if (process.env.NODE_ENV === 'development') {
    //   return false
    // }
    
    // Check localStorage for completion flag
    // Returns true only if explicitly marked as completed
    // New users (no flag) will see the tour
    return localStorage.getItem(storageKey) === 'true'
  }, [storageKey])

  // Mark tour as completed
  const completeTour = React.useCallback(() => {
    localStorage.setItem(storageKey, 'true')
    setIsActive(false)
    setCurrentStep(0)
    setTargetElement(null)
  }, [storageKey])

  // Find target element for current step
  const findTargetElement = React.useCallback(() => {
    const step = steps[currentStep]
    if (!step) return null

    let element: Element | null = null

    // Build selector string
    const selector = step.targetAttribute 
      ? `[${step.targetAttribute}]` 
      : step.targetSelector

    if (!selector) return null

    // Check if we're on mobile
    const isMobile = window.innerWidth < 768
    const isSidebarStep = step.id === 'fill-preferences' || step.id === 'integrate-apps'
    
    if (isMobile && isSidebarStep) {
      // Enhanced mobile sidebar detection - try multiple selectors
      const mobileSelectors = [
        '[data-sidebar="sidebar"][data-mobile="true"]', // Primary mobile sheet
        '[data-sidebar="sidebar"][data-state="open"]',   // Open sidebar state
        '[data-vaul-drawer-wrapper] [data-sidebar="sidebar"]', // Vaul drawer wrapper
        '.sheet-content [data-sidebar="sidebar"]',       // Generic sheet content
        '[role="dialog"] [data-sidebar="sidebar"]'       // Dialog-based sheet
      ]
      
      for (const mobileSelector of mobileSelectors) {
        const mobileSheetContent = document.querySelector(mobileSelector)
        if (mobileSheetContent) {
          element = mobileSheetContent.querySelector(selector)
          if (element) {
            const rect = element.getBoundingClientRect()
            const style = window.getComputedStyle(element)
            
            if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
              console.log('Found element in mobile sidebar:', element, 'Via selector:', mobileSelector)
              return element
            }
          }
        }
      }
    }
    
    // Try standard DOM query (desktop or fallback)
    const allElements = document.querySelectorAll(selector)
    
    if (isSidebarStep) {
      // Enhanced sidebar element detection
      const sidebarSelectors = [
        '[data-sidebar="sidebar"]',                    // Primary sidebar
        '[data-sidebar="sidebar"][data-state="open"]', // Open sidebar
        '.sidebar',                                    // Generic sidebar class
        '[data-state="open"][data-sidebar="sidebar"]'  // Specific open state
      ]
      
      for (const sidebarSelector of sidebarSelectors) {
        const sidebarElement = document.querySelector(sidebarSelector)
        if (sidebarElement) {
          const sidebarNavElement = sidebarElement.querySelector(selector)
          if (sidebarNavElement) {
            const rect = sidebarNavElement.getBoundingClientRect()
            const style = window.getComputedStyle(sidebarNavElement)
            
            if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
              console.log('Found sidebar navigation element:', sidebarNavElement, 'Size:', rect.width, 'x', rect.height, 'Via:', sidebarSelector)
              return sidebarNavElement
            }
          }
        }
      }
    }
    
    // Enhanced visibility checking with better heuristics
    const isElementVisible = (el: Element): boolean => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      
      // Basic visibility checks
      if (rect.width <= 0 || rect.height <= 0) return false
      if (style.visibility === 'hidden' || style.display === 'none') return false
      if (style.opacity === '0') return false
      
      // Check if element is within viewport (with some tolerance)
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      
      // Allow elements slightly outside viewport (common for mobile sheets)
      const tolerance = 50
      const isInViewport = (
        rect.left >= -tolerance &&
        rect.top >= -tolerance &&
        rect.right <= viewportWidth + tolerance &&
        rect.bottom <= viewportHeight + tolerance
      )
      
      return isInViewport
    }
    
    // Find the most visible element
    let bestElement: Element | null = null
    let bestScore = -1
    
    for (const el of Array.from(allElements)) {
      if (isElementVisible(el)) {
        const rect = el.getBoundingClientRect()
        // Score based on size and position (larger, more centered elements score higher)
        const size = rect.width * rect.height
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const viewportCenterX = window.innerWidth / 2
        const viewportCenterY = window.innerHeight / 2
        
        const distanceFromCenter = Math.sqrt(
          Math.pow(centerX - viewportCenterX, 2) + 
          Math.pow(centerY - viewportCenterY, 2)
        )
        
        const score = size - distanceFromCenter * 0.1 // Prefer larger elements closer to center
        
        if (score > bestScore) {
          bestScore = score
          bestElement = el
        }
      }
    }
    
    if (bestElement) {
      return bestElement
    }

    return null
  }, [steps, currentStep])

  // Update target element when step changes
  React.useEffect(() => {
    if (!isActive) return

    const updateTargetElement = async () => {
      const element = findTargetElement()
      
      // Enhanced retry logic for mobile and complex DOM scenarios
      if (!element) {
        const isMobile = window.innerWidth < 768
        const maxRetries = isMobile ? 5 : 3
        const initialDelay = isMobile ? 150 : 100
        
        for (let i = 0; i < maxRetries; i++) {
          // Progressive delay - longer delays for later retries
          const delay = initialDelay + (i * 50)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          const retryElement = findTargetElement()
          if (retryElement) {
            console.log(`Found element on retry ${i + 1} with delay ${delay}ms`)
            setTargetElement(retryElement)
            return
          }
        }
        
        // If still no element, log for debugging
        console.warn('Failed to find target element after', maxRetries, 'retries')
      }
      
      setTargetElement(element)
    }

    // Initial update with slight delay to ensure DOM is ready
    const initialTimer = setTimeout(updateTargetElement, 50)

    // Debounced update function for event handlers
    const debouncedUpdate = (() => {
      let timeoutId: NodeJS.Timeout
      return () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (isActive) {
            updateTargetElement()
          }
        }, 100)
      }
    })()

    // Enhanced event listeners for mobile responsiveness
    const events = ['resize', 'scroll', 'orientationchange']
    events.forEach(event => window.addEventListener(event, debouncedUpdate, { passive: true }))
    
    // Visual viewport events for mobile keyboard handling
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debouncedUpdate)
      window.visualViewport.addEventListener('scroll', debouncedUpdate)
    }
    
    // Enhanced mutation observer with better filtering
    const observer = new MutationObserver((mutations) => {
      // Only trigger updates for meaningful changes
      const hasRelevantChanges = mutations.some(mutation => {
        // Check if the mutation affects sidebar, sheet, or dialog elements
        const isRelevantTarget = (node: Node): boolean => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false
          const element = node as Element
          
          return (
            element.matches?.('[data-sidebar]') ||
            element.matches?.('[data-sheet]') ||
            element.matches?.('[role="dialog"]') ||
            element.matches?.('[data-state]') ||
            element.querySelector?.('[data-sidebar], [data-sheet], [role="dialog"]') !== null
          )
        }
        
        return (
          mutation.type === 'childList' && 
          (Array.from(mutation.addedNodes).some(isRelevantTarget) ||
           Array.from(mutation.removedNodes).some(isRelevantTarget))
        ) || (
          mutation.type === 'attributes' &&
          mutation.target &&
          isRelevantTarget(mutation.target)
        )
      })
      
      if (hasRelevantChanges) {
        debouncedUpdate()
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'data-sidebar', 'data-sheet', 'data-mobile', 'class', 'style']
    })

    return () => {
      clearTimeout(initialTimer)
      events.forEach(event => window.removeEventListener(event, debouncedUpdate))
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', debouncedUpdate)
        window.visualViewport.removeEventListener('scroll', debouncedUpdate)
      }
      observer.disconnect()
    }
  }, [isActive, currentStep, findTargetElement])

  // Auto-start tour if enabled and not completed
  React.useEffect(() => {
    if (autoStart && !isTourCompleted() && !isActive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsActive(true)
        setCurrentStep(0)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [autoStart, isTourCompleted, isActive])

  // Navigation functions
  const nextStep = React.useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeTour()
    }
  }, [currentStep, steps.length, completeTour])

  const previousStep = React.useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const goToStep = React.useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex)
    }
  }, [steps.length])

  const startTour = React.useCallback(() => {
    setIsActive(true)
    setCurrentStep(0)
  }, [])

  const closeTour = React.useCallback(() => {
    completeTour()
  }, [completeTour])

  // Current step data
  const currentStepData = React.useMemo(() => {
    const step = steps[currentStep]
    if (!step) return null

    return {
      ...step,
      stepNumber: currentStep + 1,
      totalSteps: steps.length,
      stepCounter: `${currentStep + 1} of ${steps.length}`,
      isFirstStep: currentStep === 0,
      isLastStep: currentStep === steps.length - 1
    }
  }, [steps, currentStep])

  return {
    // State
    isActive,
    currentStep,
    targetElement,
    currentStepData,
    
    // Actions
    startTour,
    closeTour,
    nextStep,
    previousStep,
    goToStep,
    
    // Helpers
    isTourCompleted: isTourCompleted(),
    canGoBack: currentStep > 0,
    canGoNext: currentStep < steps.length - 1
  }
}