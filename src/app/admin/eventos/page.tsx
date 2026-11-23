'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  AdminBlogPost,
  AdminEventRow,
  EventInput,
  createEvent,
  deleteEvent,
  fetchBlogPosts,
  fetchEventsAdmin,
  updateEvent,
} from '@/lib/ops-api'
import { translateApiError } from '@/lib/api-error'
import { EVENTS_TZ, eventWhen } from '@/lib/events'
import { fetchTagSuggestions, type TagCount } from '@/lib/blog-tags'
import { tenantHeader } from '@/lib/tenant'
import type { SiteEvent } from '@/types/event'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { FilterChip } from '../../components/ui/FilterChip'

/** Uruguay has had no daylight saving since 2015, so local time is UTC-3. */
const UY_OFFSET = '-03:00'

interface FormState {
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  city: string
  url: string
  coverImage: string
  tags: string
  description: string
  blogPostSlug: string
}

const EMPTY: FormState = {
  title: '', startDate: '', startTime: '', endDate: '', endTime: '',
  location: '', city: '', url: '', coverImage: '', tags: '', description: '', blogPostSlug: '',
}

const localParts = (iso: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENTS_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

function toForm(row: AdminEventRow): FormState {
  const e = row.event
  const start = e.allDay ? { date: e.startsAt.slice(0, 10), time: '' } : localParts(e.startsAt)
  const end = e.endsAt ? (e.allDay ? { date: e.endsAt.slice(0, 10), time: '' } : localParts(e.endsAt)) : { date: '', time: '' }
  return {
    title: e.title,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date === start.date && !end.time ? '' : end.date,
    endTime: end.time,
    location: e.location ?? '',
    city: e.city ?? '',
    url: e.url ?? '',
    coverImage: e.coverImage ?? '',
    tags: e.tags.join(', '),
    description: e.description ?? '',
    blogPostSlug: row.blogPostSlug ?? '',
  }
}

/**
 * The form's dates become the API's instants: with no start time the event
 * is all-day and travels as plain dates; otherwise as Montevideo times.
 */
function toInput(f: FormState): EventInput {
  const allDay = !f.startTime
  const at = (date: string, time: string) => (allDay ? date : `${date}T${time || '00:00'}:00${UY_OFFSET}`)
  const endDate = f.endDate || (f.endTime ? f.startDate : '')
  return {
    title: f.title.trim(),
    startsAt: at(f.startDate, f.startTime),
    endsAt: endDate ? at(endDate, f.endTime) : '',
    allDay,
    location: f.location,
    city: f.city,
    url: f.url,
    coverImage: f.coverImage,
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
    description: f.description,
    blogPostSlug: f.blogPostSlug,
  }
}

export default function AdminEventsPage() {
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all')
  const [rows, setRows] = useState<AdminEventRow[]>([])
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [suggestions, setSuggestions] = useState<TagCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchEventsAdmin(status))
      setError(null)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cargar los eventos'))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  // Posts to link and tags to reuse, loaded once the form opens.
  useEffect(() => {
    if (!form) return
    fetchBlogPosts({ status: 'all', limit: 100 }).then((r) => setPosts(r.data)).catch(() => setPosts([]))
    fetchTagSuggestions(process.env.NEXT_PUBLIC_API_URL || '', tenantHeader()).then(setSuggestions).catch(() => setSuggestions([]))
  }, [form === null]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const save = async (publish: boolean) => {
    if (!form) return
    if (!form.title.trim() || !form.startDate) {
      setError('Poné al menos el título y la fecha.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const input: EventInput = { ...toInput(form), status: publish ? 'published' : 'draft' }
      if (editingId) await updateEvent(editingId, input)
      else await createEvent(input)
      setForm(null)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos guardar el evento'))
    } finally {
      setSaving(false)
    }
  }

  const setPublished = async (e: SiteEvent, published: boolean) => {
    setBusyId(e.id)
    try {
      await updateEvent(e.id, { status: published ? 'published' : 'draft' })
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos actualizar el evento'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (e: SiteEvent) => {
    if (!window.confirm(`Borrar "${e.title}" del calendario. No se puede deshacer.`)) return
    setBusyId(e.id)
    try {
      await deleteEvent(e.id)
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos borrar el evento'))
    } finally {
      setBusyId(null)
    }
  }

  const currentTags = form ? form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Eventos</h1>
          <p className="text-sm text-muted">El calendario público en /eventos. Un evento puede enlazar a su nota de Novedades.</p>
        </div>
        {!form && (
          <Button iconLeft={<Plus size={16} aria-hidden="true" />} onClick={() => { setForm(EMPTY); setEditingId(null) }}>
            Nuevo evento
          </Button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 text-sm text-danger-ink">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}

      {form && (
        <form
          className="bg-surface border border-line rounded-[var(--radius-lg)] p-5 space-y-4"
          onSubmit={(ev) => { ev.preventDefault(); void save(false) }}
        >
          <h2 className="font-display text-lg font-bold text-ink">{editingId ? 'Editar evento' : 'Nuevo evento'}</h2>
          <Input label="Título" value={form.title} onChange={(e) => set({ title: e.target.value })} required maxLength={160} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input label="Fecha" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} required />
            <Input label="Hora" type="time" value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} hint="Vacía = todo el día" />
            <Input label="Hasta (fecha)" type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} hint="Opcional" />
            <Input label="Hasta (hora)" type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Lugar" value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Ej. Puerto del Buceo" />
            <Input label="Ciudad" value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="Ej. Montevideo" />
            <Input label="Link del evento" value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
            <Input label="Imagen (URL)" value={form.coverImage} onChange={(e) => set({ coverImage: e.target.value })} placeholder="https://…" />
          </div>
          <Textarea label="Descripción" value={form.description} onChange={(e) => set({ description: e.target.value })} rows={5} />
          <Select
            label="Nota en Novedades"
            value={form.blogPostSlug}
            onChange={(e) => set({ blogPostSlug: e.target.value })}
            options={[
              { value: '', label: 'Sin nota' },
              ...posts.map((p) => ({ value: p.slug, label: `${p.title}${p.status === 'draft' ? ' (borrador)' : ''}` })),
            ]}
          />
          <Input
            label="Tags"
            value={form.tags}
            onChange={(e) => set({ tags: e.target.value })}
            hint="Separados por coma. Usá los mismos que en Novedades."
          />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 -mt-2">
              {suggestions
                .filter((s) => !currentTags.includes(s.tag.toLowerCase()))
                .slice(0, 20)
                .map((s) => (
                  <button
                    key={s.tag}
                    type="button"
                    className="tm-chip"
                    onClick={() => set({ tags: [...form.tags.split(',').map((t) => t.trim()).filter(Boolean), s.tag].join(', ') })}
                  >
                    + {s.tag}
                  </button>
                ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" loading={saving} onClick={() => save(true)}>Publicar</Button>
            <Button type="submit" variant="secondary" loading={saving}>Guardar borrador</Button>
            <Button type="button" variant="ghost" onClick={() => { setForm(null); setEditingId(null) }}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        {(['all', 'published', 'draft'] as const).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s === 'all' ? 'Todos' : s === 'published' ? 'Publicados' : 'Borradores'}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No hay eventos todavía.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const e = row.event
            return (
              <div key={e.id} className="bg-surface border border-line rounded-[var(--radius-lg)] p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tm-eyebrow">{e.status === 'published' ? 'Publicado' : 'Borrador'}</p>
                  <h3 className="font-display text-lg font-bold text-ink">{e.title}</h3>
                  <p className="text-sm text-muted">
                    {eventWhen(e)}
                    {e.city ? ` · ${e.city}` : ''}
                    {row.blogPostSlug ? ` · Nota: ${row.blogPostSlug}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.status === 'published' && (
                    <Link href={`/eventos/${e.slug}`} target="_blank" className="tm-btn tm-btn--secondary tm-btn--sm">
                      <ExternalLink size={14} aria-hidden="true" /> Ver
                    </Link>
                  )}
                  <Button size="sm" variant="secondary" iconLeft={<Pencil size={14} aria-hidden="true" />}
                    onClick={() => { setForm(toForm(row)); setEditingId(e.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                    Editar
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busyId === e.id} onClick={() => setPublished(e, e.status !== 'published')}>
                    {e.status === 'published' ? 'Pasar a borrador' : 'Publicar'}
                  </Button>
                  <Button size="sm" variant="ghost" className="[--_fg:var(--danger)]" disabled={busyId === e.id}
                    iconLeft={<Trash2 size={14} aria-hidden="true" />} onClick={() => remove(e)}>
                    Borrar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
