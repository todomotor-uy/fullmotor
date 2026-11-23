import type { MetadataRoute } from 'next'
import { getAllVehicles } from '@/lib/data'
import { getAllBlogPosts } from '@/lib/blog'
import { getAllIndexableClassifieds } from '@/lib/classifieds-api'
import { getAllDealerships } from '@/lib/dealerships-api'
import { CATEGORIES } from '@/types/vehicle'
import { absoluteUrl, SITE_URL } from '@/lib/site'
import { IS_NAUTI } from '@/lib/tenant'
import { fetchEvents } from '@/lib/events'
import type { SiteEvent } from '@/types/event'
import { CATALOG_PER_PAGE, catalogHref, groupByBrand } from '@/lib/catalog'

// Refresh the sitemap without a rebuild — new articles and listings show up
// within the hour instead of waiting for the next deploy.
export const revalidate = 3600

function warnIfEmpty(label: string, count: number) {
  if (count === 0) {
    console.warn(`[sitemap] no ${label} found — the API is likely unreachable, sitemap will be incomplete`)
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (IS_NAUTI) return nautiSitemap()

  const [vehicles, posts, classifieds, dealerships] = await Promise.all([
    getAllVehicles(),
    getAllBlogPosts(),
    getAllIndexableClassifieds(),
    getAllDealerships(),
  ])

  warnIfEmpty('vehicles', vehicles.length)
  warnIfEmpty('blog posts', posts.length)
  warnIfEmpty('classifieds', classifieds.length)
  // Not warned on: zero dealerships is a normal state, not a symptom.

  const now = new Date()

  /**
   * Every page of every category, not just page 1.
   *
   * The catalogue rendered 9 of 1.239 vehicles into its server HTML, so the
   * sitemap was the only route a crawler had to the other 1.230. Listing the
   * paginated pages gives those vehicles a linked path as well as a listed one.
   * Counts come from the vehicles already loaded above — no extra requests.
   */
  const countFor = (categoryId?: string) =>
    categoryId ? vehicles.filter((v) => v.category === categoryId).length : vehicles.length

  const listingEntries: MetadataRoute.Sitemap = [undefined, ...CATEGORIES.map((c) => c.id)].flatMap((categoryId) => {
    const pages = Math.max(1, Math.ceil(countFor(categoryId) / CATALOG_PER_PAGE))
    return Array.from({ length: pages }, (_, i) => ({
      url: absoluteUrl(catalogHref({ category: categoryId }, i + 1)),
      lastModified: now,
      changeFrequency: 'daily' as const,
      // Page 1 of a listing is the entry point; deeper pages matter less.
      priority: i === 0 ? (categoryId ? 0.8 : 0.9) : 0.5,
    }))
  })

  const brandEntries: MetadataRoute.Sitemap = groupByBrand(vehicles).map((brand) => ({
    url: absoluteUrl(`/marcas/${brand.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const vehicleEntries: MetadataRoute.Sitemap = vehicles.map((vehicle) => ({
    url: absoluteUrl(`/vehiculo/${vehicle.slug}`),
    lastModified: vehicle.updatedAt ? new Date(vehicle.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const classifiedEntries: MetadataRoute.Sitemap = classifieds.map((classified) => ({
    url: absoluteUrl(`/clasificados/${classified.id}`),
    lastModified: classified.updatedAt ? new Date(classified.updatedAt) : now,
    changeFrequency: 'daily',
    priority: 0.5,
  }))

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: absoluteUrl('/blog'),
      lastModified: posts[0]?.publishedAt ? new Date(posts[0].publishedAt) : now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/clasificados'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/automotoras'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Storefronts outrank individual listings: they are stable pages that
    // aggregate inventory, where a listing comes and goes.
    ...dealerships.map((d) => ({
      url: absoluteUrl(`/automotoras/${d.slug}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    {
      url: absoluteUrl('/guia-de-compra'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/marcas'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Low priority but indexable: the advertising policy is a sales asset and
    // the privacy policy is a legal one. Neither should be hidden from search.
    {
      url: absoluteUrl('/politica-publicitaria'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/privacidad'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    ...listingEntries,
    ...brandEntries,
    ...blogEntries,
    ...vehicleEntries,
    ...classifiedEntries,
  ]
}

/**
 * Nauti has no catalogue: home, blog, classifieds and storefronts only. Kept
 * separate rather than threaded through the TodoMotor sitemap with flags, so
 * that one stays exactly as it is.
 */
async function nautiSitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, classifieds, dealerships, events] = await Promise.all([
    getAllBlogPosts(),
    getAllIndexableClassifieds(),
    getAllDealerships(),
    fetchEvents({ limit: 500 }).catch((): SiteEvent[] => []),
  ])
  const now = new Date()
  return [
    { url: absoluteUrl('/eventos'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    ...events.map((e) => ({
      url: absoluteUrl(`/eventos/${e.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: absoluteUrl('/clasificados'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/blog'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/automotoras'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...dealerships.map((d) => ({
      url: absoluteUrl(`/automotoras/${d.slug}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...classifieds.map((c) => ({
      url: absoluteUrl(`/clasificados/${c.id}`),
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
    { url: absoluteUrl('/privacidad'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
