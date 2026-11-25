/**
 * What this site runs, as configured in the API (the tenant row) and edited
 * from /admin/sitio: its modules and its listing categories.
 *
 * Safe to import anywhere. The server-side fetch is in site-settings.server.ts;
 * client components read the same object from SiteSettingsProvider.
 *
 * FALLBACK_SETTINGS reproduces what the static site config said before the
 * API owned this, and is used whenever the API is unreachable or predates
 * modules — so a deploy order mistake degrades to the old behaviour, never to
 * a site with nothing switched on.
 */
import { IS_NAUTI, SITE_CONFIG, type NavLink } from '@/lib/tenant'

export type ModuleName = 'news' | 'events' | 'classifieds' | 'storefronts' | 'catalog' | 'ads'

export const MODULES: { id: ModuleName; label: string; description: string }[] = [
  { id: 'news', label: 'Novedades', description: 'Notas, etiquetas y RSS.' },
  { id: 'events', label: 'Eventos', description: 'El calendario en /eventos.' },
  { id: 'classifieds', label: 'Clasificados', description: 'Avisos de los usuarios, con renovación.' },
  { id: 'storefronts', label: 'Comercios', description: 'Cuentas de negocio con su propia página.' },
  { id: 'catalog', label: 'Catálogo de vehículos', description: 'Fichas, marcas, comparador, guía de compra y búsqueda.' },
  { id: 'ads', label: 'Publicidad', description: 'Espacios de anuncios del sistema de publicidad.' },
]

export interface CategoryOption {
  key: string
  label: string
  neverExpires?: boolean
  vehicleFields?: boolean
}

export interface SiteSettings {
  modules: ModuleName[]
  categories: CategoryOption[]
}

const AUTOMOTIVE_CATEGORIES: CategoryOption[] = [
  { key: 'cars', label: 'Autos', vehicleFields: true },
  { key: 'motorcycles', label: 'Motos', vehicleFields: true },
  { key: 'trucks', label: 'Camionetas', vehicleFields: true },
  { key: 'parts', label: 'Repuestos' },
  { key: 'accessories', label: 'Accesorios' },
  { key: 'other', label: 'Otros' },
]

const NAUTICAL_CATEGORIES: CategoryOption[] = [
  { key: 'motorboats', label: 'Lanchas y cruceros' },
  { key: 'sailboats', label: 'Veleros' },
  { key: 'jetskis', label: 'Motos de agua' },
  { key: 'small_craft', label: 'Kayaks, SUP y botes' },
  { key: 'engines', label: 'Motores' },
  { key: 'trailers', label: 'Trailers' },
  { key: 'equipment', label: 'Equipamiento' },
  { key: 'moorings', label: 'Amarres y guarderías' },
  { key: 'services', label: 'Servicios', neverExpires: true },
  { key: 'other', label: 'Otros' },
]

function fallbackModules(): ModuleName[] {
  const f = SITE_CONFIG.features
  const m: ModuleName[] = ['news']
  if (f.events) m.push('events')
  m.push('classifieds')
  if (f.dealerships) m.push('storefronts')
  if (f.catalog) m.push('catalog')
  if (f.ads) m.push('ads')
  return m
}

export const FALLBACK_SETTINGS: SiteSettings = {
  modules: fallbackModules(),
  categories: IS_NAUTI ? NAUTICAL_CATEGORIES : AUTOMOTIVE_CATEGORIES,
}

const isModule = (v: unknown): v is ModuleName => MODULES.some((m) => m.id === v)

/** Reads the tenant JSON from GET /api/meta/tenant, falling back field by field. */
export function settingsFromTenant(tenant: unknown): SiteSettings {
  const t = (tenant ?? {}) as { modules?: unknown; categories?: unknown }
  const modules = Array.isArray(t.modules) ? t.modules.filter(isModule) : null
  const categories = Array.isArray(t.categories)
    ? (t.categories as CategoryOption[]).filter((c) => c && typeof c.key === 'string' && typeof c.label === 'string')
    : []
  return {
    modules: modules ?? FALLBACK_SETTINGS.modules,
    categories: categories.length > 0 ? categories : FALLBACK_SETTINGS.categories,
  }
}

export function hasModule(settings: SiteSettings, module: ModuleName): boolean {
  return settings.modules.includes(module)
}

/** The module each nav destination belongs to. Anything else is always shown. */
const NAV_MODULE: Record<string, ModuleName> = {
  '/vehiculos': 'catalog',
  '/guia-de-compra': 'catalog',
  '/compare': 'catalog',
  '/blog': 'news',
  '/eventos': 'events',
  '/clasificados': 'classifieds',
  '/comercios': 'storefronts',
}

/** The site's menu, without the sections whose module is off. */
export function siteNav(settings: SiteSettings): NavLink[] {
  return SITE_CONFIG.nav.filter((l) => {
    const m = NAV_MODULE[l.href]
    return !m || hasModule(settings, m)
  })
}

export function categoryLabel(settings: SiteSettings, key: string): string {
  return settings.categories.find((c) => c.key === key)?.label ?? key
}

export function isCategory(settings: SiteSettings, value: string | undefined): value is string {
  return !!value && settings.categories.some((c) => c.key === value)
}

export function categoryHasVehicleFields(settings: SiteSettings, key: string): boolean {
  return !!settings.categories.find((c) => c.key === key)?.vehicleFields
}
