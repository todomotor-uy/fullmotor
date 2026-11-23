import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { CONTENT_TAGS, type ContentScope } from '@/lib/content-cache'
import { PERM } from '@/lib/permissions'
import { tenantHeader } from '@/lib/tenant'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/** Who may expire each kind of content: whoever may edit it. */
const REQUIRED: Record<ContentScope, string> = {
  blog: PERM.blog,
  events: PERM.events,
}

/**
 * Expires the cached blog posts and/or events of this site, so a post or
 * event published from the panel shows on the home, /blog and /eventos at
 * once. Called by the panel with the operator's own session token, which the
 * API checks (/auth/me) for this site and the matching permission; the
 * server-to-server /api/revalidate keeps its shared secret.
 *
 *   POST /api/revalidate/content  { "scopes": ["blog", "events"] }
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let scopes: ContentScope[]
  try {
    const body = (await request.json()) as { scopes?: unknown }
    scopes = Array.isArray(body.scopes)
      ? body.scopes.filter((s): s is ContentScope => typeof s === 'string' && s in CONTENT_TAGS)
      : []
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (scopes.length === 0) {
    return NextResponse.json({ error: 'No scopes' }, { status: 400 })
  }

  const me = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: auth, ...tenantHeader() },
    cache: 'no-store',
  })
  if (!me.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = (await me.json()) as { role?: string; permissions?: string[] }
  // An API that predates permissions only sends the role (see lib/permissions).
  const permissions = user.permissions ?? (user.role === 'admin' ? Object.values(PERM) : [])

  const allowed = scopes.filter((s) => permissions.includes(REQUIRED[s]))
  if (allowed.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // expire: 0 drops the entries now, so the next visit renders fresh data
  // rather than one more stale copy while it refreshes in the background.
  for (const scope of allowed) revalidateTag(CONTENT_TAGS[scope], { expire: 0 })

  return NextResponse.json({ revalidated: allowed, now: Date.now() })
}
