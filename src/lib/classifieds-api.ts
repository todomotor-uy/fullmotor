import {
  AuthUser,
  Classified,
  ClassifiedCategory,
  ClassifiedFacets,
  ClassifiedStatus,
  Comment,
  PaginatedClassifieds,
} from '@/types/classified'
import { getStoredToken } from './auth'
import { ApiError } from './api-error'
import { MAX_UPLOAD_FILE_BYTES, planUploadBatches, prepareImageForUpload } from './image-upload'

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
  // The backend's own wording is kept for logs; use translateApiError from
  // '@/lib/api-error' before putting anything from here on screen.
  throw new ApiError(detail, response.status)
}

function publicHeaders(): HeadersInit {
  return {
    'X-Country': COUNTRY,
  }
}

/**
 * Public endpoints that reveal a little more to the owner. Sends the token when
 * there is one and stays anonymous otherwise, so the same call works from a
 * server component (where there is no localStorage) and from the browser.
 */
function optionalAuthHeaders(): HeadersInit {
  const t = getStoredToken()
  return t ? { 'X-Country': COUNTRY, Authorization: `Bearer ${t}` } : { 'X-Country': COUNTRY }
}

function authHeaders(token?: string | null): HeadersInit {
  const t = token ?? getStoredToken()
  if (!t) {
    throw new ApiError('Authentication required', 401)
  }
  return {
    'X-Country': COUNTRY,
    Authorization: `Bearer ${t}`,
  }
}

function jsonHeaders(token?: string | null): HeadersInit {
  return {
    ...authHeaders(token),
    'Content-Type': 'application/json',
  }
}

// ============================================
// Auth
// ============================================

