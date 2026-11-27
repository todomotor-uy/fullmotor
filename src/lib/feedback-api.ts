import { ApiError } from './api-error'
import { getStoredToken } from './auth'
import { tenantHeader } from '@/lib/tenant'

/**
 * What any visitor can send the people running the site: a comment, and the
 * errors their browser (or a server render) ran into. Both land in the super
 * admin panel.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.todomotor.uy'
const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'

export async function sendFeedback(input: { message: string; page: string; contact?: string }): Promise<void> {
  const token = getStoredToken()
  const res = await fetch(`${API_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Country': COUNTRY,
      ...tenantHeader(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || res.statusText, res.status)
  }
}

export interface ErrorReport {
  source: 'web-client' | 'web-server'
  message: string
  detail?: string
  page?: string
  digest?: string
}

/**
 * Report an error. Never throws and never waits long: it runs on a page that
 * is already failing, and a reporter that fails too only makes it worse.
 */
export async function reportError(report: ErrorReport): Promise<void> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    await fetch(`${API_URL}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Country': COUNTRY, ...tenantHeader() },
      body: JSON.stringify({
        ...report,
        message: report.message.slice(0, 500),
        detail: report.detail?.slice(0, 4000),
      }),
      keepalive: report.source === 'web-client',
      signal: controller.signal,
    })
    clearTimeout(timer)
  } catch {
    // Nothing to do: see above.
  }
}
