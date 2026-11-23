'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { blogTagsHref, isSelected, parseTagParams, toggleTag, type TagCount } from '@/lib/blog-tags'

interface BlogTagFilterProps {
  tags: TagCount[]
}

/** How many tags show before "Ver más"; the rest are one click away. */
const COLLAPSED = 14

/**
 * Tags combine: each chip toggles in or out of the selection, and the list
 * shows posts carrying all the selected ones. Selected tags come first so
 * they are easy to remove, then the rest by how many posts use them.
 */
export default function BlogTagFilter({ tags }: BlogTagFilterProps) {
  const searchParams = useSearchParams()
  const selected = parseTagParams({ tag: searchParams.get('tag'), tags: searchParams.get('tags') })
  const [expanded, setExpanded] = useState(false)

  if (tags.length === 0 && selected.length === 0) return null

  const rest = tags.filter((t) => !isSelected(selected, t.tag))
  const visible = expanded ? rest : rest.slice(0, COLLAPSED)
  const hidden = rest.length - visible.length

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Filtrando por:</span>
          {selected.map((tag) => (
            <Link
              key={tag}
              href={blogTagsHref(toggleTag(selected, tag))}
              className="tm-chip tm-chip--active flex items-center gap-1"
              aria-label={`Quitar ${tag}`}
            >
              {tag}
              <X size={13} aria-hidden="true" />
            </Link>
          ))}
          <Link href="/blog" className="text-sm text-accent underline">
            Limpiar
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {selected.length === 0 && (
          <Link href="/blog" className="tm-chip tm-chip--active">
            Todos
          </Link>
        )}
        {visible.map(({ tag, count }) => (
          <Link key={tag} href={blogTagsHref(toggleTag(selected, tag))} className="tm-chip">
            {tag}
            {count > 0 && <span className="text-faint ml-1 font-mono text-xs">{count}</span>}
          </Link>
        ))}
        {hidden > 0 && (
          <button type="button" className="tm-chip" onClick={() => setExpanded(true)}>
            Ver {hidden} más
          </button>
        )}
      </div>
    </div>
  )
}
