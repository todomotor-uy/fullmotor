'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { PaginatedClassifieds } from '@/types/classified'
import { fetchClassifieds } from '@/lib/classifieds-api'
import { translateApiError } from '@/lib/api-error'
import ClassifiedList from '../../components/ClassifiedList'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'year_desc', label: 'Año: más nuevo' },
  { value: 'mileage_asc', label: 'Menos kilómetros' },
]

const TYPING_DEBOUNCE_MS = 400
const PAGE_SIZE = 12

interface Props {
  slug: string
  initial: PaginatedClassifieds
  /** Rendered until the visitor touches anything, so the SSR markup stands. */
  fallback: React.ReactNode
}

/**
 * The storefront inventory.
 *
 * Starts as the server-rendered list — crawlers and first paint see real stock
 * without waiting on JavaScript — and only takes over once someone searches,
 * sorts or pages. Keeping the query in local state rather than the URL is
 * deliberate: the storefront is ISR with generateStaticParams, and putting
 * searchParams in it would make the whole page dynamic.
 */
export default function DealershipInventory({ slug, initial, fallback }: Props) {
  const [touched, setTouched] = useState(false)
  const [q, setQ] = useState('')
  const [appliedQ, setAppliedQ] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setAppliedQ(q.trim()), TYPING_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q])

  // Render-phase reset rather than an effect: changing the query invalidates
  // the page number, and doing it here avoids a render with a stale page.
  const filterKey = `${appliedQ}|${sort}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey)
    setPage(1)
  }

  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    let cancelled = false
    // setLoading lives in the promise callbacks, not here: a synchronous
    // setState in an effect body triggers a cascading render.
    fetchClassifieds({
      dealership: slug,
      limit: PAGE_SIZE,
      page,
      q: appliedQ || undefined,
      sort: sort === 'newest' ? undefined : sort,
    })
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setError(null)
          setTouched(true)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(translateApiError(err, 'Error al cargar el inventario'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, appliedQ, sort, page])

  const lastPage = Math.max(1, data.meta.lastPage)

  return (
    <div className="space-y-4">
      <div className="iv__toolbar">
        <div className="flex-1 min-w-60">
          <Input
            type="search"
            aria-label="Buscar en el inventario"
            placeholder="Buscá dentro de este comercio…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            iconLeft={<Search size={15} aria-hidden="true" />}
          />
        </div>
        <label className="flex items-center gap-2">
          <span className="tm-eyebrow">Ordenar</span>
          <Select
            size="sm"
            aria-label="Ordenar"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            options={SORT_OPTIONS}
          />
        </label>
      </div>

      <p className="text-sm text-muted">
        <span className="font-mono text-ink">{data.meta.total}</span>{' '}
        {data.meta.total === 1 ? 'vehículo publicado' : 'vehículos publicados'}
      </p>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
          {error}
        </div>
      )}

      {!touched ? (
        fallback
      ) : (
        <ClassifiedList
          classifieds={data.data}
          emptyTitle="No encontramos vehículos con eso"
          emptyDescription="Probá con otra palabra o mirá todo el inventario."
        />
      )}

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
