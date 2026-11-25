'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import {
  ClassifiedFacets,
  fuelTypeLabels,
  transmissionLabels,
} from '@/types/classified'
import { useCategories } from './SiteSettingsProvider'
import { formatNumber } from '@/lib/format'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { FilterChip } from './ui/FilterChip'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'year_desc', label: 'Año: más nuevo' },
  { value: 'year_asc', label: 'Año: más viejo' },
  { value: 'mileage_asc', label: 'Menos kilómetros' },
]

const TYPING_DEBOUNCE_MS = 500

/**
 * Search, the active-filter chips and the sort control.
 *
 * Separate from the rail because it belongs to the results column, not the
 * sidebar — the same split the vehicle catalogue makes between VehicleFilters
 * and InventoryToolbar. Every filter the rail can set needs a chip here, or
 * "Limpiar" becomes the only way to undo one and the row misrepresents what is
 * actually applied.
 */
export default function ClassifiedToolbar({ facets }: { facets: ClassifiedFacets }) {
  const categories = useCategories()
  const router = useRouter()
  const searchParams = useSearchParams()

  const current = (key: string) => searchParams.get(key) || ''
  const currentQ = current('q')
  const currentSort = current('sort') || 'newest'

  const [q, setQ] = useState(currentQ)

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      })
      params.delete('page')
      const query = params.toString()
      router.push(query ? `/clasificados?${query}` : '/clasificados')
    },
    [router, searchParams]
  )

  const [prevQ, setPrevQ] = useState(currentQ)
  if (prevQ !== currentQ) {
    setPrevQ(currentQ)
    setQ(currentQ)
  }

  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (q === currentQ) return
    const t = setTimeout(() => update({ q: q.trim() || null }), TYPING_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q, currentQ, update])

  const cur = current('currency') || 'USD'
  const minPrice = current('min_price')
  const maxPrice = current('max_price')
  const minYear = current('min_year')
  const maxYear = current('max_year')

  const range = (from: string, to: string, fmt: (v: string) => string, prefix = '') =>
    from && to
      ? `${prefix}${fmt(from)}–${fmt(to)}`
      : from
        ? `Desde ${prefix}${fmt(from)}`
        : to
          ? `Hasta ${prefix}${fmt(to)}`
          : null

  const chips: { key: string; label: string; clear: Record<string, null> }[] = []
  if (currentQ) chips.push({ key: 'q', label: `“${currentQ}”`, clear: { q: null } })

  const categoryLabel = categories.find((c) => c.key === current('category'))?.label
  if (categoryLabel) chips.push({ key: 'category', label: categoryLabel, clear: { category: null } })

  if (current('department'))
    chips.push({ key: 'department', label: current('department'), clear: { department: null } })
  if (current('city')) chips.push({ key: 'city', label: current('city'), clear: { city: null } })

  const brandLabel = facets.brands.find((b) => b.value === current('brand'))?.label
  if (brandLabel) chips.push({ key: 'brand', label: brandLabel, clear: { brand: null } })

  const yearLabel = range(minYear, maxYear, (v) => v)
  if (yearLabel) chips.push({ key: 'year', label: yearLabel, clear: { min_year: null, max_year: null } })

  if (current('max_mileage')) {
    chips.push({
      key: 'mileage',
      label: `Hasta ${formatNumber(Number(current('max_mileage')))} km`,
      clear: { max_mileage: null },
    })
  }

  if (current('fuel')) {
    chips.push({
      key: 'fuel',
      label: fuelTypeLabels[current('fuel')] || current('fuel'),
      clear: { fuel: null },
    })
  }

  if (current('transmission')) {
    chips.push({
      key: 'transmission',
      label: transmissionLabels[current('transmission')] || current('transmission'),
      clear: { transmission: null },
    })
  }

  const priceLabel = range(minPrice, maxPrice, (v) => formatNumber(Number(v)), `${cur} `)
  if (priceLabel) {
    chips.push({ key: 'price', label: priceLabel, clear: { min_price: null, max_price: null } })
  }

  return (
    <div className="space-y-3 mb-4">
      <Input
        type="search"
        aria-label="Buscar en clasificados"
        placeholder="Buscá por modelo, repuesto o palabra clave…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        iconLeft={<Search size={15} aria-hidden="true" />}
      />

      <div className="iv__toolbar">
        <div className="iv__chips">
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              active
              icon={<X size={13} aria-hidden="true" />}
              onClick={() => update(chip.clear)}
            >
              {chip.label}
            </FilterChip>
          ))}
          {chips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/clasificados')}>
              Limpiar
            </Button>
          )}
        </div>

        <label className="flex items-center gap-2">
          <span className="tm-eyebrow">Ordenar</span>
          <Select
            size="sm"
            aria-label="Ordenar"
            value={currentSort}
            onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })}
            options={SORT_OPTIONS}
          />
        </label>
      </div>
    </div>
  )
}
