'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/feedback-api'

/** At most this many reports per page load, and each message once. */
const MAX_REPORTS = 5
const sent = new Set<string>()

export function reportClientError(message: string, detail?: string, digest?: string) {
  if (typeof window === 'undefined') return
  const key = message.slice(0, 200)
  if (sent.has(key) || sent.size >= MAX_REPORTS) return
  sent.add(key)
  void reportError({ source: 'web-client', message, detail, digest, page: window.location.pathname })
}

/**
 * Sends uncaught browser errors to the API (POST /api/client-errors). Errors from other origins (extensions, third-party tags) arrive as a
 * bare "Script error." with nothing to act on, and are skipped.
 */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (!e.message || e.message === 'Script error.' || !e.filename) return
      const where = `${e.filename}:${e.lineno}:${e.colno}`
      reportClientError(e.message, [where, e.error?.stack].filter(Boolean).join('\n'))
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason
      const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason)
      reportClientError(`Unhandled rejection: ${message}`, reason instanceof Error ? reason.stack : undefined)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
