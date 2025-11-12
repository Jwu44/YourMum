import { apiClient } from './client'

export type FeedbackResponse = 'thumbs_up' | 'thumbs_down' | 'dismissed'

/**
 * Feedback API client for user feature feedback
 */
export const feedbackApi = {
  /**
   * Check if the user should see the feature feedback prompt
   *
   * @returns Promise with should_show boolean
   */
  async shouldShowFeedback(): Promise<{ should_show: boolean }> {
    try {
      const response = await apiClient.get('/api/user/should-show-feedback')

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to check feedback status' }))
        throw new Error(error.error || 'Failed to check feedback status')
      }

      return await response.json()
    } catch (error) {
      console.error('Error checking feedback status:', error)
      // Return false by default on error to avoid showing prompt unnecessarily
      return { should_show: false }
    }
  },

  /**
   * Submit user's feedback response
   *
   * @param response - User's feedback response (thumbs_up, thumbs_down, or dismissed)
   * @returns Promise with success boolean
   */
  async submitFeedback(response: FeedbackResponse): Promise<{ success: boolean }> {
    try {
      const apiResponse = await apiClient.post('/api/user/feedback', { response })

      if (!apiResponse.ok) {
        const error = await apiResponse.json().catch(() => ({ error: 'Failed to submit feedback' }))
        throw new Error(error.error || 'Failed to submit feedback')
      }

      return await apiResponse.json()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      return { success: false }
    }
  }
}
