import { auth } from '@/auth/firebase'

// Add development bypass constants
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// Token refresh configuration
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000 // Refresh 5 minutes before expiry
const MAX_RETRY_ATTEMPTS = 1
const TOKEN_CACHE_KEY = 'firebase_token_cache'

interface TokenCache {
  token: string
  expiresAt: number
  refreshedAt: number
}

interface ApiRequestConfig extends RequestInit {
  skipAuth?: boolean
  retryCount?: number
}

/**
 * Centralized API client with automatic token refresh and 401 error recovery
 * Handles all authentication concerns in one place
 */
class ApiClient {
  private tokenCache: TokenCache | null = null
  private refreshPromise: Promise<string> | null = null

  /**
   * Get a fresh Firebase ID token, with caching and proactive refresh
   */
  private async getAuthToken(): Promise<string> {
    // Development bypass
    if (IS_DEVELOPMENT && BYPASS_AUTH) {
      return 'mock-token-for-development'
    }

    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Check if we have a valid cached token
    if (this.tokenCache) {
      const now = Date.now()
      const timeUntilExpiry = this.tokenCache.expiresAt - now

      // If token is still valid for more than the threshold, use cached token
      if (timeUntilExpiry > TOKEN_REFRESH_THRESHOLD_MS) {
        return this.tokenCache.token
      }
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return await this.refreshPromise
    }

    // Start token refresh
    this.refreshPromise = this.refreshToken()
    
    try {
      const token = await this.refreshPromise
      return token
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Refresh the Firebase token and update cache
   */
  private async refreshToken(): Promise<string> {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    try {
      console.log('🔄 Refreshing Firebase ID token...')
      
      // Force refresh to get a new token
      const token = await currentUser.getIdToken(true)
      
      // Parse JWT to get expiration time (optional, but helps with caching)
      let expiresAt = Date.now() + 3600000 // Default to 1 hour
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        expiresAt = payload.exp * 1000 // Convert to milliseconds
      } catch (e) {
        console.warn('Failed to parse token expiration, using default:', e)
      }

      // Update cache
      this.tokenCache = {
        token,
        expiresAt,
        refreshedAt: Date.now()
      }

      // Persist to localStorage for cross-tab consistency (client-side only)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(this.tokenCache))
        } catch (e) {
          console.warn('Failed to cache token in localStorage:', e)
        }
      }

      console.log('✅ Firebase ID token refreshed successfully')
      return token

    } catch (error) {
      console.error('❌ Failed to refresh Firebase token:', error)
      
      // Clear invalid cache
      this.tokenCache = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_CACHE_KEY)
      }
      
      throw error
    }
  }

  /**
   * Load cached token from localStorage on initialization (client-side only)
   */
  private loadCachedToken(): void {
    // Skip on server-side
    if (typeof window === 'undefined') {
      return
    }

    try {
      const cached = localStorage.getItem(TOKEN_CACHE_KEY)
      if (cached) {
        const tokenData: TokenCache = JSON.parse(cached)
        
        // Only use cache if it's not expired
        if (tokenData.expiresAt > Date.now()) {
          this.tokenCache = tokenData
        } else {
          localStorage.removeItem(TOKEN_CACHE_KEY)
        }
      }
    } catch (e) {
      console.warn('Failed to load cached token:', e)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_CACHE_KEY)
      }
    }
  }

  /**
   * Make an authenticated API request with automatic retry on 401
   */
  async request<T = any>(
    url: string, 
    config: ApiRequestConfig = {}
  ): Promise<Response> {
    const {
      skipAuth = false,
      retryCount = 0,
      headers = {},
      ...fetchConfig
    } = config

    // Build request URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

    // Prepare headers - handle different header types from RequestInit
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Safely merge headers based on their type
    if (headers) {
      if (headers instanceof Headers) {
        // Convert Headers object to Record<string, string>
        headers.forEach((value, key) => {
          requestHeaders[key] = value
        })
      } else if (Array.isArray(headers)) {
        // Handle string[][] format
        headers.forEach(([key, value]) => {
          requestHeaders[key] = value
        })
      } else {
        // Handle Record<string, string> format
        Object.assign(requestHeaders, headers as Record<string, string>)
      }
    }

    // Add authentication if not skipped
    if (!skipAuth) {
      try {
        const token = await this.getAuthToken()
        requestHeaders.Authorization = `Bearer ${token}`
      } catch (error) {
        console.error('Failed to get auth token:', error)
        throw new Error('Authentication failed')
      }
    }

    // Make the request
    try {
      const response = await fetch(fullUrl, {
        ...fetchConfig,
        headers: requestHeaders
      })

      // Handle 401 errors with automatic retry
      if (response.status === 401 && !skipAuth && retryCount < MAX_RETRY_ATTEMPTS) {
        console.log('🔄 Received 401, clearing token cache and retrying...')
        
        // Clear token cache to force refresh
        this.tokenCache = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_CACHE_KEY)
        }
        
        // Retry the request
        return await this.request(url, {
          ...config,
          retryCount: retryCount + 1
        })
      }

      return response

    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = any>(url: string, config: ApiRequestConfig = {}): Promise<Response> {
    return await this.request<T>(url, { ...config, method: 'GET' })
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = any>(
    url: string, 
    data?: any, 
    config: ApiRequestConfig = {}
  ): Promise<Response> {
    return await this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = any>(
    url: string, 
    data?: any, 
    config: ApiRequestConfig = {}
  ): Promise<Response> {
    return await this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = any>(url: string, config: ApiRequestConfig = {}): Promise<Response> {
    return await this.request<T>(url, { ...config, method: 'DELETE' })
  }

  /**
   * Start background token refresh to keep tokens fresh
   */
  startBackgroundRefresh(): void {
    // Refresh token every 30 minutes to stay ahead of expiration
    const refreshInterval = 30 * 60 * 1000 // 30 minutes
    
    const refreshLoop = async () => {
      if (auth.currentUser) {
        try {
          await this.getAuthToken() // This will refresh if needed
        } catch (error) {
          console.warn('Background token refresh failed:', error)
        }
      }
      
      setTimeout(refreshLoop, refreshInterval)
    }

    // Start the loop after initial delay
    setTimeout(refreshLoop, refreshInterval)
  }

  /**
   * Initialize the API client
   */
  initialize(): void {
    this.loadCachedToken()
    this.startBackgroundRefresh()
    
    console.log('🚀 API Client initialized with automatic token refresh')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Initialize on import
apiClient.initialize()

// Export types for use by other modules
export type { ApiRequestConfig }