'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, Check, ExternalLink, MessageSquare, RefreshCw, Undo2 } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Button } from './ui/Button'
import { FilterChip } from './ui/FilterChip'
import { Select } from './ui/Select'
import { ApiError, translateApiError } from '@/lib/api'
import { useFetch } from '@/lib/use-fetch'
import {
  type DayPoint,
  type FeedbackItem,
  type Overview,
  type SiteMetrics,
  fetchErrors,
  fetchFeedback,
  fetchOverview,
  markFeedback,
} from '@/lib/superadmin-api'

// ============================================
// Dates
// ============================================

/** A calendar day as YYYY-MM-DD in the browser's zone (the API reads it in Montevideo's). */
function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDay(d)
}

const PRESETS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 365, label: '1 año' },
]

function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
}

function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-UY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fmt = (n: number) => n.toLocaleString('es-UY')

// ============================================
// Pieces
// ============================================

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: number
  sub?: string
  tone?: 'warn'
}) {
  return (
    <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-4 min-w-0">
      <p className="tm-eyebrow flex items-center gap-1">
        {tone === 'warn' && value > 0 && <AlertTriangle size={12} aria-hidden="true" className="text-danger-ink" />}
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-ink mt-1">{fmt(value)}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
      {message}
    </div>
  )
}

/** Sum a daily series into ISO weeks (Monday first), for long ranges. */
function byWeek(series: DayPoint[]): DayPoint[] {
  const out: DayPoint[] = []
  for (const p of series) {
    const [y, m, d] = p.date.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const key = isoDay(monday)
    let w = out[out.length - 1]
    if (!w || w.date !== key) {
      w = { date: key, newUsers: 0, classifieds: 0, errors: 0, feedback: 0 }
      out.push(w)
    }
    w.newUsers += p.newUsers
    w.classifieds += p.classifieds
    w.errors += p.errors
    w.feedback += p.feedback
  }
  return out
}

/**
 * One series as thin bars. One chart per measure rather than one chart with
 * four: the counts live on very different scales, and a shared axis would
 * flatten all but the largest.
 */
