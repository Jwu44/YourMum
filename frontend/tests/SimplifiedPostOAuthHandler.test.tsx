import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { PostOAuthHandler } from '@/auth/PostOAuthHandler'
import { autogenerateTodaySchedule } from '@/lib/ScheduleHelper'
import { formatDateToString } from '@/lib/helper'

// Mock dependencies
jest.mock('@/lib/ScheduleHelper', () => ({
  autogenerateTodaySchedule: jest.fn()
}))

jest.mock('@/lib/helper', () => ({
  formatDateToString: jest.fn(() => '2025-09-12')
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}))

const mockedAutogenerateTodaySchedule = autogenerateTodaySchedule as jest.MockedFunction<typeof autogenerateTodaySchedule>
const mockedFormatDateToString = formatDateToString as jest.MockedFunction<typeof formatDateToString>

describe('SimplifiedPostOAuthHandler', () => {
  const mockOnComplete = jest.fn()
  const mockOnError = jest.fn()
  const mockCredential = {
    accessToken: 'mock-access-token'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedAutogenerateTodaySchedule.mockResolvedValue({ success: true })
  })

  it('should render schedule generation loading message', () => {
    render(
      <PostOAuthHandler
        credential={mockCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('Setting up your schedule for today...')).toBeInTheDocument()
  })

  it('should call autogenerateTodaySchedule with current date', async () => {
    render(
      <PostOAuthHandler
        credential={mockCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    await waitFor(() => {
      expect(mockedFormatDateToString).toHaveBeenCalledWith(expect.any(Date))
      expect(mockedAutogenerateTodaySchedule).toHaveBeenCalledWith('2025-09-12')
    })
  })

  it('should complete successfully when schedule generation succeeds', async () => {
    mockedAutogenerateTodaySchedule.mockResolvedValueOnce({ success: true, message: 'Schedule created' })

    render(
      <PostOAuthHandler
        credential={mockCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('All set! Taking you to your dashboard...')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Should call onComplete after completion delay
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should continue flow even when schedule generation fails', async () => {
    mockedAutogenerateTodaySchedule.mockResolvedValueOnce({ success: false, error: 'Generation failed' })

    render(
      <PostOAuthHandler
        credential={mockCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Should still complete the flow despite schedule generation failure
    await waitFor(() => {
      expect(screen.getByText('All set! Taking you to your dashboard...')).toBeInTheDocument()
    }, { timeout: 2000 })

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should work without credential since it no longer needs it', async () => {
    const noCredential = null

    render(
      <PostOAuthHandler
        credential={noCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('All set! Taking you to your dashboard...')).toBeInTheDocument()
    }, { timeout: 2000 })

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should handle schedule generation errors gracefully', async () => {
    mockedAutogenerateTodaySchedule.mockRejectedValueOnce(new Error('Network error'))

    render(
      <PostOAuthHandler
        credential={mockCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Network error')
    })
  })

  it('should show error message when schedule generation throws', async () => {
    mockedAutogenerateTodaySchedule.mockRejectedValueOnce(new Error('Network error'))

    render(
      <PostOAuthHandler
        credential={mockCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Something went wrong during setup. Please try again.')).toBeInTheDocument()
    })
  })

  it('should clean up session storage indicators on completion', async () => {
    // Mock sessionStorage
    const mockSetItem = jest.fn()
    const mockRemoveItem = jest.fn()

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: mockSetItem,
        removeItem: mockRemoveItem
      }
    })

    mockedAutogenerateTodaySchedule.mockResolvedValueOnce({ success: true })

    render(
      <PostOAuthHandler
        credential={mockCredential}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Should set oauth-in-progress on mount
    expect(mockSetItem).toHaveBeenCalledWith('oauth-in-progress', 'true')

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled()
    }, { timeout: 3000 })

    // Should remove oauth-in-progress on completion
    expect(mockRemoveItem).toHaveBeenCalledWith('oauth-in-progress')
  })
})
