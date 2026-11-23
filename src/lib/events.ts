import type { SiteEvent } from '@/types/event'
import { getHeaders } from './api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/** Every date on the calendar is shown in Uruguay's time. */
export const EVENTS_TZ = 'America/Montevideo'

interface FetchEventsParams {
  /** YYYY-MM-DD, inclusive. With `to`, a window; without both, upcoming. */
  from?: string
  /** YYYY-MM-DD, exclusive. */
  to?: string
  tags?: string[]
  /** Events linked to this blog post. */
  post?: string
  limit?: number
}

export async function fetchEvents(params: FetchEventsParams = {}): Promise<SiteEvent[]> {
  const search = new URLSearchParams()
  if (params.from && params.to) {
    search.set('from', params.from)
    search.set('to', params.to)
  }
  if (params.tags && params.tags.length > 0) search.set('tags', params.tags.join(','))
  if (params.post) search.set('post', params.post)
  if (params.limit) search.set('limit', String(params.limit))

  const res = await fetch(`${API_URL}/api/events${search.toString() ? `?${search}` : ''}`, {
    next: { revalidate: 300 },
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`)
  const body: { data: SiteEvent[] } = await res.json()
  return body.data ?? []
}

export async function fetchEventBySlug(slug: string): Promise<SiteEvent | null> {
  const res = await fetch(`${API_URL}/api/events/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
    headers: getHeaders(),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch event: ${res.statusText}`)
  const body: { data: SiteEvent } = await res.json()
  return body.data
}

// ---------- Dates ----------

/** YYYY-MM-DD of an instant in Uruguay, or of the UTC date for all-day. */
export function dayKey(iso: string, allDay: boolean): string {
  const d = new Date(iso)
  if (allDay) return d.toISOString().slice(0, 10)
  return new Intl.DateTimeFormat('en-CA', { timeZone: EVENTS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Every day an event covers, as YYYY-MM-DD, capped at 62 days. */
export function eventDays(e: SiteEvent): string[] {
  const start = dayKey(e.startsAt, e.allDay)
  const end = e.endsAt ? dayKey(e.endsAt, e.allDay) : start
  const days: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last && days.length < 62) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

/** Today in Uruguay, YYYY-MM-DD. */
export function todayKey(): string {
  return dayKey(new Date().toISOString(), false)
}

/** "2026-12" for the month a YYYY-MM-DD falls in. */
export function monthOf(day: string): string {
  return day.slice(0, 7)
}

/** Parses ?mes=YYYY-MM, falling back to the current month. */
export function parseMonth(raw: string | undefined): string {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return raw
  return monthOf(todayKey())
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

/**
 * The six-week grid a month is drawn on, Monday first: the days before the
 * 1st and after the last belong to the neighbouring months.
 */
export function monthGrid(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7 // Monday = 0
  const start = new Date(first)
  start.setUTCDate(1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

const monthFmt = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export function monthLabel(month: string): string {
  const s = monthFmt.format(new Date(`${month}-01T00:00:00Z`))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const dayFmt = new Intl.DateTimeFormat('es-UY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const timeFmt = new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: EVENTS_TZ })

/** "sáb 5 dic" or "sáb 5 dic – lun 7 dic", with times for timed events. */
export function eventWhen(e: SiteEvent): string {
  const startDay = dayFmt.format(new Date(`${dayKey(e.startsAt, e.allDay)}T00:00:00Z`))
  const endDayKey = e.endsAt ? dayKey(e.endsAt, e.allDay) : null
  const sameDay = !endDayKey || endDayKey === dayKey(e.startsAt, e.allDay)
  if (e.allDay) {
    return sameDay ? startDay : `${startDay} – ${dayFmt.format(new Date(`${endDayKey}T00:00:00Z`))}`
  }
  const startTime = timeFmt.format(new Date(e.startsAt))
  if (!e.endsAt) return `${startDay}, ${startTime}`
  const endTime = timeFmt.format(new Date(e.endsAt))
  return sameDay
    ? `${startDay}, ${startTime} – ${endTime}`
    : `${startDay} ${startTime} – ${dayFmt.format(new Date(`${endDayKey}T00:00:00Z`))} ${endTime}`
}

/** A Google Calendar "add event" link for the event. */
export function googleCalendarUrl(e: SiteEvent, pageUrl: string): string {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  let dates: string
  if (e.allDay) {
    const start = dayKey(e.startsAt, true).replace(/-/g, '')
    const endKey = e.endsAt ? dayKey(e.endsAt, true) : dayKey(e.startsAt, true)
    const end = new Date(`${endKey}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() + 1) // Google's all-day end is exclusive
    dates = `${start}/${end.toISOString().slice(0, 10).replace(/-/g, '')}`
  } else {
    const end = e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 2 * 3600 * 1000).toISOString()
    dates = `${fmt(e.startsAt)}/${fmt(end)}`
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    details: [e.description ?? '', pageUrl].filter(Boolean).join('\n\n'),
    location: [e.location, e.city].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
