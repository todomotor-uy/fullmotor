/**
 * Cache tags for the site's editorial content. Every public fetch of blog
 * posts or events carries one, so publishing from the panel can expire them
 * at once instead of waiting out the hour (blog) or five minutes (events)
 * the pages otherwise keep.
 */
export const CONTENT_TAGS = {
  blog: 'blog',
  events: 'events',
  /** The site's modules and categories (lib/site-settings.server.ts). */
  site: 'site-settings',
} as const

export type ContentScope = keyof typeof CONTENT_TAGS

/**
 * Asks this site to drop its cached copy of the given content, right after
 * the panel changed it. Best effort: the write already succeeded, and the
 * pages still refresh on their own schedule if this fails.
 */
export async function refreshPublicContent(token: string | null, ...scopes: ContentScope[]): Promise<void> {
  if (!token || scopes.length === 0) return
  try {
    await fetch('/api/revalidate/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scopes }),
    })
  } catch {
    // Ignored on purpose; see above.
  }
}
