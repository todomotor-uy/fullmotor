import { Vehicle, Category, PriceHistoryEntry } from '@/types/vehicle'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'

const getHeaders = (vehicleType: string = 'all') => ({
    'X-Country': COUNTRY || 'uy',
    'X-Vehicle-Type': vehicleType || 'all',
    'User-Agent': 'Mozilla/5.0 (compatible; TodoMotor-WebApp/1.0; +https://todomotor.uy)',
    'X-Api-Secret': process.env.API_SECRET_KEY || '',
})

// ============================================
// Category & Fuel Type Mapping (Backend ↔ Frontend)
// ============================================

// Maps backend vehicleType to frontend category
const vehicleTypeToCategory: Record<string, Category> = {
    'cars': 'autos',
    'suvs': 'suvs',
    'pickups': 'pickups',
    'motorcycles': 'motos',
    'commercial': 'utilitarios',
}

// Maps frontend category to backend vehicleType (for headers and filters)
const categoryToVehicleType: Partial<Record<Category, string>> = {
    'autos': 'cars',
    'suvs': 'suvs',
    'pickups': 'pickups',
    'motos': 'motorcycles',
    'utilitarios': 'commercial',
}

const fuelTypeToFrontend: Record<string, string> = {
    'gasoline': 'nafta',
    'diesel': 'diesel',
    'hybrid': 'híbrido',
    'mild-hybrid': 'mild-hybrid',
    'electric': 'eléctrico',
}

// ============================================
// Response Types
// ============================================

interface ApiVehicle {
    id: string
    slug: string
    brand: string
    model: string
    year: number
    version?: string
    modelFamilyId?: string
    countryCode: string
    vehicleType: string
    vehicleSubtype: string[] | null
    subcategory?: string
    currency: string
    price: number
    // priceUYU?: number // Removed
    // priceUSD?: number // Removed
    engineCc?: number
    engineHp?: number
    engineTorque?: number
    fuelType?: string
    transmission?: string
    gears?: number
    length?: number
    width?: number
    height?: number
    wheelbase?: number
    trunkCapacity?: number
    fuelTank?: number
    weight?: number
    autonomyKm?: number
    batteryKwh?: number
    safetyFeatures?: string[]
    equipment?: string[]
    images?: string[]
    description?: string
    relatedVersions?: { slug: string; version: string; price: number; currency: string }[]
    publishedAt?: string
    createdAt?: string
    updatedAt?: string
    priceHistory?: PriceHistoryEntry[]
}

interface VehiclesResponse {
    data: ApiVehicle[]
    meta: {
        total: number
        page: number
        lastPage: number
    }
}

interface FiltersResponse {
    brands: { name: string; count: number }[]
    subtypes: Array<{
        id: string
        vehicleType: string
        name: string
        slug: string
        icon?: string
        orderPosition?: number
        active?: boolean
        createdAt?: string
        updatedAt?: string
    }>
    priceRange: { min: number; max: number }
    currency: string
}

interface CarouselItem {
    id: string
    title: string
    imageUrl: string
    linkUrl: string
    slug?: string
    brand?: string
    model?: string
    version?: string
    price: number
    currency: string
    year: number
    vehicleType: string
    countryCode: string
    publishedAt?: string
    createdAt?: string
    engineHp?: number
    fuelType?: string
}

interface CarouselResponse {
    data: CarouselItem[]
}

// ============================================
// Transform API Response to Frontend Types
// ============================================

function transformVehicle(apiVehicle: ApiVehicle): Vehicle {
    return {
        id: apiVehicle.id,
        slug: apiVehicle.slug,
        countryCode: apiVehicle.countryCode,
        vehicleType: apiVehicle.vehicleType,
        vehicleSubtype: apiVehicle.vehicleSubtype,
        brand: apiVehicle.brand,
        model: apiVehicle.model,
        year: apiVehicle.year,
        version: apiVehicle.version,
        modelFamilyId: apiVehicle.modelFamilyId,
        relatedVersions: apiVehicle.relatedVersions,
        category: vehicleTypeToCategory[apiVehicle.vehicleType] || 'autos', // Direct mapping: vehicleType → category
        subcategory: apiVehicle.subcategory,
        currency: apiVehicle.currency,
        price: apiVehicle.price,
        engineCc: apiVehicle.engineCc,
        engineHp: apiVehicle.engineHp,
        engineTorque: apiVehicle.engineTorque,
        fuelType: apiVehicle.fuelType ? fuelTypeToFrontend[apiVehicle.fuelType] || apiVehicle.fuelType : undefined,
        transmission: apiVehicle.transmission,
        gears: apiVehicle.gears,
        length: apiVehicle.length,
        width: apiVehicle.width,
        height: apiVehicle.height,
        wheelbase: apiVehicle.wheelbase,
        trunkCapacity: apiVehicle.trunkCapacity,
        fuelTank: apiVehicle.fuelTank,
        weight: apiVehicle.weight,
        autonomyKm: apiVehicle.autonomyKm,
        batteryKwh: apiVehicle.batteryKwh,
        safetyFeatures: apiVehicle.safetyFeatures || [],
        equipment: apiVehicle.equipment || [],
        image: apiVehicle.images?.[0],
        images: apiVehicle.images || [],
        description: apiVehicle.description,
        publishedAt: apiVehicle.publishedAt,
        createdAt: apiVehicle.createdAt,
        updatedAt: apiVehicle.updatedAt,
        priceHistory: apiVehicle.priceHistory ?? [],
    }
}

// ============================================
// API Functions
// ============================================

