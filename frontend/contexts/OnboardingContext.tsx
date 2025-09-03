/**
 * @file OnboardingContext.tsx  
 * @description Context for tracking onboarding tour state across components
 */

'use client'

import React from 'react'

interface OnboardingContextType {
  isOnboardingActive: boolean
  setIsOnboardingActive: (active: boolean) => void
}

const OnboardingContext = React.createContext<OnboardingContextType | null>(null)

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnboardingActive, setIsOnboardingActive] = React.useState(false)

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingActive,
        setIsOnboardingActive
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = React.useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}