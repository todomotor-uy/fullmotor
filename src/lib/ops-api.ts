import { Classified } from '@/types/classified'
import { ApiError } from './api-error'
import { getStoredToken } from './auth'
import type { Role } from './permissions'
import type { SiteEvent } from '@/types/event'
import { tenantHeader } from '@/lib/tenant'
import { refreshPublicContent } from './content-cache'
import type { CategoryOption, ModuleName } from './site-settings'

/**
 * The operator side of the API — `/api/ops/*`, behind the admin role on a real
 * session rather than the shared ADMIN_API_KEY.
 *
 * A file of its own rather than more exports in `dealerships-api.ts`: these
 * calls only ever run from `/admin`, and keeping them apart is what stops one
 * of them being imported into a public page by autocomplete.
 */

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

function authHeaders(): HeadersInit {
  const t = getStoredToken()
  if (!t) throw new ApiError('Authentication required', 401)
  return { 'X-Country': COUNTRY, ...tenantHeader(), Authorization: `Bearer ${t}` }
}

function jsonHeaders(): HeadersInit {
  return { ...authHeaders(), 'Content-Type': 'application/json' }
}

/** Every operator screen reads live: a cached moderation queue is a wrong one. */
async function opsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API_URL}/api/ops${path}`, {
    cache: 'no-store',
    ...init,
    headers: init.body ? jsonHeaders() : authHeaders(),
  })
  if (!response.ok) await handleApiError(response)
  return response
}

/**
 * After a write to posts or events, expire this site's cached copies of both:
 * a post shows its events and an event its post, so either change can show on
 * the other's pages.
 */
function refreshEditorial(): Promise<void> {
  return refreshPublicContent(getStoredToken(), 'blog', 'events')
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  lastPage: number
}

// ============================================
// Users
// ============================================

export interface AdminUser {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
  role: Role
  /** Admin of every site; the panel cannot change or suspend it. */
  superAdmin?: boolean
  createdAt: string
  suspended: boolean
  suspendedAt?: string | null
  suspendedReason?: string | null
  dealershipName?: string | null
  dealershipStatus?: string | null
  classifiedsCount: number
  commentsCount: number
}

export interface UserSummary {
  total: number
  active: number
  suspended: number
  admins: number
  newLast30Days: number
}

export interface UsersPage {
  data: AdminUser[]
  summary: UserSummary
  meta: PaginationMeta
}

export async function fetchUsers(
  params: { q?: string; status?: string; role?: string; page?: number; limit?: number } = {}
): Promise<UsersPage> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.status && params.status !== 'all') search.set('status', params.status)
  if (params.role) search.set('role', params.role)
  if (params.page) search.set('page', String(params.page))
  search.set('limit', String(params.limit ?? 25))

  const response = await opsFetch(`/users?${search}`)
  return response.json()
}

/**
 * Suspend an account or bring it back.
 *
 * `reason` reaches the person at their next login attempt and nowhere else, so
 * it is the only chance to tell them why.
 */
export async function setUserSuspended(
  id: string,
  suspended: boolean,
  reason?: string
): Promise<AdminUser> {
  const response = await opsFetch(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ suspended, reason: reason || undefined }),
  })
  return response.json()
}

/** Give an account of this site a role. */
export async function setUserRole(id: string, role: Role): Promise<{ id: string; role: Role }> {
  const response = await opsFetch(`/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
  const body = await response.json()
  return body.data
}

// ============================================
// Comments
// ============================================

export interface AdminComment {
  id: string
  resourceId: string
  parentId?: string | null
  body: string
  createdAt: string
  userId: string
  userName: string
  userEmail: string
  userSuspended: boolean
  deleted: boolean
  deletedAt?: string | null
  deletedByRole?: 'author' | 'moderator' | null
}

export async function fetchComments(
  params: { status?: string; resourceId?: string; userId?: string; q?: string; page?: number; limit?: number } = {}
): Promise<{ data: AdminComment[]; meta: PaginationMeta }> {
  const search = new URLSearchParams()
  if (params.status && params.status !== 'all') search.set('status', params.status)
  if (params.resourceId) search.set('resourceId', params.resourceId)
  if (params.userId) search.set('userId', params.userId)
  if (params.q) search.set('q', params.q)
  if (params.page) search.set('page', String(params.page))
  search.set('limit', String(params.limit ?? 25))

  const response = await opsFetch(`/comments?${search}`)
  return response.json()
}

export async function deleteComment(id: string): Promise<AdminComment> {
  const response = await opsFetch(`/comments/${id}`, { method: 'DELETE' })
  return response.json()
}

export async function restoreComment(id: string): Promise<AdminComment> {
  // No body, so opsFetch sends the plain auth headers — a POST with
  // Content-Type: application/json and nothing after it is what makes Fiber's
  // body parser complain about an empty body.
  const response = await opsFetch(`/comments/${id}/restore`, { method: 'POST' })
  return response.json()
}