interface FetchVehiclesParams {
    page?: number
    limit?: number
    brand?: string
    category?: Category
    fuelType?: string
    minPrice?: number
    maxPrice?: number
    sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'power_asc' | 'power_desc' | 'value_asc' | 'value_desc'
    vehicleType?: string
    /**
     * Which retry this call is (1 = the first, untagged try).
     *
     * Retrying is otherwise pointless: same URL, same options, so Next answers
     * every attempt inside one render from the memoised first failure and the
     * API is never asked again — and `cache: 'no-store'` does not help, because
     * inside `unstable_cache` it is ignored. Tagging the request with a header
     * changes the cache key, which is what actually forces a fresh request.
     * The header itself is inert: servers ignore request headers they don't know.
     */
    retryAttempt?: number
}

export async function fetchVehicles(params: FetchVehiclesParams = {}): Promise<{ vehicles: Vehicle[]; meta: VehiclesResponse['meta'] }> {
    const searchParams = new URLSearchParams()

    if (params.page) searchParams.set('page', params.page.toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.brand) searchParams.set('brand', params.brand)
    if (params.fuelType) searchParams.set('fuel_type', params.fuelType)
    if (params.minPrice) searchParams.set('min_price', params.minPrice.toString())
    if (params.maxPrice) searchParams.set('max_price', params.maxPrice.toString())
    if (params.sort) searchParams.set('sort', params.sort)

    const url = `${API_URL}/api/vehicles${searchParams.toString() ? `?${searchParams}` : ''}`

    // Use category to set the X-Vehicle-Type header (backend uses vehicleType for filtering)
    const vehicleTypeHeader = params.category ? categoryToVehicleType[params.category] : params.vehicleType || 'all'

    const retry = params.retryAttempt && params.retryAttempt > 1 ? params.retryAttempt : undefined

    const response = await fetch(url, {
        ...(retry ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }),
        headers: {
            ...getHeaders(vehicleTypeHeader),
            ...(retry ? { 'X-Retry-Attempt': String(retry) } : {}),
        },
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch vehicles: ${response.statusText}`)
    }

    const data: VehiclesResponse = await response.json()

    return {
        vehicles: data.data.map(transformVehicle),
        meta: data.meta,
    }
}

export async function fetchVehicleBySlug(slug: string, vehicleType?: string): Promise<Vehicle | null> {
    const url = `${API_URL}/api/vehicles/${slug}`

    const response = await fetch(url, {
        next: { revalidate: 3600 },
        headers: getHeaders(vehicleType)
    })

    if (response.status === 404) {
        return null
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch vehicle: ${response.statusText}`)
    }

    // The detail endpoint now returns { data }, like every other endpoint.
    // The `?? body` fallback keeps this working against an API that has not
    // been deployed yet, so the two repos can ship independently.
    const body = await response.json()
    const apiVehicle: ApiVehicle = body?.data ?? body
    return transformVehicle(apiVehicle)
}

export async function fetchCarouselItems(category?: Category): Promise<Vehicle[]> {
    const searchParams = new URLSearchParams()

    if (category) {
        const vehicleType = categoryToVehicleType[category]
        if (vehicleType) searchParams.set('category', vehicleType)
    }

    const url = `${API_URL}/api/carousel${searchParams.toString() ? `?${searchParams}` : ''}`

    const response = await fetch(url, {
        next: { revalidate: 3600 },
        headers: getHeaders('all')
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch carousel: ${response.statusText}`)
    }

    const data: CarouselResponse = await response.json()
    return (data.data || []).map((item): Vehicle => {
        // Fallbacks parse slug/brand/model out of linkUrl/title for backends
        // that predate those fields in the carousel payload
        const slug = item.slug || item.linkUrl.split('/').pop() || item.id
        const [titleBrand = '', ...modelParts] = item.title.split(' ')
        return {
            id: item.id,
            slug,
            countryCode: item.countryCode,
            vehicleType: item.vehicleType,
            vehicleSubtype: null,
            brand: item.brand || titleBrand,
            model: item.model || modelParts.join(' '),
            version: item.version,
            year: item.year,
            category: vehicleTypeToCategory[item.vehicleType] || 'autos', // Use simple mapping
            currency: item.currency,
            price: item.price,
            image: item.imageUrl,
            images: [item.imageUrl],
            safetyFeatures: [],
            equipment: [],
            publishedAt: item.publishedAt,
            createdAt: item.createdAt,
            engineHp: item.engineHp,
            fuelType: item.fuelType ? fuelTypeToFrontend[item.fuelType] || item.fuelType : undefined,
        }
    })
}

export async function fetchFilters(vehicleType?: string): Promise<FiltersResponse> {
    const url = `${API_URL}/api/filters`

    const response = await fetch(url, {
        next: { revalidate: 300 },
        headers: getHeaders(vehicleType)
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch filters: ${response.statusText}`)
    }

    return response.json()
}

export async function searchVehicles(query: string, type: 'text' | 'semantic' = 'semantic', vehicleType?: string, limit?: number): Promise<Vehicle[]> {
    const searchParams = new URLSearchParams({ q: query, type })
    if (limit) searchParams.set('limit', String(limit))
    const url = `${API_URL}/api/search?${searchParams}`

    const response = await fetch(url, {
        // no-store because the only caller that passes a limit is the admin
        // picker, which has to see a vehicle that was edited seconds ago.
        cache: 'no-store',
        headers: getHeaders(vehicleType)
    })

    if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
    }

    const data = await response.json()
    return (data.data || []).map(transformVehicle)
}

// Export mappers for use in other modules (if needed elsewhere)
export { categoryToVehicleType, vehicleTypeToCategory, getHeaders }
