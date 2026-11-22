import Link from "next/link";
import AdSlot from '@/app/components/ads/AdSlot'
import { notFound } from "next/navigation";
import { Check, ChevronRight, GitCompareArrows } from "lucide-react";
import { getVehicleBySlug, getAllVehicles } from "@/lib/data";
import { formatNumber, formatPrice, fuelLabel, fuelToTagType, normalizeCurrency } from "@/lib/format";
import ImageCarousel from "@/app/components/ImageCarousel";
import JsonLd from "@/app/components/JsonLd";
import CommentsSection from "@/app/components/CommentsSection";
import SaveVehicleButton from "@/app/components/SaveVehicleButton";
import PriceHistory from "@/app/components/PriceHistory";
import { Badge } from "@/app/components/ui/Badge";
import { FuelTag } from "@/app/components/ui/FuelTag";
import { ButtonLink } from "@/app/components/ui/Button";
import { SpecGrid, type SpecGroup } from "@/app/components/ui/SpecGrid";
import { isRecentlyListed } from "@/lib/vehicle-card";
import { hasRecentPriceDrop } from "@/lib/price-history";
import { hasBattery, isElectric, showsDisplacement, showsFuelTank, showsGearCount } from "@/lib/vehicle-specs";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import { brandSlug } from "@/lib/catalog";
import type { Vehicle } from "@/types/vehicle";
import { SITE_CONFIG } from '@/lib/tenant';

type Params = Promise<{ slug: string }>

/**
 * Google truncates the snippet around 155 characters. Using vehicle.description
 * meant shipping the whole editorial paragraph — 454 characters on average and
 * 1.359 at worst — so every figure worth showing sat past the cut. Build the
 * snippet from the specs instead; the long copy still runs in the page body,
 * where it earns its keep.
 */
function buildMetaDescription(vehicle: Vehicle): string {
  const specs = [
    vehicle.engineHp && `${vehicle.engineHp} HP`,
    vehicle.fuelType && fuelLabel(vehicle.fuelType),
    vehicle.transmission && (transmissionNames[vehicle.transmission] || vehicle.transmission),
  ].filter(Boolean).join(', ');

  const description = [
    `${vehicle.brand} ${vehicle.model} ${vehicle.year} en Uruguay`,
    specs ? `: ${specs}` : '',
    vehicle.price ? `. Precio ${formatPrice(vehicle.currency, vehicle.price)}` : '',
    '. Ficha técnica completa.',
  ].join('');

  // A long brand and model can still overrun on their own. Cut on a word
  // boundary so the snippet never ends mid-word.
  if (description.length <= 155) return description;
  return description.slice(0, 152).replace(/[\s,.:]+\S*$/, '') + '…';
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: 'Vehiculo no encontrado' };

  const title = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`;
  const priceText = vehicle.price ? ` - ${formatPrice(vehicle.currency, vehicle.price)}` : '';
  const description = buildMetaDescription(vehicle);

  return {
    title,
    description,
    openGraph: {
      title: `${title}${priceText}`,
      description,
      type: 'website',
      url: absoluteUrl(`/vehiculo/${slug}`),
      images: vehicle.images?.length > 0
        ? vehicle.images.map((img) => ({ url: img }))
        : vehicle.image ? [{ url: vehicle.image }] : [],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `${title}${priceText}`,
      description,
      images: vehicle.image ? [vehicle.image] : [],
    },
    alternates: {
      canonical: `/vehiculo/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  // Sites without the catalogue 404 these routes in middleware; don't build them.
  if (!SITE_CONFIG.features.catalog) return [];
  const vehicles = await getAllVehicles();
  return vehicles.map(v => ({ slug: v.slug }));
}

const categoryNames: Record<string, string> = {
  autos: 'Autos',
  suvs: 'SUVs',
  pickups: 'Camionetas',
  motos: 'Motos',
  utilitarios: 'Utilitarios'
};

