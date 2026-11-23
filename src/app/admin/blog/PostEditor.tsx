'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import {
  AdminBlogPost,
  createBlogPost,
  deleteBlogPost,
  fetchBlogPost,
  slugFromTitle,
  updateBlogPost,
  uploadBlogImage,
} from '@/lib/ops-api'
import { translateApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { fetchTagSuggestions, type TagCount } from '@/lib/blog-tags'
import { tenantHeader } from '@/lib/tenant'
import { useAuth } from '../../components/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { RichEditor } from '@/app/components/editor/RichEditor'
import { formatSchedule, fromLocalInput, minScheduleInput, scheduleProblem, toLocalInput } from '../schedule'

const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'
const EXCERPT_IDEAL = 160

interface Draft {
  title: string
  slug: string
  excerpt: string
  body: string
  tags: string
  coverImage: string
}

const EMPTY: Draft = { title: '', slug: '', excerpt: '', body: '', tags: '', coverImage: '' }

function toDraft(p: AdminBlogPost): Draft {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? '',
    body: p.contentMarkdown ?? '',
    tags: (p.tags ?? []).join(', '),
    coverImage: p.coverImage ?? '',
  }
}

/**
 * A message that has to survive the move from /nuevo (or an old slug) to the
 * post's own address, which mounts a fresh editor.
 */
let carriedNotice: string | null = null

const tagList = (tags: string) => tags.split(',').map((t) => t.trim()).filter(Boolean)

/**
 * The whole post on one screen: write it, give it a cover, and save it as a
 * draft, schedule it, or publish it. `slug` opens an existing post.
 */
