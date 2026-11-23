'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CalendarClock, Check, ExternalLink, Image as ImageIcon, Pencil, Plus, Send, Undo2 } from 'lucide-react'
import { AdminBlogPost, BlogStatus, fetchBlogPosts, updateBlogPost } from '@/lib/ops-api'
import { translateApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { SITE_CONFIG } from '@/lib/tenant'
import { Button } from '../../components/ui/Button'
import { FilterChip } from '../../components/ui/FilterChip'
import { formatSchedule } from '../schedule'

type Tab = BlogStatus | 'scheduled' | 'all'

const TABS: { value: Tab; label: string }[] = [
  { value: 'draft', label: 'Borradores' },
  { value: 'scheduled', label: 'Programados' },
  { value: 'published', label: 'Publicados' },
  { value: 'all', label: 'Todos' },
]

export default function AdminBlogPage() {
  const [status, setStatus] = useState<Tab>('draft')
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busySlug, setBusySlug] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchBlogPosts({ status })
      setPosts(res.data ?? [])
      setError(null)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cargar las notas'))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  const setPostStatus = async (post: AdminBlogPost, next: BlogStatus) => {
    if (next === 'published' && !post.coverImage) {
      if (!window.confirm(`"${post.title}" no tiene portada. ¿Publicarla igual?`)) return
    }
    setBusySlug(post.slug)
    setError(null)
    setNotice(null)
    try {
      await updateBlogPost(post.slug, { status: next })
      setNotice(next === 'published' ? `Publiqué "${post.title}".` : `"${post.title}" volvió a borrador.`)
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cambiar el estado de la nota'))
    } finally {
      setBusySlug(null)
    }
  }

  const title = SITE_CONFIG.brand === 'nauti' ? 'Novedades' : 'Blog'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
            {title}
          </h1>
          <p className="text-sm text-muted mt-2">
            Los borradores no se ven en el sitio. Podés publicarlos al instante o programarlos para una fecha.
          </p>
        </div>
        <Link href="/admin/blog/nuevo" className="tm-btn tm-btn--sm tm-btn--primary">
          <Plus size={14} aria-hidden="true" /> Nueva nota
        </Link>
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

      <div className="iv__chips">
        {TABS.map((tab) => (
          <FilterChip key={tab.value} active={status === tab.value} onClick={() => setStatus(tab.value)}>
            {tab.label}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted py-10 text-center">Cargando…</p>
      ) : posts.length === 0 ? (
        <div className="iv__empty">
          <h3 className="font-display text-lg font-bold text-ink mb-2">No hay nada acá</h3>
          <p className="text-sm text-muted">
            {status === 'scheduled' ? 'Ninguna nota programada.' : 'Ninguna nota con estos filtros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const scheduled = post.status === 'draft' && !!post.scheduledAt
            const editHref = `/admin/blog/editar/${encodeURIComponent(post.slug)}`
            return (
              <div
                key={post.id}
                className="bg-surface border border-line rounded-[var(--radius-lg)] p-5 flex flex-wrap gap-4"
              >
                <Link href={editHref} className="w-32 flex-shrink-0" aria-label={`Editar ${post.title}`}>
                  {post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage}
                      alt=""
                      className="w-32 aspect-[16/10] object-cover rounded-[var(--radius-md)] border border-hairline"
                    />
                  ) : (
                    <div className="w-32 aspect-[16/10] rounded-[var(--radius-md)] border border-dashed border-line flex items-center justify-center text-muted">
                      <ImageIcon size={18} aria-hidden="true" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-[220px] space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-ink">
                      <Link href={editHref} className="hover:underline">{post.title}</Link>
                    </h2>
                    <span className={`post-editor__status post-editor__status--${post.status === 'published' ? 'live' : scheduled ? 'scheduled' : 'draft'}`}>
                      {post.status === 'published' ? 'Publicado' : scheduled ? 'Programado' : 'Borrador'}
                    </span>
                  </div>
                  <p className="text-xs text-muted font-mono">/blog/{post.slug}</p>
                  {post.excerpt && <p className="text-sm text-body">{post.excerpt}</p>}
                  <p className="text-xs text-muted">
                    {post.status === 'published' && post.publishedAt ? (
                      `Publicado ${formatDate(post.publishedAt)}`
                    ) : scheduled ? (
                      <span className="inline-flex items-center gap-1 text-ink">
                        <CalendarClock size={12} aria-hidden="true" /> Se publica el {formatSchedule(post.scheduledAt)}
                      </span>
                    ) : (
                      `Editado ${formatDate(post.updatedAt)}`
                    )}
                    {post.sponsored && ' · contenido patrocinado'}
                    {post.instagramMediaId && ' · ya salió en Instagram'}
                  </p>

                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <Link href={editHref} className="tm-btn tm-btn--sm tm-btn--secondary">
                      <Pencil size={14} aria-hidden="true" /> Editar
                    </Link>
                    {post.status === 'draft' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busySlug === post.slug}
                        iconLeft={<Send size={14} aria-hidden="true" />}
                        onClick={() => setPostStatus(post, 'published')}
                      >
                        Publicar ahora
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busySlug === post.slug}
                        iconLeft={<Undo2 size={14} aria-hidden="true" />}
                        onClick={() => setPostStatus(post, 'draft')}
                      >
                        Despublicar
                      </Button>
                    )}
                    {post.status === 'published' && (
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="text-xs text-muted underline inline-flex items-center gap-1"
                      >
                        Ver <ExternalLink size={12} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
