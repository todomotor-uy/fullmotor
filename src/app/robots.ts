import type { MetadataRoute } from 'next'
import { absoluteUrl, SITE_URL } from '@/lib/site'
import { IS_NAUTI } from '@/lib/tenant'

export default function robots(): MetadataRoute.Robots {
  // Cardinal Sur is on a temporary preview domain until launch: keep it out of the
  // index so the preview URL never competes with cardinalsur.uy. Set
  // NEXT_PUBLIC_INDEXABLE=1 on the project once the real domain is live.
  //
  // The home page and the privacy policy stay fetchable: Google reads them to
  // verify the sign-in branding, and treats a disallowed home page as
  // unresponsive. They are still kept out of the index by the noindex every
  // page sends (layout.tsx).
  if (IS_NAUTI && process.env.NEXT_PUBLIC_INDEXABLE !== '1') {
    return { rules: [{ userAgent: '*', allow: ['/$', '/privacidad'], disallow: '/' }] }
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or user-specific surfaces. They also send noindex, but
        // keeping them out of the crawl saves budget for vehicles and articles.
        disallow: [
          '/admin',
          '/api',
          '/guardados',
          '/compare',
          '/clasificados/nuevo',
          '/clasificados/mis',
          '/clasificados/*/editar',
          // The storefronts themselves stay crawlable — they are the point.
          // Only the private surfaces around them are excluded.
          '/comercios/solicitar',
          '/comercios/panel',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
