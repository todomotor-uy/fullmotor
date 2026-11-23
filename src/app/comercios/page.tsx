import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import { fetchDealerships } from '@/lib/dealerships-api'
import { absoluteUrl } from '@/lib/site'
import JsonLd from '../components/JsonLd'
import { Avatar } from '../components/ui/Avatar'
import { BIZ, IS_NAUTI, SITE_CONFIG } from '@/lib/tenant'
import { placeLabel } from '@/lib/location'

export const revalidate = 300

const TITLE = `${BIZ.Many} en Uruguay`
const DESCRIPTION =
  IS_NAUTI
    ? `Náuticas, brokers, guarderías y servicios con vidriera en ${SITE_CONFIG.name}. Mirá su inventario completo y contactalos directo.`
    : 'Concesionarias, automotoras y comercios con vidriera en TodoMotor. Mirá su inventario completo y contactalos directo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website', url: absoluteUrl('/comercios') },
  alternates: { canonical: '/comercios' },
}

export default async function DealershipsPage() {
  const data = await fetchDealerships({ limit: 50, revalidate: 300 }).catch(() => ({
    data: [],
    meta: { total: 0, page: 1, limit: 50, lastPage: 1 },
  }))

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: data.data.map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/comercios/${d.slug}`),
      name: d.name,
    })),
  }

  return (
    <div className="iv pb-16">
      {data.data.length > 0 && <JsonLd data={itemListJsonLd} />}

      <div className="mb-6">
        <h1 className="iv__title">{BIZ.Many}</h1>
        <p className="iv__count">
          <span className="font-mono">{data.meta.total}</span> con vidriera en {IS_NAUTI ? 'Nauti' : 'TodoMotor'}
        </p>
      </div>

      {data.data.length === 0 ? (
        <div className="iv__empty">
          <h3 className="font-display text-lg font-bold text-ink mb-2">Todavía no hay {BIZ.many}</h3>
          <p className="text-sm text-muted mb-6">
            Si tenés uno, registralo y publicá tu inventario con vidriera propia.
          </p>
          <Link href="/comercios/solicitar" className="tm-btn tm-btn--md">
            Registrá tu {BIZ.one}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((d) => (
            <Link
              key={d.id}
              href={`/comercios/${d.slug}`}
              className="bg-surface border border-line rounded-[var(--radius-lg)] p-5 flex items-start gap-3 hover:border-accent transition-colors"
            >
              <Avatar src={d.logoUrl} name={d.name} size="md" tone="accent-soft" />
              <div className="min-w-0">
                <h2 className="font-display font-bold text-ink truncate">{d.name}</h2>
                {(d.city || d.department) && (
                  <p className="text-sm text-muted inline-flex items-center gap-1.5 mt-0.5">
                    <MapPin size={12} aria-hidden="true" />
                    {placeLabel(d.city, d.department)}
                  </p>
                )}
                {d.description && (
                  <p className="text-sm text-muted mt-2 line-clamp-2">{d.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
