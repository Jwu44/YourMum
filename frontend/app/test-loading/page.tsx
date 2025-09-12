'use client'

import React, { useState } from 'react'
import { LoadingPage } from '@/components/parts/LoadingPage'
import { Button } from '@/components/ui/button'

export default function TestLoadingPage() {
  const [loadingReason, setLoadingReason] = useState<'calendar' | 'schedule' | undefined>('schedule')
  const [showLoading, setShowLoading] = useState(false)

  const handleTestLoading = (reason: 'calendar' | 'schedule' | undefined) => {
    setLoadingReason(reason)
    setShowLoading(true)
    
    // Auto-hide after 8 seconds for testing (to see full animation)
    setTimeout(() => {
      setShowLoading(false)
    }, 8000)
  }

  if (showLoading) {
    return <LoadingPage reason={loadingReason} />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          LoadingPage Test
        </h1>
        
        <div className="space-y-4">
          <p className="text-gray-600 text-center mb-6">
            Click any button to test the LoadingPage component with different reasons.
            Each will show a random productivity tip!
          </p>
          
          <Button 
            onClick={() => handleTestLoading('calendar')}
            className="w-full"
            variant="outline"
          >
            Test Calendar Loading
          </Button>
          
          <Button 
            onClick={() => handleTestLoading('schedule')}
            className="w-full"
            variant="outline"
          >
            Test Schedule Loading (Random Tips)
          </Button>
          
          <Button 
            onClick={() => handleTestLoading(undefined)}
            className="w-full"
            variant="outline"
          >
            Test Default Loading (Random Tips)
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Test Instructions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Calendar: Shows original description</li>
            <li>• Schedule: Shows random productivity tip</li>
            <li>• Default: Shows random productivity tip</li>
            <li>• Loading auto-hides after 8 seconds (to see full animation)</li>
            <li>• Refresh page to see different random tips</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