function BarChart({
  title,
  points,
  value,
  unit,
}: {
  title: string
  points: DayPoint[]
  value: (p: DayPoint) => number
  unit: 'día' | 'semana'
}) {
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map(value)
  const max = Math.max(1, ...values)
  const total = values.reduce((a, b) => a + b, 0)
  const W = 320
  const H = 96
  const step = W / Math.max(1, points.length)
  const barW = Math.max(1, Math.min(18, step - 2))
  const h = hover != null ? points[hover] : null

  return (
    <figure className="bg-surface border border-line rounded-[var(--radius-lg)] p-4 min-w-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-muted">
          {h ? `${unit === 'semana' ? 'Semana del ' : ''}${shortDay(h.date)}: ${fmt(value(h))}` : `Total ${fmt(total)}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H + 1}`}
        // Stretch to the card's width: the bars are the only marks, so a
        // non-uniform scale costs nothing and leaves no empty margins.
        preserveAspectRatio="none"
        className="w-full h-24 mt-3 block"
        role="img"
        aria-label={`${title}: ${fmt(total)} en total, máximo ${fmt(max)} por ${unit}`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--border)" strokeWidth={1} />
        {points.map((p, i) => {
          const v = values[i]
          const bh = v === 0 ? 0 : Math.max(2, (v / max) * (H - 4))
          const x = i * step + (step - barW) / 2
          return (
            <g key={p.date} onMouseEnter={() => setHover(i)}>
              {/* Hit target: the full column, not just the bar. */}
              <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
              {bh > 0 && (
                <path
                  d={roundedTop(x, H - bh, barW, bh, Math.min(3, barW / 2))}
                  fill="var(--accent)"
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-muted mt-1 font-mono">
        <span>{points[0] ? shortDay(points[0].date) : ''}</span>
        <span>máx. {fmt(max)}</span>
        <span>{points.length ? shortDay(points[points.length - 1].date) : ''}</span>
      </div>
    </figure>
  )
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

// ============================================
// Per-site table
// ============================================

type Row = { label: string; get: (m: SiteMetrics) => number; module?: string; hint?: string }
type Group = { title: string; rows: Row[] }

const GROUPS: Group[] = [
  {
    title: 'Usuarios',
    rows: [
      { label: 'Total', get: (m) => m.users.total },
      { label: 'Nuevos en el período', get: (m) => m.users.new },
      { label: 'Activos en el período', get: (m) => m.users.active, hint: 'Iniciaron sesión o usaron el sitio con sesión' },
      { label: 'Suspendidos', get: (m) => m.users.suspended },
    ],
  },
  {
    title: 'Clasificados',
    rows: [
      { label: 'Publicados (vigentes)', get: (m) => m.classifieds.active, module: 'classifieds' },
      { label: 'Vencidos', get: (m) => m.classifieds.expired, module: 'classifieds' },
      { label: 'Pausados', get: (m) => m.classifieds.paused, module: 'classifieds' },
      { label: 'Vendidos', get: (m) => m.classifieds.sold, module: 'classifieds' },
      { label: 'Eliminados', get: (m) => m.classifieds.deleted, module: 'classifieds' },
      { label: 'Nuevos en el período', get: (m) => m.classifieds.new, module: 'classifieds' },
    ],
  },
  {
    title: 'Comercios',
    rows: [
      { label: 'Aprobados', get: (m) => m.dealerships.approved, module: 'storefronts' },
      { label: 'Pendientes de revisión', get: (m) => m.dealerships.pending, module: 'storefronts' },
      { label: 'Rechazados', get: (m) => m.dealerships.rejected, module: 'storefronts' },
      { label: 'Suspendidos', get: (m) => m.dealerships.suspended, module: 'storefronts' },
      { label: 'Solicitudes en el período', get: (m) => m.dealerships.new, module: 'storefronts' },
    ],
  },
  {
    title: 'Contenido',
    rows: [
      { label: 'Notas publicadas', get: (m) => m.posts.published, module: 'news' },
      { label: 'Notas publicadas en el período', get: (m) => m.posts.new, module: 'news' },
      { label: 'Notas en borrador', get: (m) => m.posts.drafts, module: 'news' },
      { label: 'Notas programadas', get: (m) => m.posts.scheduled, module: 'news' },
      { label: 'Eventos publicados', get: (m) => m.events.published, module: 'events' },
      { label: 'Eventos próximos', get: (m) => m.events.upcoming, module: 'events' },
      { label: 'Comentarios visibles', get: (m) => m.comments.visible },
      { label: 'Comentarios en el período', get: (m) => m.comments.new },
      { label: 'Comentarios borrados en el período', get: (m) => m.comments.removed },
      { label: 'Vehículos en catálogo', get: (m) => m.catalog.vehicles, module: 'catalog' },
    ],
  },
  {
    title: 'Publicidad',
    rows: [
      { label: 'Campañas activas hoy', get: (m) => m.ads.activeCampaigns, module: 'ads' },
      { label: 'Impresiones', get: (m) => m.ads.impressions, module: 'ads', hint: 'Del resumen diario: los últimos días pueden faltar' },
      { label: 'Clics', get: (m) => m.ads.clicks, module: 'ads' },
    ],
  },
  {
    title: 'Salud',
    rows: [
      { label: 'Errores de la API (5xx)', get: (m) => m.errors.api },
      { label: 'Errores en el navegador', get: (m) => m.errors.webClient },
      { label: 'Errores al renderizar', get: (m) => m.errors.webServer },
      { label: 'Comentarios de usuarios', get: (m) => m.feedback.new },
      { label: 'Comentarios sin leer', get: (m) => m.feedback.unread },
    ],
  },
]

function SitesTable({ overview }: { overview: Overview }) {
  const sites = overview.sites
  return (
    <div className="bg-surface border border-line rounded-[var(--radius-lg)] overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="px-4 py-3 font-semibold text-ink">Métrica</th>
            {sites.map((s) => (
              <th key={s.tenantId} className="px-4 py-3 font-semibold text-ink text-right whitespace-nowrap">
                {s.baseUrl ? (
                  <a href={s.baseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    {s.name}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : (
                  s.name
                )}
                {!s.active && <span className="block tm-eyebrow">inactivo</span>}
              </th>
            ))}
            <th className="px-4 py-3 font-semibold text-ink text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((g) => {
            // A group nobody uses (no site has the module) is noise.
            const rows = g.rows.filter((r) => !r.module || sites.some((s) => s.modules.includes(r.module!)) || r.get(overview.total.metrics) > 0)
            if (rows.length === 0) return null
            return (
              <FragmentRows key={g.title} title={g.title} colSpan={sites.length + 2}>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2 text-muted" title={r.hint}>
                      {r.label}
                    </td>
                    {sites.map((s) => {
                      const off = r.module && !s.modules.includes(r.module) && r.get(s.metrics) === 0
                      return (
                        <td key={s.tenantId} className="px-4 py-2 text-right font-mono tabular-nums text-ink">
                          {off ? <span className="text-muted" title="Módulo apagado en este sitio">—</span> : fmt(r.get(s.metrics))}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-ink">
                      {fmt(r.get(overview.total.metrics))}
                    </td>
                  </tr>
                ))}
              </FragmentRows>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FragmentRows({ title, colSpan, children }: { title: string; colSpan: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-sunken">
        <td colSpan={colSpan} className="px-4 py-2 tm-eyebrow">
          {title}
        </td>
      </tr>
      {children}
    </>
  )
}

// ============================================
// Errors
// ============================================

const SOURCES = [
  { value: 'all', label: 'Todos' },
  { value: 'api', label: 'API (5xx)' },
  { value: 'web-client', label: 'Navegador' },
  { value: 'web-server', label: 'Render' },
]

const SOURCE_LABEL: Record<string, string> = { api: 'API', 'web-client': 'Navegador', 'web-server': 'Render' }

function ErrorsPanel({ from, to, tenant, siteName }: { from: string; to: string; tenant: string; siteName: (id: string) => string }) {
  const [source, setSource] = useState('all')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)

  const fetcher = useCallback(
    () => fetchErrors({ from, to, source, tenant: tenant || undefined, page }),
    [from, to, source, tenant, page]
  )
  const res = useFetch(fetcher)
  const loading = res.loading
  const error = res.error ? translateApiError(res.error, 'No pudimos cargar los errores') : null
  const rows = res.data?.data ?? []
  const groups = res.data?.groups ?? []
  const total = res.data?.meta.total ?? 0
  const lastPage = res.data?.meta.lastPage ?? 1

  return (
    <Section
      title="Errores"
      aside={
        <div className="flex gap-2 flex-wrap">
          {SOURCES.map((s) => (
            <FilterChip
              key={s.value}
              active={source === s.value}
              onClick={() => {
                setSource(s.value)
                setPage(1)
              }}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>
      }
    >
      {error && <ErrorNote message={error} />}
      {!error && !loading && total === 0 && (
        <p className="text-sm text-muted bg-surface border border-line rounded-[var(--radius-lg)] p-4">
          Sin errores en el período. 🎉
        </p>
      )}
      {groups.length > 0 && (
        <div className="bg-surface border border-line rounded-[var(--radius-lg)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-2 font-semibold text-ink">Más frecuentes</th>
                <th className="px-4 py-2 font-semibold text-ink">Sitio</th>
                <th className="px-4 py-2 font-semibold text-ink text-right">Veces</th>
                <th className="px-4 py-2 font-semibold text-ink text-right">Último</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={i} className="border-b border-hairline last:border-0 align-top">
                  <td className="px-4 py-2 min-w-[280px]">
                    <span className="tm-eyebrow mr-2">
                      {SOURCE_LABEL[g.source]}
                      {g.status ? ` ${g.status}` : ''}
                    </span>
                    <span className="font-mono text-xs text-ink break-all">{g.where || '—'}</span>
                    <p className="text-muted text-xs mt-0.5 break-words">{g.message}</p>
                  </td>
                  <td className="px-4 py-2 text-muted whitespace-nowrap">{siteName(g.tenantId)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(g.count)}</td>
                  <td className="px-4 py-2 text-right text-muted whitespace-nowrap">{dateTime(g.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <div className="bg-surface border border-line rounded-[var(--radius-lg)] divide-y divide-hairline">
          <p className="px-4 py-2 tm-eyebrow">Últimos {fmt(total)} en el período</p>
          {rows.map((e) => (
            <div key={e.id} className="px-4 py-2 text-sm">
              <button
                type="button"
                className="w-full text-left flex items-start gap-3 cursor-pointer"
                aria-expanded={open === e.id}
                onClick={() => setOpen(open === e.id ? null : e.id)}
              >
                <span className="text-muted whitespace-nowrap text-xs mt-0.5 w-24 flex-shrink-0">{dateTime(e.createdAt)}</span>
                <span className="min-w-0 flex-1">
                  <span className="tm-eyebrow mr-2">
                    {SOURCE_LABEL[e.source]}
                    {e.status ? ` ${e.status}` : ''} · {siteName(e.tenantId)}
                  </span>
                  <span className="font-mono text-xs text-ink break-all">
                    {e.method ? `${e.method} ` : ''}
                    {e.path || '—'}
                  </span>
                  <span className="block text-muted text-xs break-words">{e.message}</span>
                </span>
              </button>
              {open === e.id && (
                <div className="mt-2 ml-0 sm:ml-[108px] space-y-1 text-xs">
                  {e.route && <p className="text-muted">Ruta: <span className="font-mono">{e.route}</span></p>}
                  {e.durationMs ? <p className="text-muted">Duración: {e.durationMs} ms</p> : null}
                  {e.userAgent && <p className="text-muted break-all">Navegador: {e.userAgent}</p>}
                  {e.detail && (
                    <pre className="bg-sunken rounded-[var(--radius-md)] p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-ink max-h-80">
                      {e.detail}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {lastPage > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            Anteriores
          </Button>
          <span className="text-muted">
            {page} / {lastPage}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= lastPage || loading} onClick={() => setPage(page + 1)}>
            Siguientes
          </Button>
        </div>
      )}
    </Section>
  )
}

// ============================================
// Feedback
// ============================================

const FEEDBACK_TABS = [
  { value: 'unread', label: 'Sin leer' },
  { value: 'read', label: 'Leídos' },
  { value: 'all', label: 'Todos' },
]

function FeedbackPanel({
  tenant,
  siteName,
  siteUrl,
  onChange,
}: {
  tenant: string
  siteName: (id: string) => string
  siteUrl: (id: string) => string
  onChange: () => void
}) {
  const [status, setStatus] = useState('unread')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetcher = useCallback(() => fetchFeedback({ status, tenant: tenant || undefined, page }), [status, tenant, page])
  const res = useFetch(fetcher)
  const loading = res.loading
  const error = actionError ?? (res.error ? translateApiError(res.error, 'No pudimos cargar los comentarios') : null)
  const items = res.data?.data ?? []
  const unread = res.data?.unread ?? 0
  const lastPage = res.data?.meta.lastPage ?? 1

  const toggle = async (item: FeedbackItem) => {
    setBusy(item.id)
    setActionError(null)
    try {
      await markFeedback(item.id, !item.readAt)
      res.reload()
      onChange()
    } catch (err) {
      setActionError(translateApiError(err, 'No pudimos actualizar el comentario'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Section
      title="Comentarios de usuarios"
      aside={
        <div className="flex gap-2 flex-wrap">
          {FEEDBACK_TABS.map((t) => (
            <FilterChip
              key={t.value}
              active={status === t.value}
              count={t.value === 'unread' ? unread : undefined}
              onClick={() => {
                setStatus(t.value)
                setPage(1)
              }}
            >
              {t.label}
            </FilterChip>
          ))}
        </div>
      }
    >
      {error && <ErrorNote message={error} />}
      {!error && !loading && items.length === 0 && (
        <p className="text-sm text-muted bg-surface border border-line rounded-[var(--radius-lg)] p-4">
          {status === 'unread' ? 'No hay comentarios sin leer.' : 'Todavía no hay comentarios.'}
        </p>
      )}
      {items.length > 0 && (
        <ul className="bg-surface border border-line rounded-[var(--radius-lg)] divide-y divide-hairline">
          {items.map((f) => (
            <li key={f.id} className="p-4 flex gap-3 items-start">
              <MessageSquare
                size={16}
                aria-hidden="true"
                className={['flex-shrink-0 mt-1', f.readAt ? 'text-muted' : 'text-accent'].join(' ')}
              />
              <div className="min-w-0 flex-1">
                <p className={['text-sm whitespace-pre-wrap break-words', f.readAt ? 'text-muted' : 'text-ink'].join(' ')}>
                  {f.message}
                </p>
                <p className="text-xs text-muted mt-1 flex flex-wrap gap-x-2">
                  <span>{dateTime(f.createdAt)}</span>
                  <span>· {siteName(f.tenantId)}</span>
                  {f.page && (
                    <span>
                      ·{' '}
                      <a href={`${siteUrl(f.tenantId)}${f.page}`} target="_blank" rel="noreferrer" className="font-mono hover:underline">
                        {f.page}
                      </a>
                    </span>
                  )}
                  <span>
                    ·{' '}
                    {f.userEmail ? (
                      <a href={`mailto:${f.userEmail}`} className="hover:underline">
                        {f.userName || f.userEmail}
                      </a>
                    ) : f.contact ? (
                      <>Anónimo, contacto: {f.contact}</>
                    ) : (
                      'Anónimo'
                    )}
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                variant={f.readAt ? 'ghost' : 'secondary'}
                loading={busy === f.id}
                iconLeft={f.readAt ? <Undo2 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                onClick={() => void toggle(f)}
              >
                {f.readAt ? 'Marcar sin leer' : 'Marcar leído'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {lastPage > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            Anteriores
          </Button>
          <span className="text-muted">
            {page} / {lastPage}
          </span>
          <Button size="sm" variant="secondary" disabled={page >= lastPage || loading} onClick={() => setPage(page + 1)}>
            Siguientes
          </Button>
        </div>
      )}
    </Section>
  )
}

// ============================================
// Page
// ============================================

/** Everything below the header. Only rendered for a super admin (see Gate). */
export default function Panel() {
  const { logout } = useAuth()
  const [from, setFrom] = useState(() => daysAgo(29))
  const [to, setTo] = useState(() => isoDay(new Date()))
  const [tenant, setTenant] = useState('')
  const [grouping, setGrouping] = useState<'day' | 'week'>('day')
  const fetcher = useCallback(() => fetchOverview(from, to), [from, to])
  const res = useFetch<Overview>(fetcher)
  const overview = res.data ?? null
  const loading = res.loading
  const load = res.reload
  const error = res.error ? translateApiError(res.error, 'No pudimos cargar las métricas') : null

  // An expired session: back to the sign-in screen rather than a panel full
  // of 401s.
  useEffect(() => {
    if (res.error instanceof ApiError && res.error.status === 401) logout()
  }, [res.error, logout])

  const sitesById = useMemo(() => new Map((overview?.sites ?? []).map((s) => [s.tenantId, s])), [overview])
  const siteName = useCallback((id: string) => sitesById.get(id)?.name ?? id, [sitesById])
  const siteUrl = useCallback((id: string) => sitesById.get(id)?.baseUrl ?? '', [sitesById])

  const selected = tenant ? overview?.sites.find((s) => s.tenantId === tenant) : undefined
  const metrics = selected?.metrics ?? overview?.total.metrics
  const daily = selected?.series ?? overview?.total.series ?? []
  const series = grouping === 'week' ? byWeek(daily) : daily
  const presetActive = (days: number) => to === isoDay(new Date()) && from === daysAgo(days - 1)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
          Todos los sitios
        </h1>
        <p className="text-sm text-muted mt-2">
          Uso y salud de cada sitio y del total. Los conteos con &quot;en el período&quot; dependen de las fechas;
          el resto es el estado de hoy.
        </p>
      </div>

      {/* Filters, in one row above everything they affect. */}
      <div className="flex flex-wrap items-end gap-3 bg-surface border border-line rounded-[var(--radius-lg)] p-4">
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <FilterChip
              key={p.days}
              active={presetActive(p.days)}
              onClick={() => {
                setFrom(daysAgo(p.days - 1))
                setTo(isoDay(new Date()))
                setGrouping(p.days > 60 ? 'week' : 'day')
              }}
            >
              {p.label}
            </FilterChip>
          ))}
        </div>
        <label className="tm-field">
          <span className="tm-field__label">Desde</span>
          <input type="date" className="tm-input tm-input--sm" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </label>
        <label className="tm-field">
          <span className="tm-field__label">Hasta</span>
          <input type="date" className="tm-input tm-input--sm" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </label>
        <Select
          label="Sitio"
          size="sm"
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          options={[{ value: '', label: 'Todos' }, ...(overview?.sites ?? []).map((s) => ({ value: s.tenantId, label: s.name }))]}
        />
        <Button
          size="sm"
          variant="ghost"
          loading={loading}
          iconLeft={<RefreshCw size={14} aria-hidden="true" />}
          onClick={load}
          className="ml-auto"
        >
          Actualizar
        </Button>
      </div>

      {error && <ErrorNote message={error} />}

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Tile label="Usuarios" value={metrics.users.total} sub={`+${fmt(metrics.users.new)} nuevos en el período`} />
            <Tile label="Activos" value={metrics.users.active} sub="con sesión en el período" />
            <Tile
              label="Clasificados vigentes"
              value={metrics.classifieds.active}
              sub={`+${fmt(metrics.classifieds.new)} nuevos en el período`}
            />
            <Tile
              label="Pendiente de revisar"
              value={metrics.pendingModeration}
              sub={`${fmt(metrics.dealerships.pending)} comercios · ${fmt(metrics.feedback.unread)} comentarios`}
              tone="warn"
            />
            <Tile
              label="Errores"
              value={metrics.errors.api + metrics.errors.webClient + metrics.errors.webServer}
              sub={`${fmt(metrics.errors.api)} API · ${fmt(metrics.errors.webClient + metrics.errors.webServer)} front`}
              tone="warn"
            />
            <Tile label="Comentarios recibidos" value={metrics.feedback.new} sub="en el período" />
          </div>

          <Section
            title={`Actividad ${selected ? `en ${selected.name}` : 'total'}`}
            aside={
              <div className="flex gap-2">
                <FilterChip active={grouping === 'day'} onClick={() => setGrouping('day')}>
                  Por día
                </FilterChip>
                <FilterChip active={grouping === 'week'} onClick={() => setGrouping('week')}>
                  Por semana
                </FilterChip>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BarChart title="Usuarios nuevos" points={series} value={(p) => p.newUsers} unit={grouping === 'week' ? 'semana' : 'día'} />
              <BarChart title="Clasificados nuevos" points={series} value={(p) => p.classifieds} unit={grouping === 'week' ? 'semana' : 'día'} />
              <BarChart title="Errores" points={series} value={(p) => p.errors} unit={grouping === 'week' ? 'semana' : 'día'} />
              <BarChart title="Comentarios de usuarios" points={series} value={(p) => p.feedback} unit={grouping === 'week' ? 'semana' : 'día'} />
            </div>
          </Section>

          <Section title="Por sitio">
            {overview && <SitesTable overview={overview} />}
          </Section>
        </>
      )}

      <FeedbackPanel key={tenant} tenant={tenant} siteName={siteName} siteUrl={siteUrl} onChange={load} />
      <ErrorsPanel key={`${from}|${to}|${tenant}`} from={from} to={to} tenant={tenant} siteName={siteName} />
    </div>
  )
}
