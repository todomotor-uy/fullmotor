import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { getAllVehicles } from '@/lib/data'
import { groupByBrand, cheapest } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'
import { SITE_URL } from '@/lib/site'
import JsonLd from '@/app/components/JsonLd'

/** The index that makes every /marcas/[slug] page reachable by a crawler. */

export const metadata: Metadata = {
  title: 'Marcas de vehículos en Uruguay | Precios y fichas técnicas',
  description:
    'Todas las marcas de autos, SUVs, camionetas, motos y utilitarios disponibles en Uruguay, con precios y fichas técnicas por modelo.',
  alternates: { canonical: '/marcas' },
}

export default async function BrandsIndexPage() {
  const brands = groupByBrand(await getAllVehicles())

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Marcas' },
    ],
  }

  return (
    <div className="iv" style={{ paddingBottom: 24 }}>
      <JsonLd data={breadcrumbJsonLd} />

      <div className="iv__crumb">
        <Link href="/">Inicio</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span style={{ color: 'var(--text-strong)' }}>Marcas</span>
      </div>

      <h1 className="iv__title">Marcas en Uruguay</h1>
      <p className="iv__count">{brands.length} marcas con fichas técnicas y precios</p>

      <ul className="mk__grid">
        {brands.map((brand) => {
          const entry = cheapest(brand.vehicles)
          return (
            <li key={brand.slug}>
              <Link href={`/marcas/${brand.slug}`} className="mk__card">
                <span className="mk__name">{brand.name}</span>
                <span className="mk__meta">
                  {brand.vehicles.length} {brand.vehicles.length === 1 ? 'modelo' : 'modelos'}
                  {entry?.price && ` · desde ${formatPrice(entry.currency, entry.price)}`}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const revalidate = 3600
