import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fetchVehicles, fetchFilters } from "@/lib/api";
import { getCountByCategory } from "@/lib/data";
import { Category, CATEGORIES } from "@/types/vehicle";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import { formatNumber } from "@/lib/format";
import VehicleFilters from "@/app/components/VehicleFilters";
import InventoryToolbar from "@/app/components/InventoryToolbar";
import VehicleList from "@/app/components/VehicleList";
import CatalogPagination from "@/app/components/CatalogPagination";
import { CATALOG_PER_PAGE, catalogHref } from "@/lib/catalog";
import JsonLd from "@/app/components/JsonLd";

/**
 * The catalogue, moved off `/`.
 *
 * It reads searchParams, which opts a route out of static generation entirely —
 * so while it shared a file with the home page, the home paid the catalogue's
 * render cost on every request: ~0.98s TTFB against ~0.12s for a prerendered
 * vehicle page, on the most important page of the site.
 */

interface PageProps {
  searchParams: Promise<{
    page?: string;
    brand?: string;
    category?: string;
    fuel?: string;
    min_price?: string;
    max_price?: string;
    sort?: string;
  }>;
}

const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c.name])
);

/** The filters that identify the listing, in the order the URLs use them. */
function filterParams(params: Awaited<PageProps['searchParams']>) {
  return {
    category: params.category,
    brand: params.brand,
    fuel: params.fuel,
    min_price: params.min_price,
    max_price: params.max_price,
    sort: params.sort,
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const { category } = params;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  if (category && category !== 'all' && !CATEGORY_NAMES[category]) {
    return { robots: { index: false, follow: true }, alternates: { canonical: '/vehiculos' } };
  }

  const categoryName = category && category !== 'all' ? CATEGORY_NAMES[category] : null;
  const base = categoryName
    ? `${categoryName} en Uruguay — Fichas técnicas y precios`
    : 'Todos los vehículos en Uruguay — Fichas técnicas y precios';
  const title = page > 1 ? `${base} — Página ${page}` : base;

  const description = categoryName
    ? `Fichas técnicas de ${categoryName.toLowerCase()} disponibles en Uruguay: especificaciones, precios y equipamiento actualizados.`
    : 'Fichas técnicas de autos, SUVs, camionetas, motos y utilitarios disponibles en Uruguay: especificaciones, precios y equipamiento.';

  // Brand, fuel and price combinations explode into near-duplicate listings.
  // They stay out of the index and point at the clean category URL. Paginated
  // pages are NOT faceted: each one holds vehicles no other page holds, so it
  // self-canonicalises and stays indexable.
  const isFaceted = Boolean(params.brand || params.fuel || params.min_price || params.max_price);

  // `?category=all` serves exactly what the bare listing serves. Dropping it
  // from the canonical is what keeps the two from competing as duplicates —
  // the same trap the old `/?category=all` fell into.
  const canonicalCategory = category === 'all' ? undefined : category;
  const canonical = isFaceted
    ? catalogHref({ category: canonicalCategory }, 1)
    : catalogHref({ category: canonicalCategory }, page);

  return {
    title,
    description,
    ...(isFaceted && { robots: { index: false, follow: true } }),
    openGraph: { title, description, type: 'website', url: absoluteUrl(canonical) },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical },
  };
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  const { vehicles, meta } = await fetchVehicles({
    page,
    limit: CATALOG_PER_PAGE,
    brand: params.brand || undefined,
    category: (params.category && params.category !== 'all') ? params.category as Category : undefined,
    fuelType: params.fuel || undefined,
    minPrice: params.min_price ? parseInt(params.min_price) : undefined,
    maxPrice: params.max_price ? parseInt(params.max_price) : undefined,
    sort: (params.sort as NonNullable<Parameters<typeof fetchVehicles>[0]>['sort']) || undefined,
  });

  const filters = await fetchFilters();
  const brands = (filters.brands || []).map(b => b.name);
  const categoryCounts = await getCountByCategory();

  const categoryName = params.category && params.category !== 'all'
    ? CATEGORY_NAMES[params.category] || params.category
    : null;

  const linkParams = filterParams(params);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName || 'Todos los vehículos',
        item: absoluteUrl(catalogHref({ category: params.category === 'all' ? undefined : params.category }, 1)),
      },
    ],
  };

  return (
    <div className="iv" style={{ paddingBottom: 24 }}>
      <JsonLd data={breadcrumbJsonLd} />

      {/* React hoists these into <head>. The Metadata API has no field for
          them, and a paginated series still needs its sequence declared. */}
      {page > 1 && <link rel="prev" href={absoluteUrl(catalogHref(linkParams, page - 1))} />}
      {page < meta.lastPage && <link rel="next" href={absoluteUrl(catalogHref(linkParams, page + 1))} />}

      <div className="iv__crumb">
        <Link href="/">Inicio</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <Link href="/vehiculos">Vehículos</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span style={{ color: 'var(--text-strong)' }}>{categoryName || 'Todos'}</span>
      </div>
      <h1 className="iv__title">{categoryName || 'Todos los vehículos'}</h1>
      <p className="iv__count">
        {formatNumber(meta.total)} vehículos encontrados
        {meta.lastPage > 1 && ` · página ${page} de ${meta.lastPage}`}
      </p>

      <div className="iv__body">
        <Suspense fallback={<div />}>
          <VehicleFilters brands={brands} categories={categoryCounts} />
        </Suspense>

        <div>
          <Suspense fallback={<div className="iv__toolbar" />}>
            <InventoryToolbar />
          </Suspense>
          {/* Rendered server-side rather than hydrated in: these anchors are
              the catalogue's only internal route to its own vehicle pages. */}
          <VehicleList vehicles={vehicles} />
          <CatalogPagination currentPage={page} totalPages={meta.lastPage} params={linkParams} />
        </div>
      </div>
    </div>
  );
}
