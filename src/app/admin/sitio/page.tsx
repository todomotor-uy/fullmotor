'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { fetchSiteSettings, updateSiteSettings, type AdminSiteSettings } from '@/lib/ops-api'
import { MODULES, type CategoryOption, type ModuleName } from '@/lib/site-settings'
import { translateApiError } from '@/lib/api-error'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface CategoryRow extends CategoryOption {
  /** A key already saved: listings may carry it, so it cannot be renamed. */
  saved: boolean
  /** The key was typed by hand; stop deriving it from the label. */
  keyTouched: boolean
  rowId: string
}

/** "Amarres y guarderías" → "amarres_y_guarderias", the API's key format. */
function keyFromLabel(label: string): string {
  const k = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/_+$/, '')
  return k.slice(0, 30)
}

let nextRow = 0
const rowId = () => `row-${nextRow++}`

function toRows(categories: CategoryOption[]): CategoryRow[] {
  return categories.map((c) => ({ ...c, saved: true, keyTouched: true, rowId: rowId() }))
}

function Checkbox({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label className={`flex items-start gap-2 text-sm text-body ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 accent-[var(--accent)]"
      />
      <span>{children}</span>
    </label>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-[var(--radius-lg)] p-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export default function SiteSettingsPage() {
  const [loaded, setLoaded] = useState<AdminSiteSettings | null>(null)
  const [modules, setModules] = useState<ModuleName[]>([])
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [listingDays, setListingDays] = useState('30')
  const [storefrontNeverExpire, setStorefrontNeverExpire] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const apply = (s: AdminSiteSettings) => {
    setLoaded(s)
    setModules(s.modules)
    setRows(toRows(s.categories))
    setListingDays(String(s.listingDays))
    setStorefrontNeverExpire(s.storefrontListingsNeverExpire)
  }

  useEffect(() => {
    fetchSiteSettings()
      .then(apply)
      .catch((err) => setError(translateApiError(err, 'No pudimos cargar la configuración del sitio')))
  }, [])

  const payload = useMemo(
    () => ({
      modules,
      categories: rows.map(({ key, label, neverExpires, vehicleFields }) => ({
        key: key.trim(),
        label: label.trim(),
        ...(neverExpires ? { neverExpires: true } : {}),
        ...(vehicleFields ? { vehicleFields: true } : {}),
      })),
      listingDays: Number(listingDays),
      storefrontListingsNeverExpire: storefrontNeverExpire,
    }),
    [modules, rows, listingDays, storefrontNeverExpire]
  )

  const dirty = useMemo(() => {
    if (!loaded) return false
    const before = {
      modules: loaded.modules,
      categories: loaded.categories.map(({ key, label, neverExpires, vehicleFields }) => ({
        key,
        label,
        ...(neverExpires ? { neverExpires: true } : {}),
        ...(vehicleFields ? { vehicleFields: true } : {}),
      })),
      listingDays: loaded.listingDays,
      storefrontListingsNeverExpire: loaded.storefrontListingsNeverExpire,
    }
    return JSON.stringify(before) !== JSON.stringify(payload)
  }, [loaded, payload])

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {error ? (
          <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </div>
        ) : (
          <p className="text-sm text-muted">Cargando…</p>
        )}
      </div>
    )
  }

  const usage = (key: string) => loaded.categoryUsage[key] ?? 0
  const on = (m: ModuleName) => modules.includes(m)
  const toggleModule = (m: ModuleName, value: boolean) =>
    setModules((prev) => (value ? [...prev, m] : prev.filter((x) => x !== m)))
  const updateRow = (id: string, patch: Partial<CategoryRow>) =>
    setRows((prev) => prev.map((r) => (r.rowId === id ? { ...r, ...patch } : r)))
  const move = (index: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev]
      const [row] = next.splice(index, 1)
      next.splice(index + delta, 0, row)
      return next
    })

  const handleSave = async () => {
    setError(null)
    setSaved(false)
    const days = Number(listingDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError('La duración de los avisos tiene que ser entre 1 y 365 días.')
      return
    }
    if (rows.length === 0) {
      setError('El sitio necesita al menos un rubro.')
      return
    }
    if (rows.some((r) => !r.label.trim() || !r.key.trim())) {
      setError('Cada rubro necesita un nombre y una clave.')
      return
    }
    setSaving(true)
    try {
      apply(await updateSiteSettings(payload))
      setSaved(true)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos guardar la configuración'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
          {loaded.name}
        </h1>
        <p className="text-sm text-muted mt-1">
          Qué secciones tiene el sitio y cómo funcionan sus clasificados. Los cambios se ven enseguida, sin
          publicar una versión nueva.
        </p>
      </div>

      <Card
        title="Módulos"
        hint="Un módulo apagado desaparece del menú y sus páginas dan 404. No se borra nada: si lo volvés a prender, está todo como estaba."
      >
        <div className="space-y-3">
          {MODULES.filter((m) => loaded.availableModules.includes(m.id)).map((m) => (
            <Checkbox key={m.id} checked={on(m.id)} onChange={(v) => toggleModule(m.id, v)}>
              <span className="font-semibold text-ink">{m.label}</span>
              <span className="block text-xs text-muted">{m.description}</span>
            </Checkbox>
          ))}
        </div>
      </Card>

      <Card title="Vencimiento de los avisos">
        <div className="max-w-[200px]">
          <Input
            label="Días que dura un aviso"
            type="number"
            min={1}
            max={365}
            value={listingDays}
            onChange={(e) => setListingDays(e.target.value)}
            hint="También lo que suma una renovación."
          />
        </div>
        <Checkbox checked={storefrontNeverExpire} onChange={setStorefrontNeverExpire} disabled={!on('storefronts')}>
          Los avisos de los comercios aprobados no vencen
        </Checkbox>
      </Card>

      <Card
        title="Rubros"
        hint="Los rubros en los que se publican los clasificados, en el orden en que se muestran. La clave va en la dirección (/clasificados?category=…) y no se puede cambiar una vez guardada."
      >
        <div className="space-y-3">
          {rows.map((r, i) => {
            const n = usage(r.key)
            return (
              <div key={r.rowId} className="border border-line rounded-[var(--radius-md)] p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
                  <Input
                    label="Nombre"
                    value={r.label}
                    maxLength={60}
                    onChange={(e) =>
                      updateRow(r.rowId, {
                        label: e.target.value,
                        ...(r.keyTouched ? {} : { key: keyFromLabel(e.target.value) }),
                      })
                    }
                  />
                  {r.saved ? (
                    <div>
                      <p className="tm-field__label mb-2">Clave</p>
                      <p className="font-mono text-sm text-body py-2">{r.key}</p>
                    </div>
                  ) : (
                    <Input
                      label="Clave"
                      value={r.key}
                      maxLength={30}
                      className="[&_input]:font-mono"
                      onChange={(e) => updateRow(r.rowId, { key: e.target.value, keyTouched: true })}
                    />
                  )}
                  <div className="flex gap-1 pb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      iconLeft={<ArrowUp size={15} aria-hidden="true" />}
                      aria-label={`Subir ${r.label}`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      iconLeft={<ArrowDown size={15} aria-hidden="true" />}
                      aria-label={`Bajar ${r.label}`}
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, 1)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      iconLeft={<Trash2 size={15} aria-hidden="true" />}
                      aria-label={`Quitar ${r.label}`}
                      title={n > 0 ? `Tiene ${n} aviso${n === 1 ? '' : 's'}: no se puede quitar` : undefined}
                      disabled={n > 0}
                      onClick={() => setRows((prev) => prev.filter((x) => x.rowId !== r.rowId))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                  <Checkbox checked={!!r.neverExpires} onChange={(v) => updateRow(r.rowId, { neverExpires: v })}>
                    No vence
                  </Checkbox>
                  <Checkbox checked={!!r.vehicleFields} onChange={(v) => updateRow(r.rowId, { vehicleFields: v })}>
                    Pide año, kilómetros, marca y modelo
                  </Checkbox>
                  {n > 0 && <span className="text-xs text-muted">{n} aviso{n === 1 ? '' : 's'}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={15} aria-hidden="true" />}
          onClick={() =>
            setRows((prev) => [...prev, { key: '', label: '', saved: false, keyTouched: false, rowId: rowId() }])
          }
        >
          Agregar rubro
        </Button>
        <p className="text-xs text-muted">
          “No vence” y la duración de los avisos se aplican a lo que se publique desde ahora; los avisos que ya
          están publicados mantienen su vencimiento.
        </p>
      </Card>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}
      {saved && !dirty && (
        <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-sunken text-sm text-body">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-accent" aria-hidden="true" />
          Guardamos los cambios.
        </div>
      )}

      <Button onClick={handleSave} loading={saving} disabled={!dirty}>
        Guardá los cambios
      </Button>
    </div>
  )
}
