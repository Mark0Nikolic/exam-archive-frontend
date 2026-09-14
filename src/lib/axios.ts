import axios, { AxiosError } from 'axios'
import i18n from '../i18n'
import type { ValidationErrors } from './types'

interface ProblemDetails {
  title?: string
  detail?: string
  status?: number
  errors?: ValidationErrors
}

export class ApiError extends Error {
  status: number
  title: string
  errors: ValidationErrors

  constructor(status: number, title: string, detail: string, errors: ValidationErrors = {}) {
    super(detail || title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.errors = errors
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://localhost:7294',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  } else if (config.data !== undefined) {
    config.headers.set('Content-Type', 'application/json')
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetails>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError(0, i18n.t('common.connectionFailedTitle'), i18n.t('common.connectionFailed')),
      )
    }

    const body = error.response.data
    return Promise.reject(
      new ApiError(
        error.response.status,
        body?.title ?? i18n.t('common.requestFailed'),
        body?.detail ?? error.message,
        body?.errors,
      ),
    )
  },
)
