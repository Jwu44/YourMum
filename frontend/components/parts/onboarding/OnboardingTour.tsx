/**
 * @file OnboardingTour.tsx
 * @description Main onboarding tour component that orchestrates the tour experience
 */

'use client'

import React from 'react'

// Components
import { OnboardingOverlay } from './OnboardingOverlay'
import { OnboardingCallout } from './OnboardingCallout'

// Hooks
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
import { useIsMobile } from '@/hooks/use-mobile'
import { useSidebar } from '@/components/ui/sidebar'
import { useOnboarding } from '@/contexts/OnboardingContext'

interface OnboardingTourProps {
  /** Whether to auto-start the tour for first-time users */
  autoStart?: boolean
  /** Custom storage key for tour completion tracking */
  storageKey?: string
}

/**
 * Tour step definitions following the task requirements
 */
const TOUR_STEPS = [
  {
    id: 'add-first-task',
    title: 'Add your first task',
    body: 'YourMum will auto-categorise tasks later and even assign times.',
    targetSelector: '[data-testid="create-task-button"], [data-testid="create-task-fab"]',
    position: 'below' as const
  },
  {
    id: 'fill-preferences',
    title: 'Fill out your preferences',
    body: 'Provide details about your lifestyle so YourMum can plan your day that best suits you.',
    targetAttribute: 'data-onboarding-target="preferences-nav"',
    targetSelector: '[data-onboarding-target="preferences-nav"]',
    position: 'right' as const
  },
  {
    id: 'integrate-apps',
    title: 'Integrate with 3rd party apps',
    body: 'Connect with other apps to allow YourMum to auto create tasks from those sources.',
    targetAttribute: 'data-onboarding-target="integrations-nav"',
    targetSelector: '[data-onboarding-target="integrations-nav"]',
    position: 'right' as const
  },
  {
    id: 'next-day-navigation',
    title: 'Auto create next day.',
    body: 'Simply click the arrow and YourMum will rollover tasks for tomorrow!',
    targetAttribute: 'data-onboarding-target="next-day-button"',
    targetSelector: '[data-onboarding-target="next-day-button"]',
    position: 'below' as const
  }
]

/**
 * OnboardingTour component implementing the first-time user tour experience
 *
 * Features:
 * - Automatic launch for first-time users
 * - Responsive design for desktop and mobile
 * - Keyboard navigation support
 * - Permanent dismissal via localStorage
 * - Contextual positioning of callouts
 * - Accessible with proper ARIA labels
 */
export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  autoStart = true,
  storageKey = 'onboarding-tour-completed'
}) => {
  const isMobile = useIsMobile()
  const { setOpenMobile } = useSidebar()
  const { setIsOnboardingActive } = useOnboarding()

  const {
    isActive,
    targetElement,
    currentStepData,
    nextStep,
    previousStep,
    closeTour,
    canGoBack
  } = useOnboardingTour(TOUR_STEPS, {
    autoStart,
    storageKey
  })

  // Update onboarding context when tour state changes
  React.useEffect(() => {
    setIsOnboardingActive(isActive)
  }, [isActive, setIsOnboardingActive])

  // Enhanced next step handler with mobile sidebar behavior
  const handleNextStep = React.useCallback(() => {
    console.log('handleNextStep called', { currentStep: currentStepData?.stepCounter, isMobile })

    // If Step 1 and mobile, open sidebar for Steps 2 & 3 visibility
    if (currentStepData?.stepCounter.includes('1 of 4') && isMobile) {
      setOpenMobile(true)
      // Increased delay to ensure Sheet portal is fully rendered
      setTimeout(() => {
        nextStep()
      }, 300)
    } else if (currentStepData?.stepCounter.includes('3 of 4') && isMobile) {
      // If Step 3 and mobile, close sidebar for Step 4 visibility (next day button in header)
      setOpenMobile(false)
      setTimeout(() => {
        nextStep()
      }, 300)
    } else if (currentStepData?.stepCounter.includes('4 of 4') && isMobile) {
      // If Step 4 (last step) and mobile, just finish the tour
      nextStep()
    } else {
      nextStep()
    }
  }, [currentStepData, isMobile, setOpenMobile, nextStep])

  // Enhanced previous step handler with mobile sidebar behavior
  const handlePreviousStep = React.useCallback(() => {
    console.log('handlePreviousStep called', { currentStep: currentStepData?.stepCounter, isMobile })

    // If going back from Step 4 to Step 3 and mobile, open the sidebar
    if (currentStepData?.stepCounter.includes('4 of 4') && isMobile) {
      setOpenMobile(true)
      setTimeout(() => {
        previousStep()
      }, 300)
    } else if (currentStepData?.stepCounter.includes('2 of 4') && isMobile) {
      // If going back to Step 1 and mobile, close the sidebar
      previousStep()
      // Small delay then close sidebar to return to Step 1 view
      setTimeout(() => {
        setOpenMobile(false)
      }, 100)
    } else {
      previousStep()
    }
  }, [currentStepData, isMobile, setOpenMobile, previousStep])

  // Don't render if tour is not active or no current step
  if (!isActive || !currentStepData) {
    return null
  }

  const isLastStep = currentStepData.isLastStep
  const nextButtonText = isLastStep ? 'Finish' : 'Next'

  return (
    <OnboardingOverlay
      targetElement={targetElement}
      onClose={closeTour}
      stepCounter={currentStepData.stepCounter}
    >
      <OnboardingCallout
        title={currentStepData.title}
        body={currentStepData.body}
        stepCounter={currentStepData.stepCounter}
        targetElement={targetElement}
        showBackButton={canGoBack}
        nextButtonText={nextButtonText}
        onNext={handleNextStep}
        onBack={canGoBack ? handlePreviousStep : undefined}
        onClose={closeTour}
      />
    </OnboardingOverlay>
  )
}

export default OnboardingTour
