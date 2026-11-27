/**
 * Where the API is and which site's sign-in this panel borrows.
 *
 * The panel has no site of its own: it signs in through one site's Google
 * client, and the API ties a session to that site (the token's `tid` must
 * match X-Tenant). Which site is configuration, not code.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const TENANT = process.env.NEXT_PUBLIC_TENANT?.trim() || ''

export function tenantHeader(): Record<string, string> {
  return TENANT ? { 'X-Tenant': TENANT } : {}
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  lastPage: number
}

/** An API failure with its status, so the UI can say something useful. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const BY_STATUS: Record<number, string> = {
  401: 'Se cerró tu sesión. Iniciá sesión de nuevo y reintentá.',
  403: 'No tenés permiso para ver esto.',
  429: 'Hiciste demasiados intentos seguidos. Esperá un momento.',
}

/** A message safe to show. Never the API's own (English) prose. */
export function translateApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const mapped = BY_STATUS[err.status]
    if (mapped) return mapped
    if (err.status >= 500) return 'El servicio no está disponible en este momento. Probá de nuevo en unos minutos.'
    return fallback
  }
  // fetch() rejects with a TypeError when the request never reached the server.
  if (err instanceof TypeError) return 'No pudimos conectarnos. Revisá tu conexión e intentá otra vez.'
  return fallback
}
