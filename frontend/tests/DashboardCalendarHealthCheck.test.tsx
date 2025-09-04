import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'
import { useAuth } from '@/auth/AuthContext'

// Mock the auth context
jest.mock('@/auth/AuthContext', () => ({
  useAuth: jest.fn()
}))

// Mock fetch for API calls
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockAuthContextValue = {
  currentUser: {
    uid: 'test-user-123',
    getIdToken: jest.fn(() => Promise.resolve('mock-token'))
  },
  refreshCalendarCredentials: jest.fn(() => Promise.resolve()),
  loading: false,
  error: null
}

describe('Dashboard Calendar Health Check', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue(mockAuthContextValue)
    
    // Mock environment variable
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
  })

  afterEach(() => {
    delete (window as any).location
    window.location = { href: '', reload: jest.fn() } as any
  })

  it('should NOT trigger backend OAuth redirect when calendar API fails', async () => {
    // Mock calendar API failure (401)
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Calendar not connected' })
      } as Response)

    // Mock window.location to track redirects
    delete (window as any).location
    window.location = { href: '', reload: jest.fn() } as any

    render(<DashboardPage />)

    await waitFor(() => {
      // Should NOT redirect to Railway backend domain
      expect(window.location.href).not.toContain('yourmum-production.up.railway.app')
      expect(window.location.href).not.toContain('/api/calendar/oauth/start')
      
      // Should call refreshCalendarCredentials instead
      expect(mockAuthContextValue.refreshCalendarCredentials).toHaveBeenCalled()
    })
  })

  it('should not trigger refresh when calendar API works fine', async () => {
    // Mock successful calendar API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, tasks: [] })
    } as Response)

    render(<DashboardPage />)

    await waitFor(() => {
      // Should not call refresh function when API works
      expect(mockAuthContextValue.refreshCalendarCredentials).not.toHaveBeenCalled()
    })
  })

  it('should handle calendar refresh errors gracefully', async () => {
    // Mock calendar API failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    } as Response)

    // Mock refresh function to throw error
    mockAuthContextValue.refreshCalendarCredentials.mockRejectedValueOnce(
      new Error('Refresh failed')
    )

    render(<DashboardPage />)

    await waitFor(() => {
      // Should still call refresh function
      expect(mockAuthContextValue.refreshCalendarCredentials).toHaveBeenCalled()
      
      // Should not crash the dashboard
      expect(screen.queryByText(/error/i)).toBeNull()
    })
  })
})