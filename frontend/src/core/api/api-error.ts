import axios from 'axios'

interface ApiErrorBody {
  message?: string | string[]
  error?: string
  fieldErrors?: Record<string, string | string[]>
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado') {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return fallback

  const message = error.response?.data?.message
  const fieldErrors = error.response?.data?.fieldErrors
  if (fieldErrors) {
    const first = Object.values(fieldErrors)[0]
    if (Array.isArray(first)) return first[0] ?? fallback
    if (typeof first === 'string' && first.trim()) return first
  }
  if (Array.isArray(message)) return message[0] ?? fallback
  if (typeof message === 'string' && message.trim()) return message
  return error.response?.data?.error || fallback
}
