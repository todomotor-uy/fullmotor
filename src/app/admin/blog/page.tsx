'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, ExternalLink, Image as ImageIcon, Plus, Send, Undo2 } from 'lucide-react'
import {
  AdminBlogPost,
  BlogStatus,
  createBlogPost,
  fetchBlogPosts,
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
import { FilterChip } from '../../components/ui/FilterChip'

const TABS: { value: BlogStatus | 'all'; label: string }[] = [
  { value: 'draft', label: 'Borradores' },
  { value: 'published', label: 'Publicados' },
  { value: 'all', label: 'Todos' },
]

const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'

export default function AdminBlogPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<BlogStatus | 'all'>('draft')
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busySlug, setBusySlug] = useState<string | null>(null)

  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  // The site's existing tags, offered as one-click chips so a new post
  // reuses "Regatas" instead of inventing "regata" and splitting the filter.
  const [suggestions, setSuggestions] = useState<TagCount[]>([])
  useEffect(() => {
    if (!composing) return
    fetchTagSuggestions(process.env.NEXT_PUBLIC_API_URL || '', tenantHeader())
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
  }, [composing])
  const currentTags = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  const addTag = (tag: string) =>
    setTags((prev) => {
      const list = prev.split(',').map((t) => t.trim()).filter(Boolean)
      return [...list, tag].join(', ')
    })
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchBlogPosts({ status })
      setPosts(res.data ?? [])
      setError(null)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cargar el blog'))
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  // The slug follows the title until somebody edits it by hand, and then stops
  // — retyping the headline must not silently move a URL the author chose.
  useEffect(() => {
    if (!slugTouched) setSlug(slugFromTitle(title))
  }, [title, slugTouched])

  const resetForm = () => {
    setTitle('')
    setSlug('')
    setSlugTouched(false)
    setExcerpt('')
    setBody('')
    setTags('')
    setComposing(false)
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setCreating(true)
    setError(null)
    setNotice(null)
    try {
      // Always a draft. Publishing is a separate, deliberate click — a form
      // that could publish on submit is one Enter key away from putting an
      // unfinished article on the site.
      const post = await createBlogPost({
        slug: slug || slugFromTitle(title),
        countryCode: COUNTRY,
        title: title.trim(),
        contentMarkdown: body,
        authorId: user.id,
        excerpt: excerpt.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: 'draft',
      })
      setNotice(`Creé el borrador "${post.title}". Subile una portada y publicalo cuando esté.`)
      resetForm()
      setStatus('draft')
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos crear el post'))
    } finally {
      setCreating(false)
    }
  }

  const setPostStatus = async (post: AdminBlogPost, next: BlogStatus) => {
    if (next === 'published' && !post.coverImage) {
      if (!window.confirm(`"${post.title}" no tiene portada. ¿Publicarlo igual?`)) return
    }
    setBusySlug(post.slug)
    setError(null)
    setNotice(null)
    try {
      await updateBlogPost(post.slug, { status: next })
      setNotice(next === 'published' ? `Publiqué "${post.title}".` : `"${post.title}" volvió a borrador.`)
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos cambiar el estado del post'))
    } finally {
      setBusySlug(null)
    }
  }

  const changeCover = async (post: AdminBlogPost, file: File) => {
    setBusySlug(post.slug)
    setError(null)
    setNotice(null)
    try {
      const url = await uploadBlogImage(file)
      await updateBlogPost(post.slug, { coverImage: url })
      setNotice(`Actualicé la portada de "${post.title}".`)
      await load()
    } catch (err) {
      setError(translateApiError(err, 'No pudimos subir la portada'))
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
            Blog
          </h1>
          <p className="text-sm text-muted mt-2">
            Los borradores no se ven en el sitio. Publicar los pone en línea al instante.
          </p>
        </div>
        <Button
          size="sm"
          variant={composing ? 'secondary' : 'primary'}
          iconLeft={<Plus size={14} aria-hidden="true" />}
          onClick={() => setComposing((v) => !v)}
        >
          {composing ? 'Cancelar' : 'Nuevo post'}
        </Button>
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

      {composing && (
        <form
          onSubmit={create}
          className="bg-surface border border-line p-6 rounded-[var(--radius-lg)] shadow-xs space-y-4"
        >
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            hint="Es la dirección pública y no se puede cambiar después."
            required
          />
          <Textarea
            label="Copete"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            hint="Opcional. Es lo que se ve en el listado y en las redes."
          />
          <Textarea
            label="Contenido"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            required
            hint="Markdown."
          />
          <Input
            label="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            hint="Separados por coma. Son los filtros de la sección: reusá los que ya existen."
          />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 -mt-2">
              {suggestions
                .filter((s) => !currentTags.includes(s.tag.toLowerCase()))
                .slice(0, 24)
                .map((s) => (
                  <button key={s.tag} type="button" className="tm-chip" onClick={() => addTag(s.tag)}>
                    + {s.tag}
                    {s.count > 0 && <span className="text-faint ml-1 font-mono text-xs">{s.count}</span>}
                  </button>
                ))}
            </div>
          )}
          <Button type="submit" block loading={creating}>
            Guardar como borrador
          </Button>
        </form>
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
          <p className="text-sm text-muted">Ningún post con estos filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-surface border border-line rounded-[var(--radius-lg)] p-5 flex flex-wrap gap-4"
            >
              <div className="w-32 flex-shrink-0">
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
              </div>

              <div className="flex-1 min-w-[220px] space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-ink">{post.title}</h2>
                  <span className="tm-eyebrow">
                    {post.status === 'published' ? 'publicado' : 'borrador'}
                  </span>
                </div>
                <p className="text-xs text-muted font-mono">/blog/{post.slug}</p>
                {post.excerpt && <p className="text-sm text-body">{post.excerpt}</p>}
                <p className="text-xs text-muted">
                  {post.status === 'published' && post.publishedAt
                    ? `Publicado ${formatDate(post.publishedAt)}`
                    : `Editado ${formatDate(post.updatedAt)}`}
                  {post.sponsored && ' · contenido patrocinado'}
                  {post.instagramMediaId && ' · ya salió en Instagram'}
                </p>

                <div className="flex flex-wrap gap-2 items-center pt-1">
                  {post.status === 'draft' ? (
                    <Button
                      size="sm"
                      disabled={busySlug === post.slug}
                      iconLeft={<Send size={14} aria-hidden="true" />}
                      onClick={() => setPostStatus(post, 'published')}
                    >
                      Publicar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busySlug === post.slug}
                      iconLeft={<Undo2 size={14} aria-hidden="true" />}
                      onClick={() => setPostStatus(post, 'draft')}
                    >
                      Despublicar
                    </Button>
                  )}

                  <label className="tm-btn tm-btn--sm tm-btn--ghost cursor-pointer">
                    <ImageIcon size={14} aria-hidden="true" />
                    {post.coverImage ? 'Cambiar portada' : 'Subir portada'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={busySlug === post.slug}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        // Cleared so picking the same file twice fires again —
                        // otherwise a failed upload cannot be retried without
                        // choosing a different image.
                        e.target.value = ''
                        if (file) void changeCover(post, file)
                      }}
                    />
                  </label>

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
          ))}
        </div>
      )}
    </div>
  )
}
