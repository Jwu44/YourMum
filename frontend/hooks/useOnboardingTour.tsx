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
    
    if (isMobile) {
      // On mobile, prioritize mobile sidebar Sheet portal
      const mobileSheetContent = document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]')
      if (mobileSheetContent) {
        element = mobileSheetContent.querySelector(selector)
        if (element) {
          console.log('Found element in mobile sidebar:', element)
          return element
        }
      }
    }
    
    // Try standard DOM query (desktop or fallback)
    const allElements = document.querySelectorAll(selector)
    
    // Find the visible element (not hidden)
    for (const el of Array.from(allElements)) {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      
      if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
        console.log('Found visible element:', el, 'Size:', rect.width, 'x', rect.height)
        element = el
        break
      }
    }

    return element
  }, [steps, currentStep])

  // Update target element when step changes
  React.useEffect(() => {
    if (!isActive) return

    const updateTargetElement = () => {
      const element = findTargetElement()
      setTargetElement(element)
    }

    // Initial update
    updateTargetElement()

    // Update on resize or scroll
    const handleUpdate = () => {
      if (isActive) {
        updateTargetElement()
      }
    }

    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate)
    
    // Use mutation observer to detect DOM changes
    const observer = new MutationObserver(handleUpdate)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    })

    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate)
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