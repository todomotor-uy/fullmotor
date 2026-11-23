import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { VEHICLE_SLUG_REDIRECTS } from '@/lib/vehicle-slug-redirects'
import { CATALOG_ONLY_PREFIXES, EVENTS_PREFIXES, SITE_CONFIG } from '@/lib/tenant'

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

  // Sites without the vehicle catalogue answer 404 for its routes, rather
  // than rendering pages that would fetch another site's market data.
  if (!SITE_CONFIG.features.catalog && matchesPrefix(pathname, CATALOG_ONLY_PREFIXES)) {
    return NextResponse.rewrite(new URL('/__not-found', request.url))
  }
  if (!SITE_CONFIG.features.events && matchesPrefix(pathname, EVENTS_PREFIXES)) {
    return NextResponse.rewrite(new URL('/__not-found', request.url))
  }

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

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')
  )
}

export const config = {
  // The vehicle redirects only need /vehiculo/*; the rest are the catalogue
  // routes a non-catalogue tenant must not serve. On TodoMotor those fall
  // straight through to NextResponse.next().
  matcher: [
    '/vehiculo/:path*',
    '/vehiculos/:path*',
    '/marcas/:path*',
    '/compare/:path*',
    '/guia-de-compra/:path*',
    '/guardados/:path*',
    '/eventos/:path*',
  ],
}
