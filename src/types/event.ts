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
  /** The blog post that tells this event's story, when published. */
  blogPost?: { slug: string; title: string } | null
}
