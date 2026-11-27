'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Classified, ClassifiedFacets } from '@/types/classified'
import { fetchClassifiedById } from '@/lib/classifieds-api'
import { useAuth } from '@/app/components/AuthProvider'
import { ButtonLink } from '@/app/components/ui/Button'
import RequireAuth from '@/app/components/RequireAuth'
import ClassifiedForm from '@/app/components/ClassifiedForm'
import { translateApiError } from '@/lib/api-error'

function EditInner({ facets }: { facets: ClassifiedFacets }) {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [classified, setClassified] = useState<Classified | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params?.id || !user) return
    let cancelled = false
    const load = async () => {
      try {
        const c = await fetchClassifiedById(params.id)
        if (cancelled) return
        if (!c) {
          setError('No se encontró la publicación.')
          return
        }
        if (user && c.userId !== user.id) {
          router.replace(`/clasificados/${c.id}`)
          return
        }
        setClassified(c)
      } catch (err) {
        if (!cancelled) setError(translateApiError(err, 'Error al cargar'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params?.id, user, router])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-sm text-muted">
        Cargando…
      </div>
    )
  }

  if (error || !classified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-danger-ink mb-4">{error || 'No se encontró la publicación.'}</p>
        <ButtonLink href="/clasificados/mis">Volvé a tus avisos</ButtonLink>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <nav className="iv__crumb mb-3">
          <Link href="/clasificados">Clasificados</Link>
          <span>/</span>
          <Link href={`/clasificados/${classified.id}`} className="truncate max-w-48">
            {classified.title}
          </Link>
          <span>/</span>
          <span>Editar</span>
        </nav>
        <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
          Editá tu aviso
        </h1>
      </div>

      <ClassifiedForm mode="edit" initial={classified} facets={facets} />
    </div>
  )
}

export default function EditClassifiedClient({ facets }: { facets: ClassifiedFacets }) {
  return (
    <RequireAuth>
      <EditInner facets={facets} />
    </RequireAuth>
  )
}
