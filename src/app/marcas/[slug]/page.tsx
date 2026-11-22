import Link from 'next/link'
import AdSlot from '@/app/components/ads/AdSlot'

/** Models shown before the ad slot — one full row of the 3-column grid. */
const ABOVE_AD = 3
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { getAllVehicles } from '@/lib/data'
import { groupByBrand, cheapest } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'
import { absoluteUrl, SITE_URL } from '@/lib/site'
import VehicleList from '@/app/components/VehicleList'
import JsonLd from '@/app/components/JsonLd'
import { SITE_CONFIG } from '@/lib/tenant'

/**
 * One page per brand.
 *
 * Brand was a client-side filter and nothing else: `?brand=toyota` returned 200
 * with the home page's canonical and a generic title, and /marcas/toyota was a
 * 404. Nothing on the site could rank for "Toyota Uruguay precios" or "BYD
 * Uruguay fichas técnicas" — the head of the whole niche.
 */

type Params = Promise<{ slug: string }>

async function findBrand(slug: string) {
  const groups = groupByBrand(await getAllVehicles())
  return groups.find((g) => g.slug === slug)
}

export async function generateStaticParams() {
  // Sites without the catalogue 404 these routes in middleware; don't build them.
  if (!SITE_CONFIG.features.catalog) return []
  const groups = groupByBrand(await getAllVehicles())
  return groups.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const brand = await findBrand(slug)
  if (!brand) return { title: 'Marca no encontrada' }

  const entry = cheapest(brand.vehicles)
  const from = entry?.price ? ` Desde ${formatPrice(entry.currency, entry.price)}.` : ''

  return {
    title: `${brand.name} Uruguay ${new Date().getFullYear()} | Precios y fichas técnicas`,
    description:
      `${brand.vehicles.length} modelos de ${brand.name} en Uruguay con precios y fichas técnicas.${from}`.slice(0, 155),
    openGraph: {
      title: `${brand.name} en Uruguay — precios y fichas técnicas`,
      description: `Todos los ${brand.name} disponibles en Uruguay con especificaciones y precios de referencia.`,
      type: 'website',
      url: absoluteUrl(`/marcas/${brand.slug}`),
    },
    alternates: { canonical: `/marcas/${brand.slug}` },
  }
}

export default async function BrandPage({ params }: { params: Params }) {
  const { slug } = await params
  const brand = await findBrand(slug)
  if (!brand) notFound()

  const entry = cheapest(brand.vehicles)

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${brand.name} en Uruguay`,
    description: `Modelos de ${brand.name} disponibles en Uruguay con precios y fichas técnicas.`,
    url: absoluteUrl(`/marcas/${brand.slug}`),
    inLanguage: 'es-UY',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: brand.vehicles.length,
      itemListElement: brand.vehicles.map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absoluteUrl(`/vehiculo/${v.slug}`),
        name: `${v.brand} ${v.model} ${v.year}`,
      })),
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Marcas', item: absoluteUrl('/marcas') },
      { '@type': 'ListItem', position: 3, name: brand.name },
    ],
  }

  return (
    <div className="iv" style={{ paddingBottom: 24 }}>
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="iv__crumb">
        <Link href="/">Inicio</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <Link href="/marcas">Marcas</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span style={{ color: 'var(--text-strong)' }}>{brand.name}</span>
      </div>

      <h1 className="iv__title">{brand.name} en Uruguay — precios y fichas técnicas</h1>
      <p className="iv__count">
        {brand.vehicles.length} {brand.vehicles.length === 1 ? 'modelo' : 'modelos'}
        {entry?.price && ` · desde ${formatPrice(entry.currency, entry.price)}`}
      </p>

      {/* The full catalogue for the brand, server-rendered and unpaginated: no
          brand is large enough to need paging, and every vehicle page gains an
          internal link from a page that is about exactly its brand. */}
      <div style={{ marginTop: 24 }}>
        <VehicleList vehicles={brand.vehicles.slice(0, ABOVE_AD)} />
      </div>

      {/* Below the first row rather than straight under the headline.
          Immediately after the h1 is worth more to the advertiser, but it puts
          an ad between "Chery en Uruguay" and the first Chery — which is how a
          catalogue starts reading like a classifieds portal. The brand of the
          page is the targeting signal; no profile of the visitor is involved. */}
      <AdSlot placement="brand_top" targeting={{ brand: brand.name }} />

      {brand.vehicles.length > ABOVE_AD && (
        <div style={{ marginTop: 24 }}>
          <VehicleList vehicles={brand.vehicles.slice(ABOVE_AD)} />
        </div>
      )}
    </div>
  )
}
