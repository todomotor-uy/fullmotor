/**
 * The blog's tag filter lives in the URL as ?tags=a,b — every listed tag must
 * be on the post. The older ?tag=a still reads as a one-tag filter, so links
 * already out there keep working.
 */

export interface TagCount {
  tag: string
  count: number
}

const MAX_FILTER_TAGS = 8

function dedupe(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const t = raw.trim()
    const key = t.toLowerCase()
    if (!t || seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out.slice(0, MAX_FILTER_TAGS)
}

/** Selected tags from the page's search params (server or client). */
export function parseTagParams(params: { tag?: string | null; tags?: string | null }): string[] {
  const list: string[] = []
  if (params.tags) list.push(...params.tags.split(','))
  if (params.tag) list.push(params.tag)
  return dedupe(list)
}

/** The blog URL filtered to these tags. */
export function blogTagsHref(tags: string[]): string {
  const clean = dedupe(tags)
  if (clean.length === 0) return '/blog'
  return `/blog?tags=${clean.map(encodeURIComponent).join(',')}`
}

/** Adds the tag to the selection, or removes it if already selected. */
export function toggleTag(selected: string[], tag: string): string[] {
  const key = tag.toLowerCase()
  return selected.some((t) => t.toLowerCase() === key)
    ? selected.filter((t) => t.toLowerCase() !== key)
    : [...selected, tag]
}

export function isSelected(selected: string[], tag: string): boolean {
  const key = tag.toLowerCase()
  return selected.some((t) => t.toLowerCase() === key)
}

/**
 * The site's tags, for the admin's suggestions. Browser-side: the server
 * helpers in lib/blog send headers a browser may not set.
 */
export async function fetchTagSuggestions(apiUrl: string, headers: Record<string, string>): Promise<TagCount[]> {
  const res = await fetch(`${apiUrl}/api/blog/tags`, { headers })
  if (!res.ok) return []
  const body: { counts?: TagCount[]; data?: string[] } = await res.json()
  return body.counts ?? (body.data ?? []).map((tag) => ({ tag, count: 0 }))
}
