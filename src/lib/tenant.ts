/**
 * Which site this build is.
 *
 * One repo, one Vercel project per site. Each project sets NEXT_PUBLIC_TENANT
 * (todomotor-uy, nauti-uy, ...) and everything brand-specific — name, nav,
 * enabled sections, home page, colours — is read from here.
 *
 * TodoMotor's production project does not set the variable, and must not
 * start sending X-Tenant until its API accepts that header in CORS: a browser
 * preflight against the current API would fail and take every client-side
 * call down with it. So the header is only sent when the tenant is explicit.
 */

export type TenantId = 'todomotor-uy' | 'nauti-uy'

const RAW_TENANT = process.env.NEXT_PUBLIC_TENANT?.trim() || ''

export const TENANT_ID: TenantId = RAW_TENANT === 'nauti-uy' ? 'nauti-uy' : 'todomotor-uy'

/** Headers that tell the API which site a request belongs to. */
export function tenantHeader(): Record<string, string> {
  return RAW_TENANT ? { 'X-Tenant': RAW_TENANT } : {}
}

export interface NavLink {
  href: string
  label: string
}

export interface SiteFeatures {
  /** Vehicle catalogue: /vehiculos, /vehiculo/*, /marcas, search. */
  catalog: boolean
  guide: boolean
  compare: boolean
  saved: boolean
  dealerships: boolean
  ads: boolean
  /** The events calendar at /eventos. */
  events: boolean
}

export interface SiteConfig {
  id: TenantId
  brand: 'todomotor' | 'nauti'
  name: string
  /** The brand on its own, for running text ("con vidriera en TodoMotor"). */
  shortName: string
  /** Used in `<title>` templates and Open Graph. */
  title: string
  description: string
  keywords: string
  defaultUrl: string
  contactEmail: string
  /** Logo text split in two so the second half can take the accent colour. */
  logo: [string, string]
  nav: NavLink[]
  features: SiteFeatures
  /** What the site calls a business account. Running text (BIZ) treats it as masculine: "un comercio". */
  dealershipLabel: { plural: string; singular: string }
  rssTitle: string
}

const TODOMOTOR: SiteConfig = {
  id: 'todomotor-uy',
  brand: 'todomotor',
  name: 'TodoMotor Uruguay',
  shortName: 'TodoMotor',
  title: 'TodoMotor Uruguay | Fichas Técnicas de Vehículos',
  description:
    'Encontrá las fichas técnicas completas de autos, SUVs, camionetas y motos disponibles en Uruguay. Especificaciones, precios y equipamiento.',
  keywords: 'autos uruguay, motos uruguay, fichas técnicas, precios autos, suvs, camionetas',
  defaultUrl: 'https://todomotor.uy',
  contactEmail: 'contacto@todomotor.uy',
  logo: ['todo', 'motor'],
  nav: [
    { href: '/vehiculos', label: 'Vehículos' },
    { href: '/guia-de-compra', label: 'Guía de compra' },
    { href: '/clasificados', label: 'Clasificados' },
    { href: '/comercios', label: 'Comercios' },
    { href: '/blog', label: 'Blog' },
  ],
  features: { catalog: true, guide: true, compare: true, saved: true, dealerships: true, ads: true, events: false },
  dealershipLabel: { plural: 'Comercios', singular: 'Comercio' },
  rssTitle: 'Noticias del Motor — TodoMotor Uruguay',
}

const NAUTI: SiteConfig = {
  id: 'nauti-uy',
  brand: 'nauti',
  name: 'Cardinal Sur',
  shortName: 'Cardinal Sur',
  title: 'Cardinal Sur | Náutica en Uruguay: clasificados y noticias',
  description:
    'Comprá y vendé lanchas, veleros, motos de agua y equipamiento en Uruguay. Noticias, guías y todo sobre la náutica uruguaya.',
  keywords: 'lanchas uruguay, veleros en venta, motos de agua, náutica uruguay, clasificados náuticos',
  defaultUrl: 'https://cardinalsur.uy',
  contactEmail: 'contacto@cardinalsur.uy',
  logo: ['cardinal', 'sur'],
  nav: [
    // The blog is called Novedades on Cardinal Sur, for now; the URL stays /blog.
    { href: '/blog', label: 'Novedades' },
    { href: '/eventos', label: 'Eventos' },
    { href: '/clasificados', label: 'Clasificados' },
    { href: '/comercios', label: 'Comercios' },
  ],
  features: { catalog: false, guide: false, compare: false, saved: false, dealerships: true, ads: false, events: true },
  dealershipLabel: { plural: 'Comercios', singular: 'Comercio' },
  rssTitle: 'Noticias náuticas — Cardinal Sur',
}

export const SITE_CONFIG: SiteConfig = TENANT_ID === 'nauti-uy' ? NAUTI : TODOMOTOR

export const IS_NAUTI = SITE_CONFIG.brand === 'nauti'

/** What this site calls a business account, ready for running text. */
export const BIZ = {
  one: SITE_CONFIG.dealershipLabel.singular.toLowerCase(),
  many: SITE_CONFIG.dealershipLabel.plural.toLowerCase(),
  One: SITE_CONFIG.dealershipLabel.singular,
  Many: SITE_CONFIG.dealershipLabel.plural,
}
