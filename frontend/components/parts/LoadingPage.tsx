'use client'

import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Lottie from 'lottie-react'

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
    path: '/animations/BusinessEnterprise Solutions.json',
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
          description: 'Syncing events for today and setting up your schedule'
        }
      case 'schedule':
        return {
          title: 'Generating Your Schedule...',
          description: 'Creating your schedule for today'
        }
      default:
        return {
          title: 'Loading',
          description: 'Please wait while we prepare your schedule'
        }
    }
  }

  const messages = getMessages()
  const displayMessage = message ?? messages.description

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-[500px] min-h-[500px] mx-4 flex flex-col"
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

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {displayMessage}
          </p>
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