const categorySingular: Record<string, string> = {
  autos: 'Auto',
  suvs: 'SUV',
  pickups: 'Camioneta',
  motos: 'Moto',
  utilitarios: 'Utilitario'
};

const transmissionNames: Record<string, string> = {
  manual: 'Manual',
  automatica: 'Automática',
  cvt: 'CVT'
};

export default async function VehiclePage({ params }: { params: Params }) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) {
    notFound();
  }

  const allImages = vehicle.images?.length > 0
    ? [vehicle.image, ...vehicle.images].filter((v, i, a) => v && a.indexOf(v) === i) as string[]
    : vehicle.image ? [vehicle.image] : [];

  const categorySchemaType = ['autos', 'suvs', 'pickups'].includes(vehicle.category)
    ? 'Car'
    : vehicle.category === 'motos'
      ? 'Motorcycle'
      : 'Vehicle';

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': categorySchemaType,
    name: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
    brand: { '@type': 'Brand', name: vehicle.brand },
    model: vehicle.model,
    modelDate: String(vehicle.year),
    vehicleModelDate: String(vehicle.year),
    image: allImages,
    description: vehicle.description || `Ficha técnica del ${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
    url: absoluteUrl(`/vehiculo/${vehicle.slug}`),
    ...(vehicle.fuelType && { fuelType: vehicle.fuelType }),
    ...(vehicle.transmission && { vehicleTransmission: vehicle.transmission }),
    ...(vehicle.engineCc && { vehicleEngine: { '@type': 'EngineSpecification', engineDisplacement: { '@type': 'QuantitativeValue', value: vehicle.engineCc, unitCode: 'CMQ' } } }),
    offers: vehicle.price ? {
      '@type': 'Offer',
      price: vehicle.price,
      priceCurrency: normalizeCurrency(vehicle.currency),
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`/vehiculo/${vehicle.slug}`),
    } : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: categoryNames[vehicle.category], item: absoluteUrl(`/vehiculos?category=${vehicle.category}`) },
      { '@type': 'ListItem', position: 3, name: vehicle.brand, item: absoluteUrl(`/marcas/${brandSlug(vehicle.brand)}`) },
      { '@type': 'ListItem', position: 4, name: vehicle.model },
    ],
  };

  const isEV = isElectric(vehicle.fuelType);
  // Hybrids have both a battery and an engine, so they get both sets of rows.
  // They used to get neither battery figure, because the old check was
  // "electric only".
  const showsBattery = hasBattery(vehicle.fuelType);

  // 4 KPI tiles — pick the most relevant available specs
  const kpis: { k: string; v: string }[] = [];
  if (vehicle.engineHp) kpis.push({ k: 'Potencia', v: `${vehicle.engineHp} HP` });
  if (showsBattery && vehicle.batteryKwh) kpis.push({ k: 'Batería', v: `${vehicle.batteryKwh} kWh` });
  else if (showsDisplacement(vehicle.fuelType) && vehicle.engineCc) kpis.push({ k: 'Cilindrada', v: `${formatNumber(vehicle.engineCc)} cc` });
  if (vehicle.transmission) kpis.push({ k: 'Caja', v: transmissionNames[vehicle.transmission] || vehicle.transmission });
  if (showsBattery && vehicle.autonomyKm) kpis.push({ k: 'Autonomía', v: `${formatNumber(vehicle.autonomyKm)} km` });
  else if (vehicle.fuelType) kpis.push({ k: 'Combustible', v: fuelLabel(vehicle.fuelType) });

  // Ficha técnica groups
  const motorItems = [
    showsDisplacement(vehicle.fuelType) && vehicle.engineCc ? { label: 'Cilindrada', value: `${formatNumber(vehicle.engineCc)} cc` } : null,
    vehicle.engineHp ? { label: 'Potencia', value: `${vehicle.engineHp} HP`, highlight: true } : null,
    vehicle.engineTorque ? { label: 'Torque', value: `${vehicle.engineTorque} Nm` } : null,
    vehicle.transmission ? { label: 'Caja', value: transmissionNames[vehicle.transmission] || vehicle.transmission } : null,
    showsGearCount(vehicle.fuelType, vehicle.gears) ? { label: 'Marchas', value: String(vehicle.gears) } : null,
    showsBattery && vehicle.batteryKwh ? { label: 'Batería', value: `${vehicle.batteryKwh} kWh` } : null,
    showsBattery && vehicle.autonomyKm ? { label: 'Autonomía', value: `${formatNumber(vehicle.autonomyKm)} km` } : null,
  ].filter(Boolean) as SpecGroup['items'];

  const capacityItems = [
    vehicle.fuelType ? { label: 'Combustible', value: fuelLabel(vehicle.fuelType) } : null,
    showsFuelTank(vehicle.fuelType) && vehicle.fuelTank ? { label: 'Tanque', value: `${vehicle.fuelTank} L` } : null,
    vehicle.trunkCapacity ? { label: vehicle.category === 'pickups' ? 'Capacidad de carga' : 'Baúl', value: `${formatNumber(vehicle.trunkCapacity)} L` } : null,
    vehicle.weight ? { label: 'Peso', value: `${formatNumber(vehicle.weight)} kg` } : null,
  ].filter(Boolean) as SpecGroup['items'];

  const dimensionItems = [
    vehicle.length ? { label: 'Largo', value: `${formatNumber(vehicle.length)} mm` } : null,
    vehicle.width ? { label: 'Ancho', value: `${formatNumber(vehicle.width)} mm` } : null,
    vehicle.height ? { label: 'Alto', value: `${formatNumber(vehicle.height)} mm` } : null,
    vehicle.wheelbase ? { label: 'Distancia entre ejes', value: `${formatNumber(vehicle.wheelbase)} mm` } : null,
    { label: 'Año modelo', value: String(vehicle.year) },
  ].filter(Boolean) as SpecGroup['items'];

  const leftGroups: SpecGroup[] = motorItems.length ? [{ title: 'Motor y rendimiento', items: motorItems }] : [];
  const rightGroups: SpecGroup[] = [
    ...(capacityItems.length ? [{ title: isEV ? 'Energía y capacidad' : 'Consumo y capacidad', items: capacityItems }] : []),
    ...(dimensionItems.length ? [{ title: 'Dimensiones', items: dimensionItems }] : []),
  ];

  const saveSnapshot = {
    slug: vehicle.slug,
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    year: vehicle.year,
    price: vehicle.price,
    currency: vehicle.currency,
    fuelType: vehicle.fuelType,
    engineHp: vehicle.engineHp,
    image: allImages[0],
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="dt">
        <div className="dt__crumb">
          <Link href="/">Inicio</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href={`/vehiculos?category=${vehicle.category}`}>{categoryNames[vehicle.category]}</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link href={`/marcas/${brandSlug(vehicle.brand)}`}>{vehicle.brand}</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span style={{ color: 'var(--text-strong)' }}>{vehicle.model}</span>
        </div>

        <div className="dt__top">
          <div>
            <ImageCarousel
              images={allImages}
              altPrefix={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
              badge={isRecentlyListed(vehicle.publishedAt, vehicle.createdAt) ? `Nuevo · ${vehicle.year}` : undefined}
            />
            {vehicle.description && (
              <p className="dt__desc" style={{ marginTop: 24 }}>
                {vehicle.description}
              </p>
            )}
          </div>

          <div className="dt__panel">
            {/* Brand and year live inside the h1 rather than in a sibling
                eyebrow. On their own, model names like "Han", "#1", "911" or
                "bZ4X" told a search result nothing about what the page is. The
                eyebrow styling is kept, so the panel reads as it did before. */}
            <h1 className="dt__model">
              <span className="dt__ey">{vehicle.brand}</span>
              {vehicle.model} <span className="dt__year">{vehicle.year}</span>
            </h1>
            {vehicle.version && <div className="dt__trim">{vehicle.version}</div>}

            <div className="dt__tags">
              {vehicle.fuelType && <FuelTag type={fuelToTagType(vehicle.fuelType)} />}
              <Badge tone="neutral" variant="outline">{categorySingular[vehicle.category]}</Badge>
              <Badge tone="positive" dot>Disponible</Badge>
              {hasRecentPriceDrop(vehicle.priceHistory) && <Badge tone="positive" variant="solid" dot>Bajó de precio</Badge>}
            </div>

            {vehicle.price ? (
              <>
                <div className="dt__price">
                  <span className="cur">{normalizeCurrency(vehicle.currency)}</span>
                  {formatNumber(vehicle.price)}
                </div>
                <div className="dt__pricenote">Precio de referencia · no incluye gastos de gestoría</div>
              </>
            ) : (
              <div className="dt__pricenote" style={{ marginTop: 22 }}>Precio a consultar con el concesionario</div>
            )}

            <div className="dt__cta">
              <ButtonLink size="lg" href={`/compare?vehicles=${vehicle.slug}`} iconLeft={<GitCompareArrows size={18} aria-hidden="true" />}>
                Comparar
              </ButtonLink>
              <SaveVehicleButton snapshot={saveSnapshot} />
            </div>

            {kpis.length > 0 && (
              <div className="dt__kpis">
                {kpis.slice(0, 4).map((kpi) => (
                  <div className="dt__kpi" key={kpi.k}>
                    <div className="k">{kpi.k}</div>
                    <div className="v">{kpi.v}</div>
                  </div>
                ))}
              </div>
            )}

            {vehicle.relatedVersions && vehicle.relatedVersions.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <h4 className="tm-eyebrow" style={{ margin: '0 0 10px' }}>Otras versiones disponibles</h4>
                <div className="dt__versions">
                  {vehicle.relatedVersions.map((v) => (
                    <Link key={v.slug} href={`/vehiculo/${v.slug}`}>
                      <span>{v.version || vehicle.model}</span>
                      {v.price != null && (
                        <span className="p">
                          {formatPrice(v.currency, v.price)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <PriceHistory history={vehicle.priceHistory ?? []} />

            {/* Sticky panel, so this slot has the best viewability on the
                site — which is also why useAdImpression disconnects after the
                first count instead of billing a scroll. Targeted by the
                vehicle's own brand and category. */}
            <AdSlot
              placement="detail_panel"
              targeting={{ brand: vehicle.brand, category: vehicle.category }}
            />

            <p style={{ marginTop: 24, fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              ¿Encontraste un error? Escribinos a <a href="mailto:contacto@todomotor.uy">contacto@todomotor.uy</a>
            </p>
          </div>
        </div>
      </div>

      {(leftGroups.length > 0 || rightGroups.length > 0) && (
        <section className="dt__specs">
          <h2>Ficha técnica</h2>
          <div className="dt__cols">
            {leftGroups.length > 0 && <SpecGrid cols={1} groups={leftGroups} />}
            {rightGroups.length > 0 && <SpecGrid cols={1} groups={rightGroups} />}
          </div>
        </section>
      )}

      {vehicle.safetyFeatures && vehicle.safetyFeatures.length > 0 && (
        <section className="dt__specs">
          <h2>Seguridad</h2>
          <ul className="dt__feats">
            {vehicle.safetyFeatures.map((feature: string, i: number) => (
              <li key={i}><Check size={16} aria-hidden="true" />{feature}</li>
            ))}
          </ul>
        </section>
      )}

      {vehicle.equipment && vehicle.equipment.length > 0 && (
        <section className="dt__specs">
          <h2>Equipamiento</h2>
          <ul className="dt__feats">
            {vehicle.equipment.map((item: string, i: number) => (
              <li key={i}><Check size={16} aria-hidden="true" />{item}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="dt__specs">
        <CommentsSection resourceId={slug} />
      </div>
    </div>
  );
}
