import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { VEHICLE_SLUG_REDIRECTS } from '@/lib/vehicle-slug-redirects'

/**
 * Permanent redirects for vehicle slugs normalised on 2026-08-05.
 *
 * These live here rather than in next.config's `redirects()` because the old
 * slugs contain `+`, `(`, `)` and `:` — path-to-regexp reads those as
 * quantifiers and capture groups, so `redirects()` either fails to build or
 * silently matches the wrong paths. An exact map lookup has no such problem.
 */
const REDIRECT_MAP = new Map(
  VEHICLE_SLUG_REDIRECTS.map(({ from, to }) => [`/vehiculo/${from}`, `/vehiculo/${to}`])
)

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sections of a module the site has switched off answer 404 from their
  // own layout (requireModule), which reads the live settings; nothing here.

  // Match on the decoded path: a browser percent-encodes parentheses and
  // commas, so the raw pathname would not equal the stored slug.
  let decoded = pathname
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // Malformed percent-encoding — fall through to the raw value.
  }

  const target = REDIRECT_MAP.get(decoded) ?? REDIRECT_MAP.get(pathname)
  if (target) {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/vehiculo/:path*'],
}