export async function googleLogin(idToken: string): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export async function getMe(token?: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

// ============================================
// Classifieds — Public
// ============================================

export interface FetchClassifiedsParams {
  page?: number
  limit?: number
  category?: ClassifiedCategory
  city?: string
  /** Free-text search over title, description, city, brand and model. */
  q?: string
  brand?: string
  fuel?: string
  transmission?: string
  minYear?: string
  maxYear?: string
  maxMileage?: string
  /** Restricts the list to one approved storefront's inventory. */
  dealership?: string
  /** Price filtering only makes sense inside one currency; the API defaults to USD. */
  currency?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  signal?: AbortSignal
  /**
   * Seconds to cache for. Omit on request paths — a freshly published listing
   * has to show up immediately. Only the sitemap, which pages through the whole
   * corpus at build time, opts into caching.
   */
  revalidate?: number
}

export async function fetchClassifieds(
  params: FetchClassifiedsParams = {}
): Promise<PaginatedClassifieds> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.category) search.set('category', params.category)
  if (params.city) search.set('city', params.city)
  if (params.q) search.set('q', params.q)
  if (params.brand) search.set('brand', params.brand)
  if (params.fuel) search.set('fuel', params.fuel)
  if (params.transmission) search.set('transmission', params.transmission)
  if (params.minYear) search.set('min_year', params.minYear)
  if (params.maxYear) search.set('max_year', params.maxYear)
  if (params.maxMileage) search.set('max_mileage', params.maxMileage)
  if (params.dealership) search.set('dealership', params.dealership)
  if (params.currency) search.set('currency', params.currency)
  if (params.minPrice) search.set('min_price', params.minPrice)
  if (params.maxPrice) search.set('max_price', params.maxPrice)
  if (params.sort) search.set('sort', params.sort)

  const url = `${API_URL}/api/classifieds${search.toString() ? `?${search}` : ''}`
  const response = await fetch(url, {
    headers: publicHeaders(),
    // The page is `force-dynamic`, but the fetch cache is what decides here and
    // it used to win: with `revalidate: 30` the listing served a stale payload,
    // so someone who had just published still saw "Todavía no hay clasificados".
    ...(params.revalidate === undefined
      ? { cache: 'no-store' as const }
      : { next: { revalidate: params.revalidate } }),
    signal: params.signal,
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

/**
 * Every listing that is safe to expose to crawlers: active, not expired.
 * Pages through the API the same way getAllBlogPosts/getAllVehicles do.
 * Used by the sitemap — never call this from a request path.
 */
export async function getAllIndexableClassifieds(): Promise<Classified[]> {
  try {
    const all: Classified[] = []
    let page = 1
    // The classifieds endpoint caps page size at 50, not the 100 that vehicles
    // and blog allow. It used to clamp silently; now it returns 400.
    const limit = 50

    while (true) {
      // Cached: this walks the entire corpus, and a sitemap does not need
      // second-level freshness.
      const { data, meta } = await fetchClassifieds({ page, limit, revalidate: 30 })
      all.push(...data)
      if (page >= meta.lastPage) break
      page++
    }

    const now = Date.now()
    return all.filter(c => c.status === 'active' && new Date(c.expiresAt).getTime() > now)
  } catch (error) {
    console.error('[classifieds] getAllIndexableClassifieds failed — sitemap will omit classifieds:', error)
    return []
  }
}

/**
 * The closed sets for brand, fuel and transmission.
 *
 * Fetched rather than hardcoded so the client cannot drift from the whitelist
 * the API validates against — a brand missing here would be unpickable, and one
 * missing there would be rejected on submit. Cached for an hour: this changes
 * when someone edits a Go file, not at runtime.
 */
export async function fetchClassifiedFacets(): Promise<ClassifiedFacets> {
  const response = await fetch(`${API_URL}/api/classifieds/facets`, {
    headers: publicHeaders(),
    next: { revalidate: 3600 },
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export async function fetchClassifiedById(id: string): Promise<Classified | null> {
  const response = await fetch(`${API_URL}/api/classifieds/${id}`, {
    // Authenticated so the owner reads back their own contactInfo even when it
    // is hidden from the public. The edit form prefills from here; without the
    // token it would prefill blank and overwrite the number on save.
    headers: optionalAuthHeaders(),
    cache: 'no-store',
  })
  if (response.status === 404 || response.status === 400) return null
  if (!response.ok) await handleApiError(response)
  return response.json()
}

// ============================================
// Classifieds — Authenticated
// ============================================

export async function fetchMyClassifieds(
  params: {
    page?: number
    limit?: number
    /** active | paused | sold | expired. `expired` is derived from the date. */
    status?: string
    q?: string
  } = {}
): Promise<PaginatedClassifieds> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.status) search.set('status', params.status)
  if (params.q) search.set('q', params.q)

  const url = `${API_URL}/api/classifieds/mine${search.toString() ? `?${search}` : ''}`
  const response = await fetch(url, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

/** Structured vehicle details, shared by the create and update payloads. */
export interface VehicleFieldsPayload {
  year?: number
  mileageKm?: number
  brand?: string
  model?: string
  fuelType?: string
  transmission?: string
}

export interface CreateClassifiedPayload extends VehicleFieldsPayload {
  title: string
  description: string
  category: ClassifiedCategory
  price: number
  currency: string
  countryCode: string
  city: string
  contactInfo?: string
  showContactInfo?: boolean
}

export async function createClassified(payload: CreateClassifiedPayload): Promise<Classified> {
  const response = await fetch(`${API_URL}/api/classifieds`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export interface UpdateClassifiedPayload extends VehicleFieldsPayload {
  title?: string
  description?: string
  category?: ClassifiedCategory
  price?: number
  currency?: string
  city?: string
  contactInfo?: string
  showContactInfo?: boolean
  status?: ClassifiedStatus
}

export async function updateClassified(
  id: string,
  payload: UpdateClassifiedPayload
): Promise<Classified> {
  const response = await fetch(`${API_URL}/api/classifieds/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

/**
 * Extends an expiring or expired listing by another 30 days, and brings it back
 * to active unless it was marked sold. The API only accepts this within a week
 * of expiry — see RENEW_WINDOW_MS.
 */
export async function renewClassified(id: string): Promise<Classified> {
  const response = await fetch(`${API_URL}/api/classifieds/${id}/renew`, {
    method: 'POST',
    headers: jsonHeaders(),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export async function deleteClassified(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/classifieds/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!response.ok) await handleApiError(response)
}

export interface UploadImagesResult {
  uploaded: string[]
  totalImages: number
  /** One entry per file that failed while others succeeded. Empty on full success. */
  errors: string[]
}

/** Files per request, at most. */
const UPLOAD_BATCH_SIZE = 5

/**
 * Bytes per request, at most.
 *
 * Not a style choice: the API runs on Vercel, which rejects any request body
 * over 4.5 MB before a handler ever runs — with an HTML 413 that never reaches
 * the Spanish translation layer. Four leaves room for the multipart framing.
 * Photos are recompressed client-side first (see image-upload.ts), so a batch
 * normally holds two or three of them.
 */
const UPLOAD_REQUEST_BYTES = 4 * 1024 * 1024

/**
 * Prepares each photo, uploads in batches and merges the results.
 *
 * Sequential rather than parallel: the batches append to the same listing, and
 * concurrent appends would race on the images array.
 */
export async function uploadClassifiedImages(
  id: string,
  files: File[]
): Promise<UploadImagesResult> {
  const merged: UploadImagesResult = { uploaded: [], totalImages: 0, errors: [] }

  const ready: File[] = []
  for (const file of files) {
    const prepared = await prepareImageForUpload(file)
    if (prepared.size > MAX_UPLOAD_FILE_BYTES) {
      // Reported the same way the API reports a per-file failure, so the
      // uploader shows it as "N de M no se pudieron subir" rather than
      // sending a request that is guaranteed to be refused.
      merged.errors.push(`${file.name}: too large even after compression`)
      continue
    }
    ready.push(prepared)
  }

  for (const batch of planUploadBatches(ready, UPLOAD_REQUEST_BYTES, UPLOAD_BATCH_SIZE)) {
    const result = await uploadClassifiedImageBatch(id, batch)
    merged.uploaded.push(...result.uploaded)
    merged.errors.push(...result.errors)
    // The last batch knows the true total; earlier ones are already stale.
    merged.totalImages = result.totalImages
  }
  return merged
}

async function uploadClassifiedImageBatch(
  id: string,
  files: File[]
): Promise<UploadImagesResult> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('images', file)
  }
  // Don't set Content-Type — browser sets multipart boundary
  const response = await fetch(`${API_URL}/api/classifieds/${id}/images`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (!response.ok) await handleApiError(response)

  const body = await response.json()

  // 207 Multi-Status means some files landed and others did not, and it counts
  // as ok, so a partial failure used to pass for success. It also nests the
  // payload under `data`, unlike the 201.
  if (response.status === 207) {
    return {
      uploaded: body?.data?.uploaded ?? [],
      totalImages: body?.data?.totalImages ?? 0,
      errors: body?.errors ?? [],
    }
  }

  return {
    uploaded: body?.uploaded ?? [],
    totalImages: body?.totalImages ?? 0,
    errors: [],
  }
}

export async function deleteClassifiedImage(id: string, url: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/classifieds/${id}/images`, {
    method: 'DELETE',
    headers: jsonHeaders(),
    body: JSON.stringify({ url }),
  })
  if (!response.ok) await handleApiError(response)
}

// ============================================
// Comments
// ============================================

export async function fetchComments(resourceId: string): Promise<Comment[]> {
  const response = await fetch(`${API_URL}/api/comments/${resourceId}`, {
    cache: 'no-store',
  })
  if (response.status === 404) return []
  if (!response.ok) await handleApiError(response)
  const data = await response.json()
  // Backend may return either an array or an envelope { data: [] }
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.data)) return data.data
  return []
}

export async function postComment(resourceId: string, body: string): Promise<Comment> {
  const response = await fetch(`${API_URL}/api/comments/${resourceId}`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ body }),
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

export async function deleteComment(resourceId: string, commentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/comments/${resourceId}/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!response.ok) await handleApiError(response)
}
