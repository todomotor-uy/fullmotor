'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import RequireAuth from '../components/RequireAuth'
import { useAuth } from '../components/AuthProvider'
import { BIZ, SITE_CONFIG } from '@/lib/tenant'
import { PERM, can, isStaff, type Permission } from '@/lib/permissions'

/**
 * Each section with the permission it needs. A section the operator's role
 * does not cover is not shown; the API would answer 403 anyway.
 */
const ALL_SECTIONS: { href: string; label: string; permission: Permission; catalog?: boolean; events?: boolean }[] = [
  { href: '/admin', label: 'Imágenes', permission: PERM.catalog, catalog: true },
  { href: '/admin/blog', label: SITE_CONFIG.brand === 'nauti' ? 'Novedades' : 'Blog', permission: PERM.blog },
  { href: '/admin/eventos', label: 'Eventos', permission: PERM.events, events: true },
  { href: '/admin/usuarios', label: 'Usuarios', permission: PERM.users },
  { href: '/admin/comentarios', label: 'Comentarios', permission: PERM.moderation },
  { href: '/admin/clasificados', label: 'Clasificados', permission: PERM.moderation },
  { href: '/admin/comercios', label: BIZ.Many, permission: PERM.dealerships },
]

// Catalogue screens only exist on sites with a catalogue.
const SITE_SECTIONS = ALL_SECTIONS.filter(
  (s) => (!s.catalog || SITE_CONFIG.features.catalog) && (!s.events || SITE_CONFIG.features.events)
)

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const sections = SITE_SECTIONS.filter((s) => can(user, s.permission))

  // /admin is the catalogue screen. An operator who cannot use it — an
  // editor, or anyone on a site without a catalogue — lands on their first
  // section instead.
  const landing = sections.find((s) => s.href === '/admin')
  const fallback = sections[0]?.href
  useEffect(() => {
    if (user && pathname === '/admin' && !landing && fallback) router.replace(fallback)
  }, [user, pathname, landing, fallback, router])

  // Client-side gate only, and deliberately so: every /api/ops endpoint checks
  // the permission itself and answers 403 regardless. This exists so someone
  // who is signed in but not an operator gets told that, instead of a screen
  // of failed requests.
  if (user && !isStaff(user)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-ink mb-2">No tenés acceso</h1>
        <p className="text-sm text-muted">Esta sección es para operadores de {SITE_CONFIG.name}.</p>
      </div>
    )
  }

  return (
    <div>
      <nav className="border-b border-line bg-surface" aria-label="Secciones de administración">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {sections.map((s) => {
            // Exact match for /admin, prefix for the rest: without the special
            // case every section would light up at once, since they all start
            // with /admin.
            const active = s.href === '/admin' ? pathname === '/admin' : pathname.startsWith(s.href)
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'px-3 py-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-accent text-ink font-semibold'
                    : 'border-transparent text-muted hover:text-ink',
                ].join(' ')}
              >
                {s.label}
              </Link>
            )
          })}
        </div>
      </nav>
      {children}
    </div>
  )
}

/**
 * The chrome every /admin page shares: a session, the operator check, and the
 * section nav.
 *
 * Mounted from the layout so a new screen gets all three by existing, rather
 * than by remembering to copy the gate — which is how one of them eventually
 * ships without it.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  )
}
