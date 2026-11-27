import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getGuideIndex, getResolvedCurated, salesMeta } from '@/lib/buying-guide'
import { GUIDE_PATH } from '@/lib/buying-guide/url-state'
import { absoluteUrl, SITE_URL } from '@/lib/site'
import JsonLd from '@/app/components/JsonLd'
import RequireAuth from '@/app/components/RequireAuth'
import GuideWizard from '@/app/components/guide/GuideWizard'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const TITLE = '¿Qué auto me compro? Guía de compra interactiva'
const DESCRIPTION = 'Respondé seis preguntas — uso, presupuesto, personas, motorización, caja y prioridad — y te mostramos los autos 0 km del catálogo que mejor encajan, con las razones. Precios de referencia en Uruguay.'

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams
  const hasParams = Object.keys(params).length > 0
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: absoluteUrl(GUIDE_PATH) },
    // Every combination of answers is a page; only the clean entry point should rank.
    robots: hasParams ? { index: false, follow: true } : undefined,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: absoluteUrl(GUIDE_PATH),
      type: 'website',
    },
  }
}

export default async function GuiaDeCompraPage() {
  const index = await getGuideIndex()
  const curated = getResolvedCurated(index)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guía de compra', item: absoluteUrl(GUIDE_PATH) },
    ],
  }

  return (
    <div className="gd" style={{ paddingBottom: 24 }}>
      <JsonLd data={breadcrumbJsonLd} />

      <div className="iv__crumb">
        <Link href="/">Inicio</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span style={{ color: 'var(--text-strong)' }}>Guía de compra</span>
      </div>

      <header className="gd__head">
        <span className="bl__kicker">Guía de compra</span>
        <h1 className="gd__title">¿Qué auto me compro?</h1>
        <p className="gd__lead">
          Respondé seis preguntas y te mostramos los modelos que mejor encajan con vos, con las razones.
          Datos reales de fichas técnicas y precios de referencia 0 km en Uruguay.
        </p>
      </header>

      {index.length === 0 ? (
        <div className="iv__empty">
          <p>No pudimos cargar el catálogo en este momento. Probá de nuevo en un rato.</p>
          <p style={{ marginTop: 12 }}><Link href="/vehiculos" className="tm-btn tm-btn--secondary">Ver el catálogo</Link></p>
        </div>
      ) : (
        <Suspense fallback={<div className="gd__wizard" aria-busy="true" />}>
          {/* The wizard needs an account; the heading and lead above stay open
              so the page still says what it is — to someone deciding whether
              to sign up, and to a crawler. */}
          <RequireAuth
            headingLevel={2}
            title="Creá tu cuenta gratis para usar la guía"
            description="Registrarte no tiene costo. Iniciá sesión con Google, respondé las seis preguntas y volvés justo a esta página."
          >
            <GuideWizard index={index} curated={curated} salesMeta={salesMeta} />
          </RequireAuth>
        </Suspense>
      )}
    </div>
  )
}
