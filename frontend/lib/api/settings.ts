import { type UserDocument } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Settings API helper functions
 */

/**
 * Fetch current user profile data
 * @param token Firebase auth token
 * @returns User profile data
 */
export async function fetchUserProfile (token: string): Promise<UserDocument> {
  const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  const data = await response.json()
  return data.user
}

/**
 * Update user profile data
 * @param token Firebase auth token
 * @param profileData Profile data to update
 * @returns Updated user data
 */
export async function updateUserProfile (
  token: string,
  profileData: Partial<Pick<UserDocument, 'displayName' | 'jobTitle' | 'age'>>
): Promise<UserDocument> {
  const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  })

  if (!response.ok) {
    throw new Error('Failed to update user profile')
  }

  const data = await response.json()
  return data.user
}
