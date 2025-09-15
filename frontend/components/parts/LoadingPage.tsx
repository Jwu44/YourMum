'use client'

import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Lottie from 'lottie-react'
import { motion } from 'framer-motion'

// Available loading animations configuration
const LOADING_ANIMATIONS = [
  {
    path: '/animations/Boy working on laptop lottie animation.json',
    name: 'Boy working on laptop'
  },
  {
    path: '/animations/Sandy Loading.json',
    name: 'Sandy Loading'
  },
  {
    path: '/animations/Tired Woman.json',
    name: 'Tired Woman'
  },
  {
    path: '/animations/BusinessEnterprise Solutions Development.json',
    name: 'Business Enterprise Solutions'
  },
  {
    path: '/animations/Company employees sharing thoughts and ideas.json',
    name: 'Company employee'
  },
  {
    path: '/animations/Computer Editing.json',
    name: 'Computer Editing'
  },
  {
    path: '/animations/Man with task list.json',
    name: 'Man with task list'
  }
]

// Function to randomly select an animation
const getRandomAnimation = (): { path: string; name: string } => {
  const randomIndex = Math.floor(Math.random() * LOADING_ANIMATIONS.length)
  return LOADING_ANIMATIONS[randomIndex]
}

// Available productivity tips for random selection
const PRODUCTIVITY_TIPS = [
  { title: 'Getting Things Done (GTD)', description: 'Splitting your tasks into archive, current list, and backlog makes it way easier to balance priorities.' },
  { title: 'SMART Goals', description: 'Vague goals stall progress. Instead of saying "Get fitter," a SMART goal would be: "Run a 5k race in under 30 minutes by June 30th.' },
  { title: 'Batching', description: 'Grouping similar tasks into one block saves huge amounts of mental energy by cutting context switching.' },
  { title: 'Alternating', description: 'Switching between different types of work throughout the day can reduce fatigue by nearly 30%.' },
  { title: 'Pre mortem', description: 'Thinking about what might go wrong before you start helps you plan fixes early—and reduces anxiety about the unknown.' },
  { title: '3-3-3', description: 'Focusing 3 hours on your top priority, then tackling 3 medium tasks and 3 small ones, leads to higher completion rates and lower stress.' },
  { title: 'Overflow buffer', description: 'High performers leave 20% of their day unscheduled for surprises. It keeps you calm and prevents that "unfinished task" mental nag.' },
  { title: 'Zeignark effect', description: 'Your brain clings to unfinished tasks. Writing them down tricks it into letting go—so you can focus on what\'s next.' }
]

// Function to randomly select a productivity tip
const getRandomProductivityTip = (): { title: string; description: string } => {
  const randomIndex = Math.floor(Math.random() * PRODUCTIVITY_TIPS.length)
  return PRODUCTIVITY_TIPS[randomIndex]
}

export interface LoadingPageProps {
  reason?: 'calendar' | 'schedule'
  message?: string
  loadingManager?: {
    isLoading: boolean
    canNavigate: boolean
    timeRemaining: number
    reason: 'calendar' | 'schedule'
    markContentReady: () => void
    progress: number
  }
}

/**
 * Loading page component with Lottie animation
 *
 * Shows during long operations like calendar connection and schedule generation.
 * Includes accessibility features, fallback spinner, and dynamic messaging.
 */
export const LoadingPage: React.FC<LoadingPageProps> = ({
  reason = 'calendar',
  message,
  loadingManager
}) => {
  const [animationData, setAnimationData] = useState<any>(null)
  const [loadingError, setLoadingError] = useState(false)
  const [selectedAnimation] = useState(() => getRandomAnimation())

  // Load Lottie animation data
  useEffect(() => {
    let isMounted = true

    const loadAnimation = async () => {
      try {
        const response = await fetch(selectedAnimation.path)
        if (!response.ok) throw new Error(`Failed to load animation: ${selectedAnimation.name}`)

        const data = await response.json()
        if (isMounted) {
          setAnimationData(data)
        }
      } catch (error) {
        console.error('Error loading Lottie animation:', error)
        if (isMounted) {
          setLoadingError(true)
        }
      }
    }

    void loadAnimation()

    return () => {
      isMounted = false
    }
  }, [selectedAnimation.path])

  // Dynamic messages based on loading reason
  const getMessages = () => {
    switch (reason) {
      case 'calendar':
        return {
          title: 'Connecting to Google Calendar...',
          description: 'Syncing events for today and setting up your schedule',
          isProductivityTip: false
        }
      case 'schedule':
        return {
          title: 'Generating Your Schedule...',
          productivityTip: getRandomProductivityTip(),
          isProductivityTip: true
        }
      default:
        return {
          title: 'Loading',
          productivityTip: getRandomProductivityTip(),
          isProductivityTip: true
        }
    }
  }

  const messages = getMessages()
  const displayMessage = message ?? (messages.isProductivityTip ? messages.productivityTip?.description : messages.description)

  // Fallback spinner component
  const FallbackSpinner = () => (
    <div className="w-full h-full max-w-[400px] max-h-[300px] flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
      <Loader2 className="w-16 h-16 animate-spin text-purple-600" />
    </div>
  )

  // Lottie animation component
  const LottieAnimation = () => {
    if (loadingError || !animationData) {
      return <FallbackSpinner />
    }

    return (
      <div className="w-full h-full max-w-[400px] max-h-[300px] flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
          className={animationData ? 'opacity-100' : 'opacity-0'}
          onError={() => { setLoadingError(true) }}
        />
      </div>
    )
  }

  useEffect(() => {
    // Update document title for accessibility
    const originalTitle = document.title
    document.title = 'Loading… • YourMum'

    return () => {
      document.title = originalTitle
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-lavender-50 to-indigo-50"></div>
      <div className="absolute inset-0 bg-gradient-radial from-purple-100/30 via-transparent to-transparent"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl"></div>

      <div
        className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-[500px] min-h-[500px] mx-4 flex flex-col"
        role="status"
        aria-live="polite"
        aria-label="Loading page"
      >
        {/* Animation Section */}
        <div className="flex-1 flex items-center justify-center min-h-[320px]">
          <LottieAnimation />
        </div>

        {/* Content Section */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {messages.title}
          </h1>

          {messages.isProductivityTip && messages.productivityTip ? (
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              <strong>{messages.productivityTip.title}:</strong> {messages.productivityTip.description}
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {displayMessage}
            </p>
          )}

          {/* Progress indicator if available */}
          {loadingManager?.progress !== undefined && loadingManager.progress > 0 && (
            <div className="space-y-2 mt-6">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(loadingManager.progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(loadingManager.progress)}% complete
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Hold tight asnee!
          </p>
        </div>
      </div>
    </div>
  )
}
