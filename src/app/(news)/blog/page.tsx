import { Suspense } from 'react'
import { Metadata } from 'next'
import { fetchBlogPosts, fetchBlogTagCounts } from '@/lib/blog'
import { blogTagsHref, parseTagParams } from '@/lib/blog-tags'
import { absoluteUrl, SITE_LOGO, SITE_NAME, SITE_URL } from '@/lib/site'
import BlogTagFilter from '@/app/components/BlogTagFilter'
import InfiniteBlogList from '@/app/components/InfiniteBlogList'
import JsonLd from '@/app/components/JsonLd'
import { IS_NAUTI } from '@/lib/tenant'

const BLOG_TITLE = IS_NAUTI ? 'Novedades' : 'Noticias del Motor'
const BLOG_DESCRIPTION = IS_NAUTI
  ? 'Regatas, temporada, novedades y guías para navegar en Uruguay.'
  : 'Las últimas tendencias, lanzamientos y noticias del mundo automotor en Uruguay.'
const MARKET_LABEL = IS_NAUTI ? 'la náutica uruguaya' : 'el mercado automotor uruguayo'

interface PageProps {
  searchParams: Promise<{ tag?: string; tags?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const selected = parseTagParams(await searchParams)

  if (selected.length > 0) {
    const label = selected.join(', ')
    const title = `Noticias sobre ${label}`
    const description = `Artículos y novedades sobre ${label} en ${MARKET_LABEL}.`
    const href = blogTagsHref(selected)
    return {
      title,
      description,
      // Tag views are a query-string filter over the same list, not a real
      // section — index the articles, not the thin filtered listings.
      robots: { index: false, follow: true },
      openGraph: {
        title: `${title} | ${SITE_NAME}`,
        description,
        type: 'website',
        url: absoluteUrl(href),
      },
      twitter: { card: 'summary_large_image', title, description },
      alternates: { canonical: href },
    }
  }

  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    openGraph: {
      title: `${BLOG_TITLE} | ${SITE_NAME}`,
      description: BLOG_DESCRIPTION,
      type: 'website',
      url: absoluteUrl('/blog'),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${BLOG_TITLE} | ${SITE_NAME}`,
      description: BLOG_DESCRIPTION,
    },
    alternates: { canonical: '/blog' },
  }
}

export default async function BlogPage({ searchParams }: PageProps) {
  const selected = parseTagParams(await searchParams)

  const [{ posts, meta }, tags] = await Promise.all([
    fetchBlogPosts({ page: 1, limit: 12, tags: selected }),
    fetchBlogTagCounts().catch(() => []),
  ])

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${BLOG_TITLE} - ${SITE_NAME}`,
    url: absoluteUrl('/blog'),
    description: BLOG_DESCRIPTION,
    inLanguage: 'es-UY',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: SITE_LOGO },
    },
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((post, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/blog/${post.slug}`),
      name: post.title,
    })),
  }

  return (
    <div className="bl" style={{ paddingBottom: 24 }}>
      <JsonLd data={blogJsonLd} />
      {posts.length > 0 && <JsonLd data={itemListJsonLd} />}

      <div className="bl__head">
        {IS_NAUTI ? (
          <>
            <span className="bl__kicker">Novedades</span>
            <h1 className="bl__title">Noticias y novedades de la náutica en Uruguay</h1>
            <p className="bl__sub">
              Regatas, temporada, puertos, normativa y guías para comprar, mantener y disfrutar tu
              embarcación.
            </p>
          </>
        ) : (
          <>
            <span className="bl__kicker">Blog del Motor</span>
            <h1 className="bl__title">Noticias y novedades del motor en Uruguay</h1>
            <p className="bl__sub">
              Contexto para comprar mejor: lanzamientos, impuestos, normativa y guías del mercado
              automotor uruguayo.
            </p>
          </>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <Suspense fallback={<div className="h-10" />}>
          <BlogTagFilter tags={tags} />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <InfiniteBlogList initialPosts={posts} initialMeta={meta} />
      </Suspense>
    </div>
  )
}
