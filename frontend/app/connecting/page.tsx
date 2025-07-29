'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CalendarConnectionLoader from '@/components/parts/CalendarConnectionLoader'

/**
 * Transition page shown during calendar connection process
 * Handles the loading states and redirects to dashboard when complete
 */
const ConnectingPage: React.FC = () => {
  const [stage, setStage] = useState<'connecting' | 'verifying' | 'complete'>('connecting')
  const [message, setMessage] = useState<string>()
  const router = useRouter()

  useEffect(() => {
    // Listen for messages from the auth context about connection progress
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'calendarConnectionStage') {
        const newStage = event.newValue as 'connecting' | 'verifying' | 'complete'
        if (newStage) {
          setStage(newStage)
        }
      }
      
      if (event.key === 'calendarConnectionMessage') {
        setMessage(event.newValue || undefined)
      }

      // Handle completion or error
      if (event.key === 'calendarConnectionComplete') {
        setStage('complete')
        setTimeout(() => {
          const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard'
          localStorage.removeItem('authRedirectDestination')
          localStorage.removeItem('calendarConnectionStage')
          localStorage.removeItem('calendarConnectionMessage')
          localStorage.removeItem('calendarConnectionComplete')
          router.push(redirectTo)
        }, 1500) // Brief delay to show completion state
      }
    }

    // Check initial state
    const initialStage = localStorage.getItem('calendarConnectionStage')
    if (initialStage) {
      setStage(initialStage as 'connecting' | 'verifying' | 'complete')
    }

    const initialMessage = localStorage.getItem('calendarConnectionMessage')
    if (initialMessage) {
      setMessage(initialMessage)
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Fallback timeout - redirect after 15 seconds regardless
    const fallbackTimeout = setTimeout(() => {
      console.warn('Calendar connection taking too long, redirecting to dashboard')
      const redirectTo = localStorage.getItem('authRedirectDestination') || '/dashboard'
      localStorage.removeItem('authRedirectDestination')
      localStorage.removeItem('calendarConnectionStage')
      localStorage.removeItem('calendarConnectionMessage')
      localStorage.removeItem('calendarConnectionComplete')
      router.push(redirectTo)
    }, 15000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearTimeout(fallbackTimeout)
    }
  }, [router])

  return <CalendarConnectionLoader stage={stage} message={message} />
}

export default ConnectingPage 