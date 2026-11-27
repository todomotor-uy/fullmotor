import type { MetadataRoute } from 'next'

/** Internal tool: nothing here is for crawlers. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
