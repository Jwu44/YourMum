import { deleteUserAccount } from '@/lib/api/settings'

// Mock fetch globally
global.fetch = jest.fn()

describe('deleteUserAccount API', () => {
  const mockToken = 'mock-firebase-token'
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully delete user account', async () => {
    const mockResponse = {
      success: true,
      message: 'Account deleted successfully',
      deleted_documents: 5
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await deleteUserAccount(mockToken)

    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    expect(result).toEqual(mockResponse)
  })

  it('should handle API error responses', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'Authentication required'
    }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockErrorResponse
    } as Response)

    await expect(deleteUserAccount(mockToken)).rejects.toThrow('Authentication required')
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(deleteUserAccount(mockToken)).rejects.toThrow('Network error')
  })

  it('should include warnings in successful response', async () => {
    const mockResponse = {
      success: true,
      message: 'Account deleted successfully',
      deleted_documents: 3,
      warnings: ['Slack disconnection failed']
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await deleteUserAccount(mockToken)

    expect(result.warnings).toEqual(['Slack disconnection failed'])
    expect(result.success).toBe(true)
  })
}) 