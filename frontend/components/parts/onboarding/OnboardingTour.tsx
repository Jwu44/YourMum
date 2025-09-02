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
    body: 'Click the button to add your first task. Simply add the task name. YourMum can auto-categorise this task later and even assign times.',
    targetSelector: '[data-testid="create-task-button"], [data-testid="create-task-fab"]',
    position: 'below' as const
  },
  {
    id: 'fill-preferences',
    title: 'Fill out your preferences',
    body: 'Provide details about your lifestyle and how you like to operate so YourMum can generate a personalised schedule for you.',
    targetAttribute: 'data-onboarding-target="inputs-nav"',
    targetSelector: '[data-onboarding-target="inputs-nav"]',
    position: 'right' as const
  },
  {
    id: 'integrate-apps',
    title: 'Integrate with 3rd party apps',
    body: 'Connect with other apps to allow YourMum to auto create tasks from those sources.',
    targetAttribute: 'data-onboarding-target="integrations-nav"',
    targetSelector: '[data-onboarding-target="integrations-nav"]',
    position: 'right' as const
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
    >
      <OnboardingCallout
        title={currentStepData.title}
        body={currentStepData.body}
        stepCounter={currentStepData.stepCounter}
        targetElement={targetElement}
        showBackButton={canGoBack}
        nextButtonText={nextButtonText}
        onNext={nextStep}
        onBack={canGoBack ? previousStep : undefined}
        onClose={closeTour}
      />
    </OnboardingOverlay>
  )
}

export default OnboardingTour