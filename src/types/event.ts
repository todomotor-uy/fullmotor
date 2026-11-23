/** One slot of a multi-session event: "Día 2 · 11:00–17:00". */
export interface EventSession {
  id: string
  startsAt: string
  endsAt?: string | null
  label?: string | null
  location?: string | null
}

export interface SiteEvent {
  id: string
  slug: string
  title: string
  description?: string | null
  /** ISO instants. An all-day event's are UTC midnights of its dates. */
  startsAt: string
  endsAt?: string | null
  allDay: boolean
  location?: string | null
  city?: string | null
  url?: string | null
  coverImage?: string | null
  tags: string[]
  status: 'draft' | 'published'
  /**
   * The schedule, in time order, when the event runs over several sessions.
   * startsAt/endsAt then span it: first start to last end.
   */
  sessions?: EventSession[]
  /** The blog post that tells this event's story, when published. */
  blogPost?: { slug: string; title: string } | null
}
