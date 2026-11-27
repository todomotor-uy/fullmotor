import { API_URL, ApiError, type PaginationMeta, tenantHeader } from './api'
import { getStoredToken } from './auth'

/**
 * The super admin side of the API — `/api/superadmin/*`, which reads across
 * every site and answers 403 to anyone not in SUPERADMIN_EMAILS.
 */

async function superFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  if (!token) throw new ApiError('Authentication required', 401)
  const res = await fetch(`${API_URL}/api/superadmin${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      ...tenantHeader(),
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || res.statusText, res.status)
  }
  return res
}

export interface SiteMetrics {
  users: { total: number; new: number; active: number; suspended: number }
  classifieds: { active: number; expired: number; paused: number; sold: number; deleted: number; new: number }
  dealerships: { approved: number; pending: number; rejected: number; suspended: number; new: number }
  posts: { published: number; drafts: number; scheduled: number; new: number }
  events: { published: number; drafts: number; upcoming: number }
  comments: { visible: number; new: number; removed: number }
  catalog: { vehicles: number }
  ads: { activeCampaigns: number; impressions: number; clicks: number }
  errors: { api: number; webClient: number; webServer: number }
  feedback: { new: number; unread: number }
  pendingModeration: number
}

export interface DayPoint {
  date: string
  newUsers: number
  classifieds: number
  errors: number
  feedback: number
}

export interface SiteOverview {
  tenantId: string
  name: string
  baseUrl: string
  active: boolean
  modules: string[]
  metrics: SiteMetrics
  series: DayPoint[]
}

export interface Overview {
  from: string
  to: string
  generatedAt: string
  sites: SiteOverview[]
  total: { metrics: SiteMetrics; series: DayPoint[] }
}

export async function fetchOverview(from: string, to: string): Promise<Overview> {
  const res = await superFetch(`/overview?${new URLSearchParams({ from, to })}`)
  return res.json()
}

export type ErrorSource = 'api' | 'web-client' | 'web-server'

export interface ErrorLog {
  id: string
  tenantId: string
  source: ErrorSource
  status: number
  method?: string
  path: string
  route?: string
  message: string
  detail?: string
  userAgent?: string
  durationMs?: number
  createdAt: string
}

export interface ErrorGroup {
  source: ErrorSource
  tenantId: string
  where: string
  message: string
  status: number
  count: number
  lastAt: string
}

export async function fetchErrors(params: {
  from: string
  to: string
  source?: string
  tenant?: string
  page?: number
}): Promise<{ data: ErrorLog[]; groups: ErrorGroup[]; meta: PaginationMeta }> {
  const search = new URLSearchParams({ from: params.from, to: params.to, limit: '25' })
  if (params.source && params.source !== 'all') search.set('source', params.source)
  if (params.tenant) search.set('tenant', params.tenant)
  if (params.page) search.set('page', String(params.page))
  const res = await superFetch(`/errors?${search}`)
  return res.json()
}

export interface FeedbackItem {
  id: string
  tenantId: string
  userId?: string
  userName?: string
  userEmail?: string
  message: string
  page: string
  contact?: string
  readAt?: string | null
  createdAt: string
}

export async function fetchFeedback(params: {
  status?: string
  tenant?: string
  page?: number
}): Promise<{ data: FeedbackItem[]; unread: number; meta: PaginationMeta }> {
  const search = new URLSearchParams({ limit: '25' })
  if (params.status && params.status !== 'all') search.set('status', params.status)
  if (params.tenant) search.set('tenant', params.tenant)
  if (params.page) search.set('page', String(params.page))
  const res = await superFetch(`/feedback?${search}`)
  return res.json()
}

export async function markFeedback(id: string, read: boolean): Promise<FeedbackItem> {
  const res = await superFetch(`/feedback/${id}`, { method: 'PATCH', body: JSON.stringify({ read }) })
  return res.json()
}
