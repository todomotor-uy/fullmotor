import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Metadata } from 'next'
import { Clock, Globe, MapPin, Phone } from 'lucide-react'
import { fetchDealershipBySlug, getAllDealerships } from '@/lib/dealerships-api'
import { fetchClassifieds } from '@/lib/classifieds-api'
import { absoluteUrl, SITE_URL } from '@/lib/site'
import JsonLd from '../../components/JsonLd'
import ClassifiedList from '../../components/ClassifiedList'
import { Avatar } from '../../components/ui/Avatar'
import DealershipInventory from './DealershipInventory'

interface PageProps {
  params: Promise<{ slug: string }>
}

const getDealership = cache(fetchDealershipBySlug)

export async function generateStaticParams() {
  const dealerships = await getAllDealerships()
  return dealerships.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const dealership = await getDealership(slug)
  if (!dealership) return { title: 'Comercio no encontrado' }

  const title = `${dealership.name}${dealership.city ? ` — ${dealership.city}` : ''}`
  const description =
    dealership.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Vehículos en venta de ${dealership.name}${dealership.city ? ` en ${dealership.city}` : ''}.`

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', url: absoluteUrl(`/comercios/${slug}`) },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `/comercios/${slug}` },
  }
}

export default async function DealershipPage({ params }: PageProps) {
  const { slug } = await params
  const dealership = await getDealership(slug)
  // A suspended or rejected storefront stops resolving, so it 404s rather than
  // rendering an empty shell that still carries the business name.
  if (!dealership) notFound()

  // Page one, unfiltered, rendered server-side so crawlers see real stock. Any
  // filtering after that is handled by the client component below.
  const initial = await fetchClassifieds({
    dealership: slug,
    limit: 12,
    revalidate: 300,
  }).catch(() => ({ data: [], meta: { total: 0, page: 1, lastPage: 1 } }))

  const contactPoints = [
    dealership.address && { icon: MapPin, text: dealership.address },
    dealership.phone && { icon: Phone, text: dealership.phone },
    dealership.hours && { icon: Clock, text: dealership.hours },
    dealership.website && { icon: Globe, text: dealership.website },
  ].filter((c): c is { icon: typeof MapPin; text: string } => Boolean(c))

  // AutoDealer only when there is a physical address: Google flags a
  // LocalBusiness without address and telephone, and address is optional here,
  // so emitting it unconditionally would generate Search Console errors in
  // proportion to how many storefronts exist.
  const hasStorefrontAddress = Boolean(dealership.address && dealership.phone)
  const businessJsonLd = {
    '@context': 'https://schema.org',
    '@type': hasStorefrontAddress ? 'AutoDealer' : 'Organization',
    name: dealership.name,
    url: absoluteUrl(`/comercios/${slug}`),
    ...(dealership.description && { description: dealership.description }),
    ...(dealership.logoUrl && { logo: dealership.logoUrl }),
    ...(dealership.phone && { telephone: dealership.phone }),
    ...(hasStorefrontAddress && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: dealership.address,
        addressLocality: dealership.city ?? undefined,
        addressCountry: dealership.countryCode.toUpperCase(),
      },
    }),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Comercios', item: absoluteUrl('/comercios') },
      { '@type': 'ListItem', position: 3, name: dealership.name },
    ],
  }

  return (
    <div className="iv pb-16">
      <JsonLd data={businessJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <nav className="iv__crumb mb-4">
        <Link href="/comercios">Comercios</Link>
        <span>/</span>
        <span>{dealership.name}</span>
      </nav>

      <header className="bg-surface border border-line rounded-[var(--radius-lg)] p-6 mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={dealership.logoUrl} name={dealership.name} size="lg" tone="accent-soft" />
          <div className="flex-1 min-w-0">
            <h1
              className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight"
              style={{ letterSpacing: '-0.025em' }}
            >
              {dealership.name}
            </h1>
            {dealership.city && (
              <p className="text-sm text-muted mt-1 inline-flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" />
                {dealership.city}
              </p>
            )}
            {dealership.description && (
              <p className="text-sm text-body mt-3 whitespace-pre-wrap">{dealership.description}</p>
            )}
          </div>
        </div>

        {contactPoints.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-line">
            {contactPoints.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2 text-sm text-body">
                <Icon size={14} className="flex-shrink-0 mt-0.5 text-muted" aria-hidden="true" />
                <span className="break-words">{text}</span>
              </div>
            ))}
          </dl>
        )}
      </header>

      {/* Server-rendered so the inventory is in the HTML; the client component
          takes over the moment anyone filters or pages. */}
      <DealershipInventory
        slug={slug}
        initial={initial}
        fallback={
          <ClassifiedList
            classifieds={initial.data}
            emptyTitle="Todavía no hay vehículos publicados"
            emptyDescription="Este comercio no tiene avisos activos por ahora."
          />
        }
      />
    </div>
  )
}
