'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import {
  CLASSIFIED_CATEGORIES,
  ClassifiedCategory,
  ClassifiedFacets,
  fuelTypeLabels,
  transmissionLabels,
} from '@/types/classified'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { IS_NAUTI } from '@/lib/tenant'

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'UYU', label: 'UYU' },
]

/**
 * Long enough that typing a year is one request instead of four, short enough
 * that the list still feels live.
 */
const TYPING_DEBOUNCE_MS = 500

/**
 * The filter rail.
 *
 * Moved out of the inline row it used to be: eleven controls will not fit
 * across the top without pushing every listing below the fold. This is the
 * `iv__filters` sidebar the vehicle catalogue already uses — sticky from
 * 1000px up, stacked below it — so it inherits the responsive behaviour rather
 * than inventing a second layout. Under 1000px it collapses behind a button,
 * because stacked it would still fill a phone screen on its own.
 */
export default function ClassifiedFilters({ facets }: { facets: ClassifiedFacets }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const current = (key: string) => searchParams.get(key) || ''
  const currentCategory = current('category') as ClassifiedCategory | ''

  const [panelOpen, setPanelOpen] = useState(false)
  const [city, setCity] = useState(current('city'))
  const [minPrice, setMinPrice] = useState(current('min_price'))
  const [maxPrice, setMaxPrice] = useState(current('max_price'))
  const [minYear, setMinYear] = useState(current('min_year'))
  const [maxYear, setMaxYear] = useState(current('max_year'))
  const [maxMileage, setMaxMileage] = useState(current('max_mileage'))

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      })
      // Any change to the result set invalidates the page number.
      params.delete('page')
      const query = params.toString()
      router.push(query ? `/clasificados?${query}` : '/clasificados')
    },
    [router, searchParams]
  )

  // Adopt external URL changes — back button, "Limpiar", a chip removed from
  // the toolbar — into the free-text inputs.
  const urlKey = [
    current('city'),
    current('min_price'),
    current('max_price'),
    current('min_year'),
    current('max_year'),
    current('max_mileage'),
  ].join('|')
  const [prevUrlKey, setPrevUrlKey] = useState(urlKey)
  if (prevUrlKey !== urlKey) {
    setPrevUrlKey(urlKey)
    setCity(current('city'))
    setMinPrice(current('min_price'))
    setMaxPrice(current('max_price'))
    setMinYear(current('min_year'))
    setMaxYear(current('max_year'))
    setMaxMileage(current('max_mileage'))
  }

  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const typed = [city, minPrice, maxPrice, minYear, maxYear, maxMileage].join('|')
    if (typed === urlKey) return

    const t = setTimeout(() => {
      update({
        city: city.trim() || null,
        min_price: minPrice || null,
        max_price: maxPrice || null,
        min_year: minYear || null,
        max_year: maxYear || null,
        max_mileage: maxMileage || null,
      })
    }, TYPING_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [city, minPrice, maxPrice, minYear, maxYear, maxMileage, urlKey, update])

  // Year, mileage and brand only describe vehicles, so they are hidden on
  // repuestos and accesorios where every listing would match anything.
  // Nauti has no vehicle categories, so none of these apply there.
  const showsVehicleFilters =
    !IS_NAUTI &&
    (currentCategory === '' || ['cars', 'motorcycles', 'trucks'].includes(currentCategory))

  return (
    <>
      {/* md:hidden goes on a wrapper: components.css loads after Tailwind, so
          .tm-btn's display would beat the utility on the button itself. */}
      <div className="lg:hidden mb-3">
        <Button
          variant="secondary"
          block
          aria-expanded={panelOpen}
          iconLeft={<SlidersHorizontal size={15} aria-hidden="true" />}
          onClick={() => setPanelOpen((v) => !v)}
        >
          {panelOpen ? 'Ocultar filtros' : 'Filtros'}
        </Button>
      </div>

      <aside className={`iv__filters ${panelOpen ? '' : 'hidden lg:flex'}`}>
        <div className="fgroup">
          <h4>Categoría</h4>
          <div className="fcat">
            <button
              type="button"
              className={currentCategory === '' ? 'on' : ''}
              onClick={() => update({ category: null })}
            >
              Todas
            </button>
            {CLASSIFIED_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={currentCategory === c.id ? 'on' : ''}
                onClick={() => update({ category: c.id })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fgroup">
          <h4>Ciudad</h4>
          <div className="fprice">
            <input
              type="text"
              aria-label="Ciudad"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej. Montevideo"
            />
          </div>
        </div>

        {showsVehicleFilters && (
          <>
            <div className="fgroup">
              <h4>Marca</h4>
              <Select
                size="sm"
                aria-label="Marca"
                value={current('brand')}
                onChange={(e) => update({ brand: e.target.value || null })}
                placeholder="Todas"
                options={facets.brands}
              />
            </div>

            <div className="fgroup">
              <h4>Año</h4>
              <div className="fprice">
                <input
                  type="number"
                  aria-label="Año desde"
                  value={minYear}
                  onChange={(e) => setMinYear(e.target.value)}
                  placeholder="Desde"
                />
                <span>—</span>
                <input
                  type="number"
                  aria-label="Año hasta"
                  value={maxYear}
                  onChange={(e) => setMaxYear(e.target.value)}
                  placeholder="Hasta"
                />
              </div>
            </div>

            <div className="fgroup">
              <h4>Kilometraje</h4>
              <div className="fprice">
                <input
                  type="number"
                  aria-label="Kilometraje máximo"
                  value={maxMileage}
                  onChange={(e) => setMaxMileage(e.target.value)}
                  placeholder="Hasta"
                />
              </div>
            </div>

            <div className="fgroup">
              <h4>Combustible</h4>
              <Select
                size="sm"
                aria-label="Combustible"
                value={current('fuel')}
                onChange={(e) => update({ fuel: e.target.value || null })}
                placeholder="Todos"
                options={facets.fuelTypes.map((v) => ({ value: v, label: fuelTypeLabels[v] || v }))}
              />
            </div>

            <div className="fgroup">
              <h4>Transmisión</h4>
              <Select
                size="sm"
                aria-label="Transmisión"
                value={current('transmission')}
                onChange={(e) => update({ transmission: e.target.value || null })}
                placeholder="Todas"
                options={facets.transmissions.map((v) => ({
                  value: v,
                  label: transmissionLabels[v] || v,
                }))}
              />
            </div>
          </>
        )}

        <div className="fgroup">
          <h4>Precio</h4>
          <div className="fprice">
            <input
              type="number"
              aria-label="Precio desde"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Desde"
            />
            <span>—</span>
            <input
              type="number"
              aria-label="Precio hasta"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Hasta"
            />
          </div>
          <div className="mt-2">
            <Select
              size="sm"
              aria-label="Moneda"
              value={current('currency')}
              onChange={(e) => update({ currency: e.target.value || null })}
              placeholder="USD"
              options={CURRENCIES}
            />
            <p className="text-xs text-muted mt-1">El precio se compara dentro de una moneda.</p>
          </div>
        </div>
      </aside>
    </>
  )
}
