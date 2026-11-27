import { fetchVehicles, fetchFilters } from "@/lib/api";
import { getLatestVehicles, getCountByCategory } from "@/lib/data";
import { absoluteUrl, SITE_LOGO, SITE_NAME, SITE_URL } from "@/lib/site";
import HeroSection from "./components/HeroSection";
import GuideCta from "./components/GuideCta";
import CategoryGrid from "./components/CategoryGrid";
import PremiumListings from "./components/PremiumListings";
import JsonLd from "./components/JsonLd";
import AdSlot from "./components/ads/AdSlot";
import BrandStrip from "./components/BrandStrip";
import BlogPreviewSection from "./components/BlogPreviewSection";
import { getLatestBlogPosts } from "@/lib/blog";
import { IS_NAUTI, SITE_CONFIG } from "@/lib/tenant";
import NautiHome from "./components/nauti/NautiHome";

/**
 * The home page, and nothing else.
 *
 * It used to double as the catalogue, switching on searchParams — and reading
 * searchParams opts a route out of static generation entirely, so the home was
 * server-rendered on every request: `cache-control: no-store`, x-vercel-cache
 * MISS and ~0.98s TTFB, against ~0.12s for a prerendered vehicle page. The
 * catalogue now lives at /vehiculos, which leaves this route static.
 */

// Vehicle counts and the latest listings move at most daily; the fetches
// underneath already revalidate on their own.
export const revalidate = 3600;

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: SITE_LOGO },
  contactPoint: {
    '@type': 'ContactPoint',
    email: SITE_CONFIG.contactEmail,
    contactType: 'customer service',
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'es-UY',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: absoluteUrl('/vehiculos?brand={search_term_string}') },
    'query-input': 'required name=search_term_string',
  },
};

export default async function Home() {
  // Each tenant has its own home; Nauti has no vehicle catalogue to fetch.
  if (IS_NAUTI) return <NautiHome />;

  const [{ meta }, filters, latestVehicles, categoryCounts, latestBlogPosts] = await Promise.all([
    fetchVehicles({ page: 1, limit: 1 }),
    fetchFilters(),
    getLatestVehicles(8),
    getCountByCategory(),
    getLatestBlogPosts(3),
  ]);

  const brandsCount = (filters.brands || []).length;

  return (
    <div style={{ paddingBottom: 24 }}>
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={organizationJsonLd} />
      <HeroSection total={meta.total} brandsCount={brandsCount} />
      {/* Below the hero, never above it: the hero image is the LCP element on
          the home page and an ad ahead of it would trade ranking for a slot. */}
      <AdSlot placement="home_top" />
      {/* Editorial first: the news is the reason to come back, and it is the
          only section that changes between visits. The category grid is
          navigation the header already offers, so it closes the page. */}
      <BlogPreviewSection posts={latestBlogPosts} />
      <PremiumListings vehicles={latestVehicles} />
      {/* The route into /marcas. Sits between the latest listings and the ad
          because "which brands are there" is the natural next question after
          seeing a handful of models. */}
      <BrandStrip brands={filters.brands || []} />
      <AdSlot placement="home_mid" />
      <GuideCta />
      <CategoryGrid categories={categoryCounts} totalCount={meta.total} />
    </div>
  );
}