// ============================================
// Classifieds
// ============================================

export interface AdminClassified extends Classified {
  userEmail: string
  userSuspended: boolean
  deleted: boolean
  deletedAt?: string | null
  deletedByRole?: 'author' | 'moderator' | null
  /** When the purge destroys the row and its photos — the restore deadline. */
  purgeAfter?: string | null
}

export async function fetchClassifiedsForModeration(
  params: { status?: string; userId?: string; q?: string; page?: number; limit?: number } = {}
): Promise<{ data: AdminClassified[]; meta: PaginationMeta }> {
  const search = new URLSearchParams()
  if (params.status && params.status !== 'all') search.set('status', params.status)
  if (params.userId) search.set('userId', params.userId)
  if (params.q) search.set('q', params.q)
  if (params.page) search.set('page', String(params.page))
  search.set('limit', String(params.limit ?? 25))

  const response = await opsFetch(`/classifieds?${search}`)
  return response.json()
}

/** Status only — pausing hides a listing without removing it. */
export async function moderateClassifiedStatus(
  id: string,
  status: 'active' | 'paused' | 'sold'
): Promise<Classified> {
  const response = await opsFetch(`/classifieds/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return response.json()
}

export async function deleteClassified(id: string): Promise<AdminClassified> {
  const response = await opsFetch(`/classifieds/${id}`, { method: 'DELETE' })
  return response.json()
}

export async function restoreClassified(id: string): Promise<AdminClassified> {
  const response = await opsFetch(`/classifieds/${id}/restore`, { method: 'POST' })
  return response.json()
}

// ============================================
// Catalogue images
// ============================================

export interface VehicleImageUpload {
  uploaded: { url: string }[]
  totalImages: number
}

/**
 * Attach photos to a vehicle.
 *
 * Goes to the API rather than the Next `/api/upload` route, which only ever
 * put a file in blob storage and handed back a URL somebody had to paste into
 * the vehicle by hand. This writes the vehicle too, which is what "subir una
 * imagen" was always supposed to mean.
 *
 * No Content-Type header: the browser has to set the multipart boundary
 * itself, and naming the type here silently strips it.
 */
export async function uploadVehicleImages(
  vehicleId: string,
  files: File[]
): Promise<VehicleImageUpload> {
  const body = new FormData()
  for (const file of files) body.append('images', file)

  const response = await fetch(`${API_URL}/api/ops/vehicles/${vehicleId}/images`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  })
  if (!response.ok) await handleApiError(response)
  return response.json()
}

// ============================================
// Blog
// ============================================

export type BlogStatus = 'draft' | 'published'

export interface AdminBlogPost {
  id: string
  slug: string
  countryCode: string
  title: string
  excerpt?: string | null
  contentMarkdown: string
  coverImage?: string | null
  tags: string[]
  authorId: string
  status: BlogStatus
  publishedAt?: string | null
  /** A draft with this goes live by itself at that instant. */
  scheduledAt?: string | null
  updatedAt: string
  createdAt: string
  sponsored?: boolean
  instagramMediaId?: string | null
}

export async function fetchBlogPosts(
  params: { status?: BlogStatus | 'scheduled' | 'all'; page?: number; limit?: number } = {}
): Promise<{ data: AdminBlogPost[]; meta: PaginationMeta }> {
  const search = new URLSearchParams()
  if (params.status && params.status !== 'all') search.set('status', params.status)
  search.set('countryCode', COUNTRY)
  if (params.page) search.set('page', String(params.page))
  search.set('limit', String(params.limit ?? 50))

  const response = await opsFetch(`/blog?${search}`)
  return response.json()
}

export interface CreateBlogPostPayload {
  slug: string
  countryCode: string
  title: string
  contentMarkdown: string
  authorId: string
  excerpt?: string
  coverImage?: string
  tags?: string[]
  status?: BlogStatus
  /** RFC 3339; only meaningful for a draft. */
  scheduledAt?: string
}

/** One post, any status, with its Markdown — what the editor opens. */
export async function fetchBlogPost(slug: string): Promise<AdminBlogPost> {
  const response = await opsFetch(`/blog/${encodeURIComponent(slug)}`)
  const json = await response.json()
  return json.data ?? json
}

export async function createBlogPost(payload: CreateBlogPostPayload): Promise<AdminBlogPost> {
  const response = await opsFetch('/blog', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  await refreshEditorial()
  const json = await response.json()
  // The blog handlers wrap single resources in { data }, unlike the moderation
  // ones. Tolerating both keeps this working if that is ever unified.
  return json.data ?? json
}

export async function updateBlogPost(
  slug: string,
  patch: Partial<Pick<AdminBlogPost, 'title' | 'slug' | 'excerpt' | 'contentMarkdown' | 'coverImage' | 'tags' | 'status'>> & {
    /** RFC 3339 to schedule, "" to cancel. */
    scheduledAt?: string
  }
): Promise<AdminBlogPost> {
  const response = await opsFetch(`/blog/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  await refreshEditorial()
  const json = await response.json()
  return json.data ?? json
}

export async function deleteBlogPost(slug: string): Promise<void> {
  await opsFetch(`/blog/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  await refreshEditorial()
}

/**
 * Upload a cover image and return its URL.
 *
 * Standalone from the post on purpose — the API exposes it that way so a cover
 * can be uploaded before the post it belongs to exists. Attaching it is a
 * separate PATCH of `coverImage`.
 */
export async function uploadBlogImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('images', file)

  const response = await fetch(`${API_URL}/api/ops/blog/images`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  })
  if (!response.ok) await handleApiError(response)
  const json = await response.json()
  const data = json.data ?? json
  const url = data.uploaded?.[0]?.url
  if (!url) throw new ApiError('La subida no devolvió una URL', 500)
  return url
}

/**
 * Slug from a title: lowercase, accents stripped, non-alphanumerics collapsed
 * to single hyphens.
 *
 * Mirrors what the API does when a routine omits one, so a post created here
 * and one created by the daily routine end up with the same address for the
 * same headline. Editable in the form regardless — the slug is the public URL
 * and is not editable after creation.
 */
export function slugFromTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// ============================================
// Events
// ============================================

export interface EventInput {
  title?: string
  slug?: string
  description?: string
  /** RFC 3339, or YYYY-MM-DD for all-day. */
  startsAt?: string
  /** "" clears it. */
  endsAt?: string
  allDay?: boolean
  location?: string
  city?: string
  url?: string
  coverImage?: string
  tags?: string[]
  /** The linked blog post's slug; "" unlinks. */
  blogPostSlug?: string
  status?: 'draft' | 'published'
  /** RFC 3339: a draft goes on the calendar by itself then. "" cancels. */
  scheduledAt?: string
  /** The full schedule, replacing the current one; [] removes it. */
  sessions?: { startsAt: string; endsAt?: string; label?: string; location?: string }[]
}

export interface AdminEventRow {
  event: SiteEvent
  /** Set even while the linked post is a draft. */
  blogPostSlug?: string
}

export async function fetchEventsAdmin(status: 'all' | 'draft' | 'published' | 'scheduled' = 'all'): Promise<AdminEventRow[]> {
  const response = await opsFetch(`/events?status=${status}`)
  const body: { data: AdminEventRow[] } = await response.json()
  return body.data
}

export async function createEvent(input: EventInput): Promise<SiteEvent> {
  const response = await opsFetch('/events', { method: 'POST', body: JSON.stringify(input) })
  await refreshEditorial()
  return (await response.json()).data
}

export async function updateEvent(id: string, input: EventInput): Promise<SiteEvent> {
  const response = await opsFetch(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
  await refreshEditorial()
  return (await response.json()).data
}

export async function deleteEvent(id: string): Promise<void> {
  await opsFetch(`/events/${id}`, { method: 'DELETE' })
  await refreshEditorial()
}

// ============================================
// Site settings
// ============================================

export interface AdminSiteSettings {
  tenantId: string
  name: string
  /** Opens every Instagram caption, without the "#". */
  hashtag: string
  /** Public origin: where cache revalidation and IndexNow point. */
  baseUrl: string
  /** The site's own Google OAuth client; "" falls back to the API's default. */
  googleClientId: string
  modules: ModuleName[]
  availableModules: ModuleName[]
  categories: CategoryOption[]
  /** Listings per category key, deleted ones aside. A used key cannot be removed. */
  categoryUsage: Record<string, number>
  listingDays: number
  storefrontListingsNeverExpire: boolean
  paidListings: boolean
}

export interface SiteSettingsInput {
  name?: string
  hashtag?: string
  /** Super admins only. */
  baseUrl?: string
  /** Super admins only. */
  googleClientId?: string
  modules?: ModuleName[]
  categories?: CategoryOption[]
  listingDays?: number
  storefrontListingsNeverExpire?: boolean
}

export async function fetchSiteSettings(): Promise<AdminSiteSettings> {
  const response = await opsFetch('/site')
  return (await response.json()).data
}

/** Saves, then expires the site's cached copy so pages pick it up at once. */
export async function updateSiteSettings(input: SiteSettingsInput): Promise<AdminSiteSettings> {
  const response = await opsFetch('/site', { method: 'PATCH', body: JSON.stringify(input) })
  const data = (await response.json()).data
  await refreshPublicContent(getStoredToken(), 'site')
  return data
}
