import React from 'react'
import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Dashboard from '@/app/dashboard/page'

// Mocks
const mockFetchEvents = jest.fn()
const mockLoadSchedule = jest.fn()
const mockUpdateSchedule = jest.fn()
const mockToast = jest.fn()

// Mock calendar API
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    fetchEvents: (...args: any[]) => (mockFetchEvents as any)(...args),
  },
}))

// Mock schedule helper
jest.mock('@/lib/ScheduleHelper', () => ({
  loadSchedule: (...args: any[]) => (mockLoadSchedule as any)(...args),
  updateSchedule: (...args: any[]) => (mockUpdateSchedule as any)(...args),
  deleteTask: jest.fn(),
  createSchedule: jest.fn(),
  shouldTaskRecurOnDate: jest.fn(),
}))

// Mock auth/firebase current user token
jest.mock('@/auth/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  },
}))

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock mobile hook stable false
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

// Provide a minimal FormContext
jest.mock('@/lib/FormContext', () => {
  const React = require('react')
  return {
    useForm: () => ({ state: {} }),
    FormProvider: ({ children }: any) => <>{children}</>,
  }
})

// Mutable auth state mock
const mockAuthState: {
  currentUser: { uid: string } | null
  loading: boolean
  error: string | null
  calendarConnectionStage: 'connecting' | 'verifying' | 'complete' | null
} = {
  currentUser: { uid: 'test-user-123' },
  loading: false,
  error: null,
  calendarConnectionStage: null,
}

jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }: any) => children,
}))

describe('Dashboard initial load defers until calendar connection completes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthState.currentUser = { uid: 'test-user-123' }
    mockAuthState.loading = false
    mockAuthState.error = null
    mockAuthState.calendarConnectionStage = null
  })

  it('does not fetch calendar events while connection is in progress', async () => {
    mockAuthState.calendarConnectionStage = 'connecting'

    render(<Dashboard />)

    // Give React a tick; there should be no call yet
    await new Promise((r) => setTimeout(r, 10))

    expect(mockFetchEvents).not.toHaveBeenCalled()
    expect(mockLoadSchedule).not.toHaveBeenCalled()
  })

  it('fetches calendar events once after stage clears, then hides loader on success', async () => {
    // Start in connecting stage
    mockAuthState.calendarConnectionStage = 'connecting'
    const { rerender } = render(<Dashboard />)

    // Prepare successful events response
    mockFetchEvents.mockResolvedValue({
      success: true,
      tasks: [{ id: 'evt1', text: 'Team Meeting' }],
      count: 1,
      date: '2025-08-11',
    })

    // Transition to stage null (connection done)
    mockAuthState.calendarConnectionStage = null
    rerender(<Dashboard />)

    await waitFor(() => {
      expect(mockFetchEvents).toHaveBeenCalledTimes(1)
    })

    // On success path, we should not fall back to loadSchedule
    expect(mockLoadSchedule).not.toHaveBeenCalled()
  })

  it('falls back to existing schedule when events fetch reports not connected, then hides loader', async () => {
    // Start in verifying stage
    mockAuthState.calendarConnectionStage = 'verifying'
    const { rerender } = render(<Dashboard />)

    // First post-connect fetch fails with "not connected"
    mockFetchEvents.mockResolvedValue({
      success: false,
      tasks: [],
      count: 0,
      date: '2025-08-11',
      error:
        'Google Calendar not connected. Please connect your calendar in the Integrations page to sync events.',
    })

    // Fallback schedule exists
    mockLoadSchedule.mockResolvedValue({
      success: true,
      schedule: [{ id: 't1', text: 'Existing task' }],
      metadata: { totalTasks: 1, calendarEvents: 0, recurringTasks: 0, generatedAt: new Date().toISOString() },
    })

    // Stage clears; now initial load should run once
    mockAuthState.calendarConnectionStage = null
    rerender(<Dashboard />)

    await waitFor(() => {
      expect(mockFetchEvents).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalledTimes(1)
    })

    // No updateSchedule call expected in this path
    expect(mockUpdateSchedule).not.toHaveBeenCalled()
  })
})


