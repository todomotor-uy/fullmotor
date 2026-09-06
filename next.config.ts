import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: the vehicle slug redirects live in src/middleware.ts, not here.
  // The old slugs contain `+`, `(`, `)` and `:`, which path-to-regexp treats as
  // quantifiers and capture groups — `redirects()` cannot express them.

  /**
   * The catalogue moved from `/?category=x` to `/vehiculos?category=x`.
   *
   * Keyed on the presence of the `category` query parameter, so a bare `/` —
   * the home page, and the far more common request — is never redirected. Next
   * carries the rest of the query string over on its own, so brand, fuel, price
   * and sort survive the hop. 308 rather than 301 only because that is what
   * `permanent: true` emits; both are permanent and pass authority.
   */
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'query', key: 'category', value: '(?<category>.*)' }],
        destination: '/vehiculos?category=:category',
        permanent: true,
      },
      {
        source: '/',
        has: [{ type: 'query', key: 'brand' }],
        destination: '/vehiculos',
        permanent: true,
      },
    ];
  },
  images: {
    /**
     * Optimizacion de imagenes: el costo se paga por transformacion nueva y por
     * escritura de cache, no por lectura. Con el catalogo creciendo, cada modelo
     * multiplica sus variantes por cada breakpoint, cada quality y cada formato.
     *
     * minimumCacheTTL a 31 dias: las fotos de un vehiculo no cambian una vez
     * cargadas, y si cambian el slug cambia con ellas.
     * deviceSizes recortado a los cuatro anchos que el diseno usa de verdad
     * (se cayeron 750, 1080, 2048 y 3840).
     * imageSizes cubre los `sizes` fijos de 160px y 240px a 1x y 2x.
     * qualities con un solo valor: no hay ningun `quality=` en el codigo.
     */
    minimumCacheTTL: 2678400,
    formats: ['image/webp'],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [160, 256, 320, 384],
    qualities: [75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
