import axios from 'axios'

interface ApiErrorBody {
  message?: string | string[]
  error?: string
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado') {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return fallback

  const message = error.response?.data?.message
  if (Array.isArray(message)) return message[0] ?? fallback
  if (typeof message === 'string' && message.trim()) return message
  return error.response?.data?.error || fallback
}
