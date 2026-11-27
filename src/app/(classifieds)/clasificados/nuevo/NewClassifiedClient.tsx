'use client'

import Link from 'next/link'
import { ClassifiedFacets } from '@/types/classified'
import RequireAuth from '@/app/components/RequireAuth'
import ClassifiedForm from '@/app/components/ClassifiedForm'

export default function NewClassifiedClient({ facets }: { facets: ClassifiedFacets }) {
  return (
    <RequireAuth>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <nav className="iv__crumb mb-3">
            <Link href="/clasificados">Clasificados</Link>
            <span>/</span>
            <span>Nuevo aviso</span>
          </nav>
          <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
            Publicá tu aviso
          </h1>
          <p className="text-sm text-muted mt-2">
            Publicar es gratis. Tu aviso queda activo 30 días y lo podés renovar cuando esté por vencer.
          </p>
        </div>

        <ClassifiedForm mode="create" facets={facets} />
      </div>
    </RequireAuth>
  )
}
