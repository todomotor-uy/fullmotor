'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle, Pause, Pencil, Play, RefreshCw, Trash2 } from 'lucide-react'
import { Classified, ClassifiedStatus, isExpired, isRenewable } from '@/types/classified'
import { formatDate } from '@/lib/format'
import { deleteClassified, renewClassified, updateClassified } from '@/lib/classifieds-api'
import { translateApiError } from '@/lib/api-error'
import { useAuth } from './AuthProvider'
import { Button, ButtonLink } from './ui/Button'
import StatusBadge from './StatusBadge'

interface OwnerActionsProps {
  classified: Classified
}

export default function OwnerActions({ classified }: OwnerActionsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<ClassifiedStatus>(classified.status)
  const [expiresAt, setExpiresAt] = useState(classified.expiresAt)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only render for the owner
  if (!user || user.id !== classified.userId) {
    return null
  }

  const current = { expiresAt, neverExpires: classified.neverExpires }
  const expired = isExpired(current)
  const renewable = isRenewable(current)

  const handleRenew = async () => {
    setBusy(true)
    setError(null)
    try {
      const updated = await renewClassified(classified.id)
      setExpiresAt(updated.expiresAt)
      setStatus(updated.status)
      router.refresh()
    } catch (err) {
      setError(translateApiError(err, 'Error al renovar'))
    } finally {
      setBusy(false)
    }
  }

  const handleStatusChange = async (next: ClassifiedStatus) => {
    if (next === status) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updateClassified(classified.id, { status: next })
      setStatus(updated.status)
      router.refresh()
    } catch (err) {
      const message = translateApiError(err, 'Error al actualizar estado')
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) return
    setBusy(true)
    setError(null)
    try {
      await deleteClassified(classified.id)
      router.push('/clasificados/mis')
    } catch (err) {
      const message = translateApiError(err, 'Error al eliminar')
      setError(message)
      setBusy(false)
    }
  }

  return (
    <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="tm-eyebrow">Tus acciones</h3>
        <StatusBadge status={status} expiresAt={expiresAt} neverExpires={classified.neverExpires} />
      </div>

      <p className="text-xs text-muted">
        {classified.neverExpires ? (
          'Tu aviso no vence: queda publicado mientras lo dejes activo.'
        ) : (
          <>
            {expired ? 'Venció el ' : 'Vence el '}
            <span className="font-mono text-ink">{formatDate(expiresAt)}</span>
            {expired && '. Renovala para que vuelva a aparecer en el listado.'}
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        <ButtonLink
          href={`/clasificados/${classified.id}/editar`}
          variant="secondary"
          size="sm"
          iconLeft={<Pencil size={14} aria-hidden="true" />}
        >
          Editar
        </ButtonLink>

        {/*
          An expired listing is filtered out of the marketplace by expires_at, so
          "Reactivá" alone would look like it did nothing — it only writes
          status. While the listing is expired, renewing is the action that
          actually brings it back, and it reactivates at the same time.
        */}
        {renewable && (
          <Button
            variant={expired ? 'primary' : 'secondary'}
            size="sm"
            disabled={busy}
            iconLeft={<RefreshCw size={14} aria-hidden="true" />}
            onClick={handleRenew}
          >
            {expired ? 'Volvé a publicarla' : 'Renovala 30 días'}
          </Button>
        )}

        {!expired && status === 'active' && (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            iconLeft={<Pause size={14} aria-hidden="true" />}
            onClick={() => handleStatusChange('paused')}
          >
            Pausá
          </Button>
        )}
        {!expired && status !== 'active' && (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            iconLeft={<Play size={14} aria-hidden="true" />}
            onClick={() => handleStatusChange('active')}
          >
            Reactivá
          </Button>
        )}
        {status !== 'sold' && (
          <Button
            variant="soft"
            size="sm"
            disabled={busy}
            iconLeft={<CheckCircle size={14} aria-hidden="true" />}
            onClick={() => handleStatusChange('sold')}
          >
            Marcá como vendido
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="ml-auto [--_fg:var(--danger)]"
          iconLeft={<Trash2 size={14} aria-hidden="true" />}
          onClick={handleDelete}
        >
          Eliminar
        </Button>
      </div>

      {classified.contactInfo && !classified.showContactInfo && (
        <p className="text-xs text-muted border-t border-line pt-3">
          Contacto privado: <span className="font-mono text-ink">{classified.contactInfo}</span>
        </p>
      )}

      {error && <p className="text-sm text-danger-ink">{error}</p>}
    </div>
  )
}
