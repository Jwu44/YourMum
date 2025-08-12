/**
 * Tests for first-visit autogeneration flow
 */
// Critical mocks that must apply before importing Dashboard
jest.mock('@/auth/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: { uid: 'test', email: 'test@example.com' },
    calendarConnectionStage: null,
    currentUser: { uid: 'test', getIdToken: async () => 'mock-token' }
  }),
  AuthProvider: ({ children }: any) => children
}))

jest.mock('@/auth/firebase', () => ({
  __esModule: true,
  auth: {
    currentUser: { uid: 'test', getIdToken: async () => 'mock-token' }
  }
}))

// Stub firebase/auth used by real AuthProvider internals so using the real hook won't throw
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: any, cb: any) => {
    cb({ uid: 'test', email: 'test@example.com', getIdToken: async () => 'mock-token' })
    return () => {}
  },
  signOut: jest.fn(),
  GoogleAuthProvider: { credentialFromResult: jest.fn(() => ({ accessToken: 'token' })) },
  signInWithPopup: jest.fn(async () => ({ user: { uid: 'test', email: 'test@example.com' } })),
  signInWithRedirect: jest.fn(async () => {}),
  getRedirectResult: jest.fn(async () => null)
}))

// Module mocks used by Dashboard must be declared before importing Dashboard
jest.mock('@/lib/ScheduleHelper', () => {
  const real: any = (jest.requireActual as any)('@/lib/ScheduleHelper')
  return {
    loadSchedule: (...args: any[]) => mockLoadSchedule(...args),
    autogenerateTodaySchedule: (...args: any[]) => mockAutogenerate(...args),
    updateSchedule: jest.fn(),
    createSchedule: jest.fn(),
    deleteTask: jest.fn(),
    shouldTaskRecurOnDate: real.shouldTaskRecurOnDate
  }
})

jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    fetchEvents: (...args: any[]) => mockCalendarFetchEvents(...args)
  }
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

jest.mock('@/lib/helper', () => ({
  fetchAISuggestions: jest.fn(),
  formatDateToString: (date: Date) => date.toISOString().split('T')[0]
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}))

jest.mock('@/lib/FormContext', () => ({
  useForm: () => ({ state: {} }),
  FormProvider: ({ children }: any) => children
}))

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import Dashboard from '@/app/dashboard/page'
import { FormProvider } from '@/lib/FormContext'

// Local mocks
const mockLoadSchedule: any = jest.fn()
const mockAutogenerate: any = jest.fn()
const mockCalendarFetchEvents: any = jest.fn()
const mockToast: any = jest.fn()

// Duplicate mocks (post-import) removed; mocks above apply globally before imports

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AuthProvider } = require('@/auth/AuthContext')
  return (
    <AuthProvider>
      <FormProvider>{children}</FormProvider>
    </AuthProvider>
  )
}

describe('Auto-trigger daily schedule creation on first dashboard visit', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('loads existing schedule immediately (no autogeneration)', async () => {
    mockLoadSchedule.mockResolvedValue({ success: true, schedule: [{ id: '1', text: 'A', type: 'task' }] } as any)

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalled()
    })

    expect(mockAutogenerate).not.toHaveBeenCalled()
    expect(mockCalendarFetchEvents).not.toHaveBeenCalled()
    expect(screen.queryByText('No schedule found for selected date')).not.toBeInTheDocument()
  })

  test('autogenerates with skeleton and renders result on success', async () => {
    mockLoadSchedule.mockResolvedValue({ success: false, error: 'No schedule found for this date' } as any)
    mockAutogenerate.mockResolvedValue({ success: true, created: true, sourceFound: true, schedule: [{ id: 'X', text: 'Task', type: 'task' }] } as any)

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(mockLoadSchedule).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockAutogenerate).toHaveBeenCalled()
    })
    expect(mockCalendarFetchEvents).not.toHaveBeenCalled()
  })

  test('immediate empty state when no source schedule exists', async () => {
    mockLoadSchedule.mockResolvedValue({ success: false, error: 'No schedule found for this date' } as any)
    mockAutogenerate.mockResolvedValue({ success: true, created: false, sourceFound: false, schedule: [] } as any)

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(mockAutogenerate).toHaveBeenCalled()
    })

    expect(screen.getByText('No schedule found for selected date')).toBeInTheDocument()
    expect(mockCalendarFetchEvents).not.toHaveBeenCalled()
  })

  test('retry once then toast on failure; respect 10s timeout and render late success', async () => {
    mockLoadSchedule.mockResolvedValue({ success: false, error: 'No schedule found for this date' } as any)

    // First attempt fails, second attempt resolves after timeout
    let resolveSecond: (v: any) => void
    mockAutogenerate
      .mockResolvedValueOnce({ success: false, error: 'server error' } as any)
      .mockImplementationOnce(() => new Promise((res) => { resolveSecond = res as any }) as any)

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => expect(mockAutogenerate).toHaveBeenCalledTimes(1))

    // Advance to hit timeout 10s
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    // After timeout, empty state shown
    expect(screen.getByText('No schedule found for selected date')).toBeInTheDocument()

    // Complete second attempt late with success
    // @ts-ignore
    resolveSecond!({ success: true, created: true, sourceFound: true, schedule: [{ id: 'LATE', text: 'Late', type: 'task' }] } as any)

    await waitFor(() => {
      expect(mockAutogenerate).toHaveBeenCalledTimes(2)
    })

    // Expect a toast called for failure
    expect(mockToast).toHaveBeenCalled()
    expect(mockCalendarFetchEvents).not.toHaveBeenCalled()
  })
})


