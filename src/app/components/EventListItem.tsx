import Link from 'next/link'
import { CalendarDays, MapPin, Newspaper } from 'lucide-react'
import type { SiteEvent } from '@/types/event'
import { dayKey, eventWhen } from '@/lib/events'

const monthShort = new Intl.DateTimeFormat('es-UY', { month: 'short', timeZone: 'UTC' })

/** One event as a row: a date badge, what, when, where. */
export default function EventListItem({ event }: { event: SiteEvent }) {
  const day = dayKey(event.startsAt, event.allDay)
  const date = new Date(`${day}T00:00:00Z`)
  return (
    <Link href={`/eventos/${event.slug}`} className="ev-item">
      <div className="ev-item__date" aria-hidden="true">
        <span className="ev-item__day">{date.getUTCDate()}</span>
        <span className="ev-item__mon">{monthShort.format(date).replace('.', '')}</span>
      </div>
      <div className="ev-item__body">
        <h3 className="ev-item__title">{event.title}</h3>
        <p className="ev-item__meta">
          <CalendarDays size={14} aria-hidden="true" /> {eventWhen(event)}
        </p>
        {(event.location || event.city) && (
          <p className="ev-item__meta">
            <MapPin size={14} aria-hidden="true" /> {[event.location, event.city].filter(Boolean).join(', ')}
          </p>
        )}
        {(event.tags.length > 0 || event.blogPost) && (
          <div className="ev-item__tags">
            {event.tags.slice(0, 3).map((t) => (
              <span key={t} className="bl__tag">{t}</span>
            ))}
            {event.blogPost && (
              <span className="ev-item__post">
                <Newspaper size={13} aria-hidden="true" /> Con nota
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
