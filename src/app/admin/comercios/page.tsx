'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Check, Pause, X } from 'lucide-react'
import {
  DealershipForReview,
  fetchDealershipsForReview,
  reviewDealership,
} from '@/lib/dealerships-api'
import { translateApiError } from '@/lib/api-error'
import { IS_NAUTI } from '@/lib/tenant'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FilterChip } from '../../components/ui/FilterChip'

const TABS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'suspended', label: 'Suspendidas' },
]

function ReviewInner() {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState<DealershipForReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchDealershipsForReview(status)
      setItems(res.data)
      setError(null)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cargar las solicitudes'))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (
    id: string,
    next: 'approved' | 'rejected' | 'suspended'
  ) => {
    setBusyId(id)
    setError(null)
    try {
      const note = notes[id]?.trim()
      await reviewDealership(id, next, {
        note: note || undefined,
        // The applicant sees this one; the note stays internal.
        reason: next === 'rejected' ? note || undefined : undefined,
      })
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos actualizar la solicitud'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
          Comercios
        </h1>
        <p className="text-sm text-muted mt-2">
          {IS_NAUTI
            ? 'Aprobar le da vidriera propia y más fotos por aviso.'
            : 'Aprobar le da vidriera propia, avisos que no vencen y más fotos por vehículo.'}
        </p>
      </div>

      <div className="iv__chips">
        {TABS.map((tab) => (
          <FilterChip key={tab.value} active={status === tab.value} onClick={() => setStatus(tab.value)}>
            {tab.label}
          </FilterChip>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted py-10 text-center">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="iv__empty">
          <h3 className="font-display text-lg font-bold text-ink mb-2">No hay nada acá</h3>
          <p className="text-sm text-muted">Ninguna solicitud en este estado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => (
            <div key={d.id} className="bg-surface border border-line rounded-[var(--radius-lg)] p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold text-ink">{d.name}</h2>
                  <p className="text-xs text-muted font-mono">/comercios/{d.slug}</p>
                  <p className="text-sm text-muted mt-1">
                    {d.userName} · {d.userEmail}
                  </p>
                </div>
                <span className="tm-eyebrow">{d.status}</span>
              </div>

              {d.description && <p className="text-sm text-body">{d.description}</p>}

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                {[
                  ['Ciudad', d.city],
                  ['Dirección', d.address],
                  ['Teléfono', d.phone],
                  ['WhatsApp', d.whatsapp],
                  ['Sitio', d.website],
                  ['Horarios', d.hours],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="tm-eyebrow">{label}</dt>
                      <dd className="text-ink truncate">{value}</dd>
                    </div>
                  ))}
              </dl>

              <Input
                label="Nota"
                type="text"
                value={notes[d.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                placeholder="Al rechazar, esto es lo que ve el solicitante"
                hint="En aprobación y suspensión queda como nota interna."
              />

              <div className="flex flex-wrap gap-2">
                {d.status !== 'approved' && (
                  <Button
                    size="sm"
                    disabled={busyId === d.id}
                    iconLeft={<Check size={14} aria-hidden="true" />}
                    onClick={() => act(d.id, 'approved')}
                  >
                    Aprobar
                  </Button>
                )}
                {d.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === d.id}
                    iconLeft={<X size={14} aria-hidden="true" />}
                    onClick={() => act(d.id, 'rejected')}
                  >
                    Rechazar
                  </Button>
                )}
                {d.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="[--_fg:var(--danger)]"
                    disabled={busyId === d.id}
                    iconLeft={<Pause size={14} aria-hidden="true" />}
                    onClick={() => act(d.id, 'suspended')}
                  >
                    Suspender
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// The session and the operator check live in the /admin layout now.
export default function ReviewDealershipsPage() {
  return <ReviewInner />
}
