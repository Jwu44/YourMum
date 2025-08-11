import React from 'react'
import { render, act, waitFor } from '@testing-library/react'

// Override the default mock from jest.setup to capture a shared push spy
const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({ get: jest.fn() }),
  usePathname: () => '/',
}))

// Mock the calendar API to observe fetchEvents calls from the connecting page
const fetchEventsMock = jest.fn()
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    fetchEvents: (...args: any[]) => fetchEventsMock(...args),
  },
}))

// Use fake timers to control timeouts on the connecting page
jest.useFakeTimers()

// Import after mocks
import ConnectingPage from '@/app/connecting/page'

describe('ConnectingPage calendar gating', () => {
  beforeEach(() => {
    pushMock.mockClear()
    fetchEventsMock.mockReset()
    localStorage.clear()
  })

  test('does not navigate to /dashboard until fetchEvents(today) resolves after progress becomes complete', async () => {
    // Arrange: initial verifying state on load
    localStorage.setItem('calendarConnectionProgress', 'verifying')

    // Make fetchEvents resolve only when we decide
    let resolveFetch!: (value: any) => void
    const fetchPromise = new Promise((resolve) => { resolveFetch = resolve })
    fetchEventsMock.mockReturnValue(fetchPromise)

    render(<ConnectingPage />)

    // Act: simulate storage event to signal completion
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'calendarConnectionProgress', newValue: 'complete' }))
    })

    // Assert: fetchEvents called with a Date or string convertible to YYYY-MM-DD; no navigation yet
    expect(fetchEventsMock).toHaveBeenCalledTimes(1)
    const [firstArg] = fetchEventsMock.mock.calls[0]
    const dateStr = typeof firstArg === 'string' ? firstArg : (firstArg instanceof Date ? firstArg.toISOString().split('T')[0] : '')
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(pushMock).not.toHaveBeenCalled()

    // Resolve fetch and advance timers to allow any post-success delay
    await act(async () => {
      resolveFetch({ success: true, tasks: [], count: 0, date: firstArg })
    })

    await act(async () => {
      jest.runOnlyPendingTimers()
    })

    // Now navigation should occur
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
    })
  })

  test('navigates to /dashboard after 15s fallback even if not complete', async () => {
    // Arrange: no progress keys -> fallback path
    render(<ConnectingPage />)

    // Act: advance timers to just before fallback
    await act(async () => {
      jest.advanceTimersByTime(14999)
    })
    expect(pushMock).not.toHaveBeenCalled()

    // Advance to hit fallback (15s)
    await act(async () => {
      jest.advanceTimersByTime(1)
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
    })
  })

  test('when complete on initial load, triggers fetchEvents(today) before navigating', async () => {
    // Arrange: complete already set when page mounts
    localStorage.setItem('calendarConnectionProgress', 'complete')

    // Defer resolution of fetchEvents
    let resolveFetch!: (value: any) => void
    const fetchPromise = new Promise((resolve) => { resolveFetch = resolve })
    fetchEventsMock.mockReturnValue(fetchPromise)

    render(<ConnectingPage />)

    // Should call fetchEvents and not navigate yet
    expect(fetchEventsMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()

    // Resolve fetch and allow timers to run
    await act(async () => {
      const [dateArg] = fetchEventsMock.mock.calls[0]
      resolveFetch({ success: true, tasks: [], count: 0, date: dateArg })
    })
    await act(async () => {
      jest.runOnlyPendingTimers()
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled()
    })
  })
})


