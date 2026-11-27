import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  calendarEntriesByDay,
  eventDays,
  fetchEvents,
  monthGrid,
  monthLabel,
  parseMonth,
  shiftMonth,
  todayKey,
} from '@/lib/events'
import { SITE_CONFIG } from '@/lib/tenant'
import type { SiteEvent } from '@/types/event'
import EventListItem from '@/app/components/EventListItem'

export const metadata: Metadata = {
  title: 'Eventos',
  description: `Calendario de regatas, salidas, cursos y eventos náuticos en Uruguay, en ${SITE_CONFIG.name}.`,
  alternates: { canonical: '/eventos' },
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface PageProps {
  searchParams: Promise<{ mes?: string }>
}

/**
 * The calendar: a month grid with each event on every day it covers, and
 * the month's events as a list underneath — the list is the main view on a
 * phone, where the grid only marks the days that have something on.
 */
export default async function EventsPage({ searchParams }: PageProps) {
  const month = parseMonth((await searchParams).mes)
  const grid = monthGrid(month)
  const today = todayKey()

  // The grid spans six weeks, so ask for exactly that window.
  const to = new Date(`${grid[41]}T00:00:00Z`)
  to.setUTCDate(to.getUTCDate() + 1)
  const events = await fetchEvents({ from: grid[0], to: to.toISOString().slice(0, 10), limit: 500 }).catch(
    (): SiteEvent[] => []
  )

  // A multi-day regatta with a schedule shows each day's session at its own
  // time; an event without one shows on every day it spans.
  const byDay = calendarEntriesByDay(events)
  const inMonth = events.filter((e) => eventDays(e).some((d) => d.startsWith(month)))

  return (
    <div className="ev">
      <div className="ev__head">
        <div>
          <span className="bl__kicker">Calendario</span>
          <h1 className="bl__title">Eventos</h1>
          <p className="bl__sub">Regatas, salidas, cursos y encuentros de la náutica uruguaya.</p>
        </div>
      </div>

      <div className="ev__nav">
        <Link href={`/eventos?mes=${shiftMonth(month, -1)}`} className="tm-chip" aria-label="Mes anterior">
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
        <h2 className="ev__month">{monthLabel(month)}</h2>
        <Link href={`/eventos?mes=${shiftMonth(month, 1)}`} className="tm-chip" aria-label="Mes siguiente">
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
        {month !== today.slice(0, 7) && (
          <Link href="/eventos" className="text-sm text-accent underline">
            Hoy
          </Link>
        )}
      </div>

      <div className="ev-cal" role="grid" aria-label={`Eventos de ${monthLabel(month)}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="ev-cal__wd" role="columnheader">
            {d}
          </div>
        ))}
        {grid.map((day) => {
          const list = byDay.get(day) ?? []
          const classes = [
            'ev-cal__day',
            day.startsWith(month) ? '' : 'ev-cal__day--out',
            day === today ? 'ev-cal__day--today' : '',
            list.length > 0 ? 'ev-cal__day--has' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div key={day} className={classes} role="gridcell">
              <span className="ev-cal__num">{Number(day.slice(8))}</span>
              <div className="ev-cal__events">
                {list.slice(0, 3).map(({ event: e, time, label }, i) => (
                  <Link
                    key={`${e.id}-${i}`}
                    href={`/eventos/${e.slug}`}
                    className="ev-cal__ev"
                    title={[time, e.title, label].filter(Boolean).join(' · ')}
                  >
                    {time && <span className="ev-cal__time">{time.split('–')[0]}</span>}
                    {e.title}
                  </Link>
                ))}
                {list.length > 3 && <span className="ev-cal__more">+{list.length - 3} más</span>}
              </div>
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 className="ev__month" style={{ marginBottom: 12 }}>
          {inMonth.length > 0 ? `Este mes · ${inMonth.length}` : 'Este mes'}
        </h2>
        {inMonth.length > 0 ? (
          <div className="ev-list">
            {inMonth.map((e) => (
              <EventListItem key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="nh-empty">
            <strong>No hay eventos cargados para {monthLabel(month).toLowerCase()}</strong>
            Probá con otro mes o volvé pronto.
          </div>
        )}
      </section>
    </div>
  )
}
