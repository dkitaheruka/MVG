import type { ApiError } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string; deviceId?: string; deviceType?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.deviceType) headers.set('X-Device-Type', options.deviceType)
  if (options.deviceId) headers.set('X-Device-Id', options.deviceId)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? ((await response.json()) as ApiError | T) : await response.text()

  if (!response.ok) {
    const message = typeof body === 'string' ? body : (body as ApiError).message
    throw new HttpError(response.status, message || 'Erreur serveur')
  }

  return body as T
}

export function downloadUrl(path: string) {
  return `${API_BASE_URL}${path}`
}
