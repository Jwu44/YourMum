'use client'

import React from 'react'
import { LoadingPage } from '@/components/parts/LoadingPage'

/**
 * Loading page route - shown during long operations
 * Replaces /connecting page with Lottie animation and better UX
 * 
 * Triggered by:
 * - Google Calendar connection
 * - Auto-generating daily schedule
 */
export default function LoadingRoute() {
  return <LoadingPage />
}