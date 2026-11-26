
/**
 * A listing category's key. Each site configures its own list (GET
 * /api/meta/tenant, edited in /admin/sitio); see lib/site-settings.ts.
 */
export type ClassifiedCategory = string

/**
 * Still returned by the API, but monetization is switched off: every listing is
 * `free` and lasts 30 days. Kept so the response type stays honest, and because
 * paid tiers are expected back later.
 */
export type ClassifiedTier = 'free' | 'premium' | 'featured'

export type ClassifiedStatus = 'active' | 'sold' | 'paused'

/** The seller badge. Only present when the account is an approved business. */
export interface ClassifiedDealership {
  slug: string
  name: string
  logoUrl?: string | null
}

export interface ClassifiedUser {
  id: string
  name: string
  avatarUrl?: string | null
  dealership?: ClassifiedDealership
}

export type DealershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

/** The signed-in user's own business account, as returned by /auth/me. */
export interface Dealership {
  id: string
  slug: string
  name: string
  description?: string | null
  city?: string | null
  address?: string | null
  department?: string | null
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  whatsapp?: string | null
  website?: string | null
  hours?: string | null
  logoUrl?: string | null
  /** The storefront page's banner. */
  coverImage?: string | null
  /** The page's Markdown; only on the owner's own account. */
  pageMarkdown?: string | null
  /** The page, rendered and sanitized by the API. */
  pageHtml?: string | null
  countryCode: string
  status: DealershipStatus
  /** What the applicant is shown when turned down. Never the internal note. */
  rejectionReason?: string | null
  createdAt: string
}

export interface Classified {
  id: string
  userId: string
  user: ClassifiedUser
  countryCode: string
  city: string
  department?: string | null
  /** Optional map pin; both or neither. */
  latitude?: number | null
  longitude?: number | null
  title: string
  description: string
  category: ClassifiedCategory
  price: number
  currency: string
  /** "A convenir": no price to show (price is 0). */
  priceOnRequest?: boolean
  contactInfo: string | null
  showContactInfo: boolean
  images: string[]
  tier: ClassifiedTier
  status: ClassifiedStatus
  expiresAt: string
  /**
   * Derived by the API. Never compare expiresAt against a magic date here —
   * dealership listings carry a far-future sentinel and only the backend knows
   * what it is.
   */
  neverExpires?: boolean
  /** How many photos this listing's owner may upload. */
  maxImages?: number
  /**
   * Structured vehicle details. Absent on repuestos and accesorios, and on any
   * listing published before these fields existed — hence optional rather than
   * nullable, so `mileageKm: 0` (a new vehicle) stays distinguishable from
   * "not stated".
   */
  year?: number
  mileageKm?: number
  brand?: string
  model?: string
  fuelType?: string
  transmission?: string
  createdAt: string
  updatedAt: string
}

export interface BrandOption {
  value: string
  label: string
}

/** Closed sets the API owns, fetched from /api/classifieds/facets. */
export interface ClassifiedFacets {
  brands: BrandOption[]
  fuelTypes: string[]
  transmissions: string[]
}

/**
 * Fuel and transmission labels live here rather than on the API: the values are
 * language-independent but the labels are not, and the API serves more than one
 * country.
 */
export const fuelTypeLabels: Record<string, string> = {
  gasoline: 'Nafta',
  diesel: 'Diésel',
  hybrid: 'Híbrido',
  electric: 'Eléctrico',
  cng: 'GNC',
  flex: 'Flex',
}

export const transmissionLabels: Record<string, string> = {
  manual: 'Manual',
  automatic: 'Automática',
}

export interface PaginatedClassifieds {
  data: Classified[]
  meta: {
    total: number
    page: number
    lastPage: number
  }
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Comment {
  id: string
  resourceId: string
  userId: string
  user: ClassifiedUser
  body: string
  createdAt: string
}

export const statusLabels: Record<ClassifiedStatus, string> = {
  active: 'Activa',
  sold: 'Vendida',
  paused: 'Pausada',
}

/**
 * How close to expiry a listing has to be before it can be renewed. Mirrors the
 * window the API enforces; kept in sync by hand.
 */
export const RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

type Expiry = Pick<Classified, 'expiresAt'> & { neverExpires?: boolean }

export function isExpired(classified: Expiry, now = Date.now()): boolean {
  if (classified.neverExpires) return false
  return new Date(classified.expiresAt).getTime() < now
}

/**
 * A dealership listing never expires, so it is never renewable — which is what
 * removes the renew button for them without anything here knowing what the
 * backend's sentinel date is.
 */
export function isRenewable(classified: Expiry, now = Date.now()): boolean {
  if (classified.neverExpires) return false
  return new Date(classified.expiresAt).getTime() - now <= RENEW_WINDOW_MS
}

export const MAX_CLASSIFIED_IMAGES = 5
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
