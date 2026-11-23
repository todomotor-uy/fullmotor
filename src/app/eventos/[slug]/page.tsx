import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CalendarDays, CalendarPlus, ExternalLink, MapPin, Newspaper } from 'lucide-react'
import { eventWhen, fetchEventBySlug, googleCalendarUrl, dayKey } from '@/lib/events'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { blogTagsHref } from '@/lib/blog-tags'
import JsonLd from '../../components/JsonLd'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await fetchEventBySlug(slug).catch(() => null)
  if (!event) return { title: 'Evento no encontrado' }
  const description = event.description?.slice(0, 160) || `${eventWhen(event)}${event.city ? ` · ${event.city}` : ''}`
  return {
    title: event.title,
    description,
    openGraph: {
      title: `${event.title} | ${SITE_NAME}`,
      description,
      type: 'website',
      url: absoluteUrl(`/eventos/${slug}`),
      images: event.coverImage ? [event.coverImage] : undefined,
    },
    alternates: { canonical: `/eventos/${slug}` },
  }
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params
  const event = await fetchEventBySlug(slug).catch(() => null)
  if (!event) notFound()

  const pageUrl = absoluteUrl(`/eventos/${slug}`)
  const place = [event.location, event.city].filter(Boolean).join(', ')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.allDay ? dayKey(event.startsAt, true) : event.startsAt,
    ...(event.endsAt ? { endDate: event.allDay ? dayKey(event.endsAt, true) : event.endsAt } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    ...(place ? { location: { '@type': 'Place', name: place, address: event.city ?? place } } : {}),
    ...(event.description ? { description: event.description } : {}),
    ...(event.coverImage ? { image: [event.coverImage] } : {}),
    url: pageUrl,
  }

  return (
    <article className="ev ev--detail">
      <JsonLd data={jsonLd} />
      <nav className="iv__crumb mb-3">
        <Link href="/eventos">Eventos</Link>
        <span>/</span>
        <span>{event.title}</span>
      </nav>

      {event.coverImage && (
        <div className="ev-detail__cover">
          <Image src={event.coverImage} alt="" fill sizes="(max-width: 900px) 100vw, 860px" style={{ objectFit: 'cover' }} />
        </div>
      )}

      <h1 className="bl__title" style={{ marginTop: 8 }}>{event.title}</h1>

      <div className="ev-detail__facts">
        <p><CalendarDays size={18} aria-hidden="true" /> {eventWhen(event)}</p>
        {place && <p><MapPin size={18} aria-hidden="true" /> {place}</p>}
      </div>

      <div className="flex flex-wrap gap-2" style={{ margin: '16px 0 24px' }}>
        <a href={googleCalendarUrl(event, pageUrl)} target="_blank" rel="noopener noreferrer" className="tm-btn">
          <CalendarPlus size={16} aria-hidden="true" /> Agregar a mi calendario
        </a>
        {event.url && (
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="tm-btn tm-btn--secondary">
            <ExternalLink size={16} aria-hidden="true" /> Sitio del evento
          </a>
        )}
      </div>

      {event.description && (
        <div className="ev-detail__desc">
          {event.description.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {event.blogPost && (
        <Link href={`/blog/${event.blogPost.slug}`} className="ev-detail__post">
          <Newspaper size={20} aria-hidden="true" />
          <span>
            <span className="tm-eyebrow">En Novedades</span>
            <strong>{event.blogPost.title}</strong>
          </span>
        </Link>
      )}

      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-hairline">
          {event.tags.map((t) => (
            <Link key={t} href={blogTagsHref([t])} className="tm-chip">
              #{t}
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
