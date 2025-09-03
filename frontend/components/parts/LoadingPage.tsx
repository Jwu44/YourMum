'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy load Lottie to reduce initial bundle size
const Lottie = React.lazy(() => import('lottie-react'))

export interface LoadingPageProps {
  reason?: 'calendar' | 'schedule'
  message?: string
}

/**
 * Loading page component with Lottie animation
 * 
 * Shows during long operations like calendar connection and schedule generation.
 * Includes accessibility features, fallback spinner, and dynamic messaging.
 */
export const LoadingPage: React.FC<LoadingPageProps> = ({ 
  reason = 'calendar',
  message 
}) => {
  const [animationData, setAnimationData] = useState(null)
  const [loadingError, setLoadingError] = useState(false)

  // Load Lottie animation data
  useEffect(() => {
    let isMounted = true

    const loadAnimation = async () => {
      try {
        const response = await fetch('/animations/Boy working on laptop lottie animation.json')
        if (!response.ok) throw new Error('Failed to load animation')
        
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

    loadAnimation()

    return () => {
      isMounted = false
    }
  }, [])

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
          description: 'Please wait while we prepare your experience'
        }
    }
  }

  const messages = getMessages()
  const displayMessage = message || messages.description

  // Fallback spinner component
  const FallbackSpinner = () => (
    <div className="flex items-center justify-center">
      <Loader2 className="w-16 h-16 animate-spin text-purple-600" />
    </div>
  )

  // Lottie animation component
  const LottieAnimation = () => {
    if (loadingError || !animationData) {
      return <FallbackSpinner />
    }

    return (
      <Suspense fallback={<FallbackSpinner />}>
        <div className="w-[300px] h-[300px] flex items-center justify-center">
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
            onError={() => setLoadingError(true)}
          />
        </div>
      </Suspense>
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-[500px] h-[500px] mx-4 flex flex-col"
        role="status" 
        aria-live="polite"
        aria-label="Loading page"
      >
        {/* Animation Section */}
        <div className="h-[300px] flex items-center justify-center">
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
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Hold tight asnee!
          </p>
        </div>
      </div>
    </div>
  )
}