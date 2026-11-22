import Link from 'next/link'
import AdSlot from '@/app/components/ads/AdSlot'

/**
 * Roughly 500 words of rendered HTML. Measured on the markup rather than the
 * markdown because that is what the reader actually scrolls through.
 */
const LONG_ARTICLE_CHARS = 3500

function isLongArticle(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').trim().length >= LONG_ARTICLE_CHARS
}
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { fetchBlogPostBySlug, fetchBlogPosts, getAllBlogPosts } from '@/lib/blog'
import { getAllVehicles } from '@/lib/data'
import { findMentionedVehicles } from '@/lib/blog-mentions'
import { SITE_CONFIG } from '@/lib/tenant'
import { vehicleToCardProps } from '@/lib/vehicle-card'
import { VehicleCard } from '@/app/components/ui/VehicleCard'
import { absoluteUrl, SITE_LOGO, SITE_NAME, SITE_URL } from '@/lib/site'
import { formatDate } from '@/lib/format'
import JsonLd from '@/app/components/JsonLd'
import CommentsSection from '@/app/components/CommentsSection'
import BlogCard from '@/app/components/BlogCard'
import { Badge } from '@/app/components/ui/Badge'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const post = await fetchBlogPostBySlug(slug)
  if (!post) return { title: 'Artículo no encontrado' }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: absoluteUrl(`/blog/${slug}`),
      images: post.coverImage ? [{ url: post.coverImage }] : [],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [SITE_NAME],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
    alternates: {
      canonical: `/blog/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params
  const post = await fetchBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Fetch related posts (exclude current)
  let relatedPosts: import('@/types/blog').BlogPost[] = []
  try {
    const { posts } = await fetchBlogPosts({ limit: 4 })
    relatedPosts = posts.filter(p => p.slug !== slug).slice(0, 3)
  } catch {
    relatedPosts = []
  }

  // Articles name models in plain text while a full spec page for each sits one
  // route away, so the blog — the site's strongest internal-authority source —
  // was passing none of it on. getAllVehicles is already paginated and cached,
  // and this page is prerendered, so the match runs at build time.
  // Only sites with a catalogue link articles to vehicle pages.
  const mentionedVehicles = SITE_CONFIG.features.catalog
    ? findMentionedVehicles(post.contentHtml, await getAllVehicles())
    : []

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    // Structured disclosure of the sponsor. Google does not rank on it, but it
    // is the correct machine-readable signal for branded content, and stating
    // it here costs nothing while omitting it looks like concealment.
    ...(post.sponsored && post.sponsorName && {
      sponsor: {
        '@type': 'Organization',
        name: post.sponsorName,
        ...(post.sponsorUrl && { url: post.sponsorUrl }),
      },
    }),
    // Omit the key entirely when there is no cover — an empty string is a
    // validation error in Google's Article rich result.
    ...(post.coverImage && { image: [post.coverImage] }),
    // Posts are published under the site's name, not an individual byline.
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: 'es-UY',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: SITE_LOGO },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${slug}`),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Noticias', item: absoluteUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <article className="art">
        <Link href="/blog" className="art__back">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al blog
        </Link>

        <div className="art__meta">
          {/* Above the headline on purpose. A disclosure at the foot of the
              article arrives after the reader has already read it, which is
              not disclosure — it is a receipt. */}
          {post.sponsored && (
            <Badge tone="warning">
              Contenido patrocinado{post.sponsorName ? ` por ${post.sponsorName}` : ''}
            </Badge>
          )}
          {post.tags[0] && <Badge tone="accent">{post.tags[0]}</Badge>}
          <span className="bl__date">{formatDate(post.publishedAt)}</span>
        </div>

        <h1 className="art__title">{post.title}</h1>

        {post.sponsored && (
          <p className="art__disclosure">
            {post.sponsorDisclosure ??
              'Este artículo fue financiado por un anunciante. Lo escribió nuestra redacción con criterio editorial propio; el anunciante no decide el enfoque.'}
          </p>
        )}

        <div className={`art__hero${post.coverImage ? '' : ' art__hero--empty'}`}>
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              priority
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <Newspaper size={22} aria-hidden="true" />
          )}
        </div>

        <AdSlot placement="article_top" targeting={{ tags: post.tags }} />

        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* The closing slot only on articles long enough to earn it. A daily
            "Radar" post is three short paragraphs, and bracketing it with two
            leaderboards leaves more ad than article on screen — which costs
            more in readers than it earns in impressions. */}
        {isLongArticle(post.contentHtml) && (
          <AdSlot placement="article_bottom" targeting={{ tags: post.tags }} />
        )}

        {mentionedVehicles.length > 0 && (
          <section className="art__mentions">
            <h2>Vehículos mencionados en este artículo</h2>
            <div className="art__mentions-grid">
              {mentionedVehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} {...vehicleToCardProps(vehicle)} hideSave />
              ))}
            </div>
          </section>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-hairline">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="tm-chip">
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <CommentsSection resourceId={slug} />
      </article>

      {relatedPosts.length > 0 && (
        <section className="bl" style={{ paddingTop: 48 }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', letterSpacing: '-0.02em', margin: '0 0 20px' }}>
            Artículos relacionados
          </h2>
          <div className="bl__grid">
            {relatedPosts.map((relatedPost) => (
              <BlogCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
