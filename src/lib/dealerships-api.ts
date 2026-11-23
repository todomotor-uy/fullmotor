import type { LatLng } from './location'
import { Dealership } from '@/types/classified'
import { ApiError } from './api-error'
import { getStoredToken } from './auth'
import { tenantHeader } from '@/lib/tenant'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.todomotor.uy'
const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'

async function handleApiError(response: Response): Promise<never> {
  let detail = response.statusText
  try {
    const text = await response.text()
    try {
      const json = JSON.parse(text)
      detail = json.error || json.message || text
    } catch {
      detail = text || response.statusText
    }
  } catch {
    // ignore
  }
  throw new ApiError(detail, response.status)
}

function publicHeaders(): HeadersInit {
  return { 'X-Country': COUNTRY, ...tenantHeader() }
}

function authHeaders(): HeadersInit {
  const t = getStoredToken()
  if (!t) throw new ApiError('Authentication required', 401)
  return { 'X-Country': COUNTRY, ...tenantHeader(), Authorization: `Bearer ${t}` }
}

function jsonHeaders(): HeadersInit {
  return { ...authHeaders(), 'Content-Type': 'application/json' }
}

export interface PaginatedDealerships {
  data: Dealership[]
  meta: { total: number; page: number; limit: number; lastPage: number }
}

/**
 * Approved storefronts.
 *
 * `revalidate` is opt-in for the same reason as the classifieds listing: the
 * sitemap and generateStaticParams want a cached corpus walk, a page request
 * wants what is true now.
 */
export async function fetchDealerships(
  params: { page?: number; limit?: number; revalidate?: number } = {}
): Promise<PaginatedDealerships> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))

  const response = await fetch(
    `${API_URL}/api/dealerships${search.toString() ? `?${search}` : ''}`,
    {
      headers: publicHeaders(),
      ...(params.revalidate === undefined
        ? { cache: 'no-store' as const }
        : { next: { revalidate: params.revalidate } }),
    }
  )
  if (!response.ok) await handleApiError(response)
  return response.json()
}

/** Every storefront, for the sitemap and generateStaticParams. */
export async function getAllDealerships(): Promise<Dealership[]> {
  try {
    const all: Dealership[] = []
    let page = 1
    const limit = 50

    while (true) {
      const { data, meta } = await fetchDealerships({ page, limit, revalidate: 300 })
      all.push(...data)
      if (page >= meta.lastPage || data.length === 0) break
      page++
    }

    return all
  } catch (error) {
    console.error('[dealerships] getAllDealerships failed — sitemap will omit them:', error)
    return []
  }
}

export async function fetchDealershipBySlug(slug: string): Promise<Dealership | null> {
  const response = await fetch(`${API_URL}/api/dealerships/${encodeURIComponent(slug)}`, {
    headers: publicHeaders(),
    next: { revalidate: 300 },
  })
  if (response.status === 404) return null
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export interface DealershipApplicationPayload {
  name: string
  countryCode: string
  slug?: string
  description?: string
  city?: string
  address?: string
  /** "" removes it on update. */
  department?: string
  /** Optional map pin; on update, left out keeps it and null removes it. */
  pin?: LatLng | null
  phone?: string
  whatsapp?: string
  website?: string
  hours?: string
  /** Storefront page, on update only; "" removes each. */
  pageMarkdown?: string
  coverImage?: string
  logoUrl?: string
}

export async function applyForDealership(
  payload: DealershipApplicationPayload
): Promise<Dealership> {
  const response = await fetch(`${API_URL}/api/dealerships`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export async function updateMyDealership(
  payload: Partial<DealershipApplicationPayload>
): Promise<Dealership> {
  const response = await fetch(`${API_URL}/api/dealerships/mine`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

/** Uploads one image for the caller's storefront page and returns its URL. */
export async function uploadMyDealershipImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('images', file)
  const response = await fetch(`${API_URL}/api/dealerships/mine/images`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  })
  if (!response.ok) await handleApiError(response)
  const json = await response.json()
  const url = (json.data ?? json).uploaded?.[0]?.url
  if (!url) throw new Error('La subida no devolvió una URL')
  return url
}

// ============================================
// Operator review
// ============================================

export interface DealershipForReview extends Dealership {
  userId: string
  userEmail: string
  userName: string
  reviewedAt?: string | null
  reviewNote?: string | null
}

export async function fetchDealershipsForReview(
  status = 'pending'
): Promise<{ data: DealershipForReview[]; meta: { total: number } }> {
  const response = await fetch(`${API_URL}/api/ops/dealerships?status=${status}&limit=50`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export async function reviewDealership(
  id: string,
  status: 'approved' | 'rejected' | 'suspended',
  opts: { note?: string; reason?: string } = {}
): Promise<Dealership> {
  const response = await fetch(`${API_URL}/api/ops/dealerships/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ status, ...opts }),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}
