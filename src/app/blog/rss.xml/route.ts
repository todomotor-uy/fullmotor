import { getAllBlogPosts } from '@/lib/blog'
import { absoluteUrl, SITE_NAME } from '@/lib/site'
import { IS_NAUTI } from '@/lib/tenant'

export const revalidate = 3600

const FEED_TITLE = IS_NAUTI ? `Noticias náuticas — ${SITE_NAME}` : `Noticias del Motor — ${SITE_NAME}`
const FEED_DESCRIPTION = IS_NAUTI
  ? 'Regatas, temporada, novedades y guías para navegar en Uruguay.'
  : 'Las últimas tendencias, lanzamientos y noticias del mundo automotor en Uruguay.'
const MAX_ITEMS = 50

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toRfc822(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString()
}

export async function GET() {
  const posts = (await getAllBlogPosts())
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_ITEMS)

  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`)
      return `    <item>
      <title>${escapeXml(post.sponsored ? `[Patrocinado] ${post.title}` : post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      <pubDate>${toRfc822(post.publishedAt)}</pubDate>
      <author>${escapeXml(SITE_NAME)}</author>
${post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join('\n')}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(absoluteUrl('/blog'))}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>es-uy</language>
    <lastBuildDate>${posts[0] ? toRfc822(posts[0].publishedAt) : new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl('/blog/rss.xml'))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
