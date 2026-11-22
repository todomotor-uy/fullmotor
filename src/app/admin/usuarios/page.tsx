'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Ban, Search, ShieldCheck, Undo2 } from 'lucide-react'
import {
  AdminUser,
  UserSummary,
  fetchUsers,
  setUserRole,
  setUserSuspended,
} from '@/lib/ops-api'
import { ROLES, ROLE_LABELS, type Role } from '@/lib/permissions'
import { useAuth } from '../../components/AuthProvider'
import { Select } from '../../components/ui/Select'
import { translateApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FilterChip } from '../../components/ui/FilterChip'

const TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'suspended', label: 'Dados de baja' },
]

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-4">
      <p className="tm-eyebrow">{label}</p>
      <p className="font-display text-2xl font-bold text-ink mt-1">
        {value === undefined ? '—' : value}
      </p>
    </div>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  // Separate from `query` so the list reloads on a debounce rather than on
  // every keystroke — one request per letter typed into a search box is how a
  // moderation screen ends up rate-limited against itself.
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<AdminUser[]>([])
  const [summary, setSummary] = useState<UserSummary | undefined>()
  const [total, setTotal] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchUsers({ status, q: search || undefined, limit: 50 })
      setItems(res.data)
      setSummary(res.summary)
      setTotal(res.meta.total)
      setError(null)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cargar los usuarios'))
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (user: AdminUser, suspended: boolean) => {
    if (suspended) {
      const reason = reasons[user.id]?.trim()
      const warning = [
        `Dar de baja a ${user.name} (${user.email}).`,
        '',
        'Sus avisos salen del listado, su vidriera deja de resolver y sus comentarios',
        'pasan a verse como eliminados. No se borra nada: reactivándolo vuelve todo.',
        reason ? `\nMotivo que va a ver: ${reason}` : '\nSin motivo: va a ver el mensaje genérico.',
      ].join('\n')
      if (!window.confirm(warning)) return
    }

    setBusyId(user.id)
    setError(null)
    try {
      await setUserSuspended(user.id, suspended, reasons[user.id]?.trim() || undefined)
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos actualizar la cuenta'))
    } finally {
      setBusyId(null)
    }
  }

  const changeRole = async (user: AdminUser, role: Role) => {
    if (role === user.role) return
    if (role === 'admin' && !window.confirm(`Hacer administrador a ${user.name} (${user.email}).\n\nVa a poder gestionar todo el sitio, incluidos los usuarios y sus roles.`)) return
    setBusyId(user.id)
    setError(null)
    try {
      await setUserRole(user.id, role)
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cambiar el rol'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
          Usuarios
        </h1>
        <p className="text-sm text-muted mt-2">
          La baja es lógica y reversible: oculta lo que la cuenta publicó, no lo borra.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total" value={summary?.total} />
        <Stat label="Activos" value={summary?.active} />
        <Stat label="De baja" value={summary?.suspended} />
        <Stat label="Nuevos (30 días)" value={summary?.newLast30Days} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="iv__chips">
          {TABS.map((tab) => (
            <FilterChip key={tab.value} active={status === tab.value} onClick={() => setStatus(tab.value)}>
              {tab.label}
            </FilterChip>
          ))}
        </div>
        <Input
          className="flex-1 min-w-[220px]"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email"
          iconLeft={<Search size={16} aria-hidden="true" />}
          aria-label="Buscar usuarios"
        />
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
          <p className="text-sm text-muted">Ninguna cuenta con estos filtros.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">
            {total} {total === 1 ? 'cuenta' : 'cuentas'} con estos filtros.
          </p>

          <div className="space-y-3">
            {items.map((u) => (
              <div
                key={u.id}
                className="bg-surface border border-line rounded-[var(--radius-lg)] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                      {u.name}
                      {(u.role === 'admin' || u.superAdmin) && (
                        <ShieldCheck size={16} className="text-accent" aria-label="Administrador" />
                      )}
                      {u.superAdmin && <span className="tm-eyebrow">Superadmin</span>}
                    </h2>
                    <p className="text-sm text-muted">{u.email}</p>
                    <p className="text-xs text-muted mt-1">
                      Alta {formatDate(u.createdAt)} · {u.classifiedsCount}{' '}
                      {u.classifiedsCount === 1 ? 'aviso' : 'avisos'} · {u.commentsCount}{' '}
                      {u.commentsCount === 1 ? 'comentario' : 'comentarios'}
                      {u.dealershipName && ` · ${u.dealershipName} (${u.dealershipStatus})`}
                    </p>
                  </div>
                  {u.suspended && (
                    <span className="tm-eyebrow text-danger-ink">
                      De baja {u.suspendedAt ? formatDate(u.suspendedAt) : ''}
                    </span>
                  )}
                </div>

                {/* Roles are per site. A super admin's comes from the
                    server's configuration and nobody changes their own, so
                    neither gets a picker. */}
                {u.superAdmin ? (
                  <p className="text-xs text-muted">Administrador de todos los sitios.</p>
                ) : u.id === me?.id ? (
                  <p className="text-xs text-muted">Rol: {ROLE_LABELS[u.role] ?? u.role} (es tu cuenta)</p>
                ) : (
                  <div className="max-w-xs">
                    <Select
                      label="Rol"
                      size="sm"
                      value={u.role}
                      disabled={busyId === u.id}
                      options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                    />
                  </div>
                )}

                {u.suspended && u.suspendedReason && (
                  <p className="text-sm text-body">Motivo: {u.suspendedReason}</p>
                )}

                {u.role === 'admin' || u.superAdmin ? (
                  <p className="text-xs text-muted">
                    Una cuenta admin no se puede dar de baja desde acá: la suspensión se
                    aplica en el mismo middleware que protege este panel, así que nadie
                    podría volver a entrar a deshacerlo.
                  </p>
                ) : (
                  <>
                    {!u.suspended && (
                      <Input
                        label="Motivo"
                        type="text"
                        value={reasons[u.id] ?? ''}
                        onChange={(e) => setReasons((r) => ({ ...r, [u.id]: e.target.value }))}
                        placeholder="Lo ve al intentar entrar de nuevo"
                        hint="Opcional. Es lo único que se le comunica."
                      />
                    )}

                    <div className="flex flex-wrap gap-2">
                      {u.suspended ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === u.id}
                          iconLeft={<Undo2 size={14} aria-hidden="true" />}
                          onClick={() => act(u, false)}
                        >
                          Reactivar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="[--_fg:var(--danger)]"
                          disabled={busyId === u.id}
                          iconLeft={<Ban size={14} aria-hidden="true" />}
                          onClick={() => act(u, true)}
                        >
                          Dar de baja
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
