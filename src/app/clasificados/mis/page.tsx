'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Store } from 'lucide-react'
import { Classified } from '@/types/classified'
import { fetchMyClassifieds } from '@/lib/classifieds-api'
import { useAuth } from '../../components/AuthProvider'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FilterChip } from '../../components/ui/FilterChip'
import RequireAuth from '../../components/RequireAuth'
import ClassifiedList from '../../components/ClassifiedList'
import { translateApiError } from '@/lib/api-error'

const PAGE_SIZE = 24

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'sold', label: 'Vendidos' },
  { value: 'expired', label: 'Vencidos' },
]

const TYPING_DEBOUNCE_MS = 400

function MyClassifiedsInner() {
  const { user } = useAuth()
  const [classifieds, setClassifieds] = useState<Classified[]>([])
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setAppliedQ(q.trim()), TYPING_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q])

  // Any change to the filters invalidates the page number.
  useEffect(() => {
    setPage(1)
  }, [status, appliedQ])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetchMyClassifieds({
        page,
        limit: PAGE_SIZE,
        status: status || undefined,
        q: appliedQ || undefined,
      })
      setClassifieds(res.data)
      setTotal(res.meta.total)
      setLastPage(Math.max(1, res.meta.lastPage))
      setError(null)
    } catch (err) {
      setError(translateApiError(err, 'Error al cargar'))
    } finally {
      setLoading(false)
    }
  }, [user, page, status, appliedQ])

  useEffect(() => {
    let cancelled = false
    void load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const dealership = user?.dealership
  const filtering = Boolean(status || appliedQ)

  return (
    <div className="iv pb-16 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="iv__title">Mis clasificados</h1>
          <p className="iv__count">
            <span className="font-mono">{total}</span> en total, incluyendo vencidos, pausados y vendidos
          </p>
        </div>
        <div className="flex gap-2">
          {dealership?.status === 'approved' && (
            <ButtonLink
              href="/comercios/panel"
              variant="secondary"
              iconLeft={<Store size={16} aria-hidden="true" />}
            >
              Mi comercio
            </ButtonLink>
          )}
          <ButtonLink href="/clasificados/nuevo" iconLeft={<Plus size={16} aria-hidden="true" />}>
            Publicá tu aviso
          </ButtonLink>
        </div>
      </div>

      {/* Without a link here, an applicant has no way back to their own
          application to see whether it was reviewed. */}
      {dealership && dealership.status !== 'approved' && (
        <div className="p-4 rounded-[var(--radius-md)] bg-sunken text-sm text-body">
          {dealership.status === 'pending' && (
            <>
              Tu solicitud de comercio está en revisión. Te avisamos acá cuando esté resuelta.
            </>
          )}
          {dealership.status === 'rejected' && (
            <>
              Tu solicitud de comercio fue rechazada
              {dealership.rejectionReason ? `: ${dealership.rejectionReason}` : '.'}{' '}
              <Link href="/comercios/solicitar" className="text-accent underline">
                Volvé a intentarlo
              </Link>
            </>
          )}
          {dealership.status === 'suspended' && (
            <>Tu cuenta de comercio está suspendida. Escribinos si creés que es un error.</>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Input
          type="search"
          aria-label="Buscar en tus avisos"
          placeholder="Buscá entre tus avisos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          iconLeft={<Search size={15} aria-hidden="true" />}
        />
        <div className="iv__chips">
          {STATUS_TABS.map((tab) => (
            <FilterChip
              key={tab.value || 'all'}
              active={status === tab.value}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="iv__grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="iv__skel">
              <div className="m" />
              <div className="b">
                <div className="l" />
                <div className="l l--w60" />
                <div className="l l--w40" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ClassifiedList
          classifieds={classifieds}
          showStatus
          {...(filtering
            ? {
                emptyTitle: 'Ningún aviso tuyo coincide',
                emptyDescription: 'Probá con otro estado o limpiando la búsqueda.',
              }
            : {
                emptyTitle: 'Todavía no publicaste nada',
                emptyDescription: 'Creá tu primer aviso y conectá con compradores.',
                emptyCta: { label: 'Publicá tu primer aviso', href: '/clasificados/nuevo' },
              })}
        />
      )}

      {/* Pagination, not a hardcoded limit of 50. A dealership with eighty
          vehicles used to see fifty of them and no indication of the rest. */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Página {page} de {lastPage}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === lastPage || loading}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}

export default function MyClassifiedsPage() {
  return (
    <RequireAuth>
      <MyClassifiedsInner />
    </RequireAuth>
  )
}
