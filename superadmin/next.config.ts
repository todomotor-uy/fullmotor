import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * This app lives inside vitri-web, which has its own lockfile one level up.
   * Left to infer it, Next picks the outer one as the workspace root and then
   * compiles the portal's src/instrumentation.ts and middleware into this
   * build. Pin both roots here.
   */
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  /**
   * Internal tool: no page is for search engines. The header covers every
   * response, robots.ts asks crawlers to stay out, and the layout's metadata
   * repeats it in the HTML.
   */
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
}

export default nextConfig
