import axios, { type InternalAxiosRequestConfig } from 'axios'

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

let refreshPromise: Promise<unknown> | null = null
const SESSION_MARKER = 'innova-store:session-active'

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as RetryableRequest | undefined
    const status = error.response?.status
    const url = request?.url ?? ''
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/refresh')

    if (status !== 401 || !request || request._retry || isAuthRequest) {
      return Promise.reject(error)
    }

    request._retry = true

    try {
      refreshPromise ??= http.post('/auth/refresh').finally(() => {
        refreshPromise = null
      })
      await refreshPromise
      return http(request)
    } catch (refreshError) {
      if (localStorage.getItem(SESSION_MARKER) === 'true') {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
      return Promise.reject(refreshError)
    }
  },
)