export function PostEditor({ slug }: { slug?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const [post, setPost] = useState<AdminBlogPost | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saved, setSaved] = useState<Draft>(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(!!slug)
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'schedule' | 'unpublish' | 'cover' | 'delete'>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    if (!carriedNotice) return
    setNotice(carriedNotice)
    carriedNotice = null
  }, [])
  const [suggestions, setSuggestions] = useState<TagCount[]>([])
  const [scheduling, setScheduling] = useState(false)
  const [when, setWhen] = useState('')

  const isNew = !post
  const published = post?.status === 'published'
  const scheduledAt = post?.status === 'draft' ? post.scheduledAt : null
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const p = await fetchBlogPost(slug)
      setPost(p)
      setDraft(toDraft(p))
      setSaved(toDraft(p))
      setSlugTouched(true)
      setError(null)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos abrir el post'))
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    fetchTagSuggestions(process.env.NEXT_PUBLIC_API_URL || '', tenantHeader())
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
  }, [])

  // The slug follows the title until somebody edits it by hand.
  useEffect(() => {
    if (!slugTouched) setDraft((d) => ({ ...d, slug: slugFromTitle(d.title) }))
  }, [draft.title, slugTouched])

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Falta el título.'
    if (!draft.slug.trim()) return 'Falta el slug.'
    if (!draft.body.trim()) return 'La nota está vacía.'
    return null
  }

  /**
   * Writes the post and whatever state change comes with it. A new post is
   * created as a draft first, then moved, so a failure halfway never leaves
   * a published half-post.
   */
  const persist = async (
    kind: NonNullable<typeof busy>,
    change: { status?: 'draft' | 'published'; scheduledAt?: string } = {},
  ): Promise<AdminBlogPost | null> => {
    const problem = validate()
    if (problem) {
      setError(problem)
      return null
    }
    if (!user) return null
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      let result: AdminBlogPost
      if (!post) {
        result = await createBlogPost({
          slug: draft.slug.trim(),
          countryCode: COUNTRY,
          title: draft.title.trim(),
          contentMarkdown: draft.body,
          authorId: user.id,
          excerpt: draft.excerpt.trim() || undefined,
          coverImage: draft.coverImage || undefined,
          tags: tagList(draft.tags),
          status: change.status ?? 'draft',
          scheduledAt: change.scheduledAt || undefined,
        })
      } else {
        result = await updateBlogPost(post.slug, {
          title: draft.title.trim(),
          ...(draft.slug.trim() !== post.slug ? { slug: draft.slug.trim() } : {}),
          contentMarkdown: draft.body,
          excerpt: draft.excerpt.trim(),
          coverImage: draft.coverImage,
          tags: tagList(draft.tags),
          ...change,
        })
      }
      setPost(result)
      setDraft(toDraft(result))
      setSaved(toDraft(result))
      setSlugTouched(true)
      return result
    } catch (err) {
      setError(translateApiError(err, 'No pudimos guardar el post'))
      return null
    } finally {
      setBusy(null)
    }
  }

  /** Shows the outcome, moving to the post's address when it has a new one. */
  const done = (result: AdminBlogPost, message: string) => {
    if (!slug || result.slug !== slug) {
      carriedNotice = message
      router.replace(`/admin/blog/editar/${encodeURIComponent(result.slug)}`)
      return
    }
    setNotice(message)
  }

  const save = async () => {
    const r = await persist('save')
    if (r) done(r, r.status === 'published' ? 'Guardé los cambios. Ya están en el sitio.' : 'Guardé el borrador.')
  }

  const publishNow = async () => {
    if (!draft.coverImage && !window.confirm('La nota no tiene portada. ¿Publicarla igual?')) return
    const r = await persist('publish', { status: 'published' })
    if (r) {
      setScheduling(false)
      done(r, `Publiqué "${r.title}". Ya está en el sitio.`)
    }
  }

  const schedule = async () => {
    const problem = scheduleProblem(when)
    if (problem) {
      setError(problem)
      return
    }
    if (!draft.coverImage && !window.confirm('La nota no tiene portada. ¿Programarla igual?')) return
    const iso = fromLocalInput(when)
    const r = await persist('schedule', { status: 'draft', scheduledAt: iso })
    if (r) {
      setScheduling(false)
      done(r, `Programada: se publica sola el ${formatSchedule(r.scheduledAt ?? iso)}.`)
    }
  }

  const cancelSchedule = async () => {
    const r = await persist('schedule', { scheduledAt: '' })
    if (r) done(r, 'Cancelé la programación. Sigue como borrador.')
  }

  const unpublish = async () => {
    if (!window.confirm('La nota deja de verse en el sitio. ¿Pasarla a borrador?')) return
    const r = await persist('unpublish', { status: 'draft' })
    if (r) done(r, 'La nota volvió a borrador.')
  }

  const remove = async () => {
    if (!post) return
    if (!window.confirm(`Borrar "${post.title}". No se puede deshacer.`)) return
    setBusy('delete')
    try {
      await deleteBlogPost(post.slug)
      setSaved(draft) // nothing left to lose
      router.push('/admin/blog')
    } catch (err) {
      setError(translateApiError(err, 'No pudimos borrar el post'))
      setBusy(null)
    }
  }

  const changeCover = async (file: File) => {
    setBusy('cover')
    setError(null)
    try {
      set({ coverImage: await uploadBlogImage(file) })
    } catch (err) {
      setError(translateApiError(err, 'No pudimos subir la portada'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <p className="text-sm text-muted py-16 text-center">Cargando…</p>
  if (slug && !post && error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <p className="flex items-center gap-2 text-sm text-danger-ink"><AlertCircle size={16} aria-hidden="true" /> {error}</p>
        <Link href="/admin/blog" className="text-sm underline">Volver al listado</Link>
      </div>
    )
  }

  const currentTags = tagList(draft.tags).map((t) => t.toLowerCase())
  const statusLabel = published ? 'Publicado' : scheduledAt ? 'Programado' : isNew ? 'Nuevo' : 'Borrador'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/blog"
          className="text-sm text-muted inline-flex items-center gap-1 hover:text-ink"
          onClick={(e) => {
            if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir igual?')) e.preventDefault()
          }}
        >
          <ArrowLeft size={14} aria-hidden="true" /> Todas las notas
        </Link>
        <span className="text-xs text-muted">{dirty ? 'Cambios sin guardar' : post ? `Guardado · editado ${formatDate(post.updatedAt)}` : ''}</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-positive-soft text-positive-ink text-sm">
          <Check size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          {notice}
        </div>
      )}

      <form
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="space-y-4 min-w-0">
          <textarea
            className="post-editor__title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
            placeholder="Título"
            aria-label="Título"
            rows={1}
            maxLength={200}
          />
          <RichEditor value={draft.body} onChange={(body) => set({ body })} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className="bg-surface border border-line rounded-[var(--radius-lg)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink">Publicación</h2>
              <span className={`post-editor__status post-editor__status--${published ? 'live' : scheduledAt ? 'scheduled' : 'draft'}`}>
                {statusLabel}
              </span>
            </div>

            {published && post?.publishedAt && (
              <p className="text-sm text-muted">En línea desde el {formatDate(post.publishedAt)}.</p>
            )}
            {scheduledAt && !scheduling && (
              <p className="text-sm text-body flex items-start gap-2">
                <CalendarClock size={16} className="flex-shrink-0 mt-0.5 text-accent" aria-hidden="true" />
                <span>
                  Se publica sola el <strong>{formatSchedule(scheduledAt)}</strong>.
                  {dirty && ' Guardá para que salga con los últimos cambios.'}
                </span>
              </p>
            )}
            {!published && !scheduledAt && !scheduling && (
              <p className="text-sm text-muted">Los borradores no se ven en el sitio.</p>
            )}

            {scheduling && (
              <div className="space-y-2 p-3 rounded-[var(--radius-md)] bg-sunken">
                <Input
                  label="Publicar el"
                  type="datetime-local"
                  value={when}
                  min={minScheduleInput()}
                  onChange={(e) => setWhen(e.target.value)}
                  hint="Hora de tu compu. Se publica sola, aunque nadie esté conectado."
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" loading={busy === 'schedule'} disabled={!!busy} onClick={schedule}>
                    {scheduledAt ? 'Cambiar fecha' : 'Programar'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setScheduling(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {published ? (
                <>
                  <Button type="submit" block loading={busy === 'save'} disabled={!!busy}>
                    Guardar cambios
                  </Button>
                  <Button type="button" block variant="secondary" disabled={!!busy} loading={busy === 'unpublish'}
                    iconLeft={<Undo2 size={14} aria-hidden="true" />} onClick={unpublish}>
                    Despublicar
                  </Button>
                  <Link href={`/blog/${post?.slug}`} target="_blank" className="tm-btn tm-btn--ghost tm-btn--sm justify-center">
                    Ver en el sitio <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <Button type="button" block disabled={!!busy} loading={busy === 'publish'}
                    iconLeft={<Send size={14} aria-hidden="true" />} onClick={publishNow}>
                    Publicar ahora
                  </Button>
                  {!scheduling && (
                    <Button type="button" block variant="secondary" disabled={!!busy}
                      iconLeft={<CalendarClock size={14} aria-hidden="true" />}
                      onClick={() => {
                        setWhen(toLocalInput(scheduledAt) || '')
                        setScheduling(true)
                      }}>
                      {scheduledAt ? 'Cambiar fecha' : 'Programar…'}
                    </Button>
                  )}
                  {scheduledAt && !scheduling && (
                    <Button type="button" block variant="ghost" disabled={!!busy} onClick={cancelSchedule}>
                      Cancelar programación
                    </Button>
                  )}
                  <Button type="submit" block variant="ghost" loading={busy === 'save'} disabled={!!busy}>
                    Guardar borrador
                  </Button>
                </>
              )}
            </div>
          </section>

          <section className="bg-surface border border-line rounded-[var(--radius-lg)] p-4 space-y-3">
            <h2 className="font-display text-base font-bold text-ink">Portada</h2>
            {draft.coverImage ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.coverImage} alt="" className="w-full aspect-[16/10] object-cover rounded-[var(--radius-md)] border border-hairline" />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-surface/90 rounded-full p-1 border border-line"
                  aria-label="Quitar portada"
                  onClick={() => set({ coverImage: '' })}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="w-full aspect-[16/10] rounded-[var(--radius-md)] border border-dashed border-line flex items-center justify-center text-muted">
                <ImageIcon size={22} aria-hidden="true" />
              </div>
            )}
            <label className={`tm-btn tm-btn--sm tm-btn--secondary w-full justify-center cursor-pointer ${busy === 'cover' ? 'opacity-60' : ''}`}>
              <ImageIcon size={14} aria-hidden="true" />
              {busy === 'cover' ? 'Subiendo…' : draft.coverImage ? 'Cambiar portada' : 'Subir portada'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={!!busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void changeCover(file)
                }}
              />
            </label>
          </section>

          <section className="bg-surface border border-line rounded-[var(--radius-lg)] p-4 space-y-3">
            <Textarea
              label="Copete"
              value={draft.excerpt}
              onChange={(e) => set({ excerpt: e.target.value })}
              rows={3}
              hint={`${draft.excerpt.length}/${EXCERPT_IDEAL} · Se ve en el listado y al compartir.`}
            />
            <Input
              label="Slug"
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set({ slug: e.target.value })
              }}
              disabled={published}
              hint={published ? 'Es la dirección pública: despublicá para cambiarla.' : `/blog/${draft.slug || '…'}`}
            />
            <Input
              label="Tags"
              value={draft.tags}
              onChange={(e) => set({ tags: e.target.value })}
              hint="Separados por coma. Reusá los que ya existen."
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 -mt-1">
                {suggestions
                  .filter((s) => !currentTags.includes(s.tag.toLowerCase()))
                  .slice(0, 18)
                  .map((s) => (
                    <button
                      key={s.tag}
                      type="button"
                      className="tm-chip"
                      onClick={() => set({ tags: [...tagList(draft.tags), s.tag].join(', ') })}
                    >
                      + {s.tag}
                    </button>
                  ))}
              </div>
            )}
          </section>

          {post && (
            <Button type="button" block variant="ghost" className="[--_fg:var(--danger)]" disabled={!!busy}
              loading={busy === 'delete'} iconLeft={<Trash2 size={14} aria-hidden="true" />} onClick={remove}>
              Borrar nota
            </Button>
          )}
        </aside>
      </form>
    </div>
  )
}
