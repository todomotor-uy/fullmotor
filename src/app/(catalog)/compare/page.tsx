import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { X, CarFront } from "lucide-react";
import { getVehicleBySlug } from "@/lib/data";
import { Vehicle } from "@/types/vehicle";
import { formatNumber, fuelToTagType } from "@/lib/format";
import { hasBattery, showsDisplacement, showsFuelTank, showsGearCount } from "@/lib/vehicle-specs";
import { FuelTag } from "@/app/components/ui/FuelTag";
import { ButtonLink } from "@/app/components/ui/Button";
import CompareAdd from "@/app/components/CompareAdd";

export const metadata: Metadata = {
    title: "Comparador de Vehículos",
    robots: { index: false, follow: true },
};

const MAX_VEHICLES = 4;

interface Row {
    label: string;
    get: (v: Vehicle) => React.ReactNode;
    /** Numeric value for best-of-row highlight */
    val?: (v: Vehicle) => number | undefined;
    best?: 'min' | 'max';
    cls?: string;
}

const transmissionNames: Record<string, string> = {
    manual: 'Manual',
    automatica: 'Automática',
    cvt: 'CVT',
};

const ROWS: Row[] = [
    {
        label: 'Precio',
        get: (v) => v.price ? `${v.currency === 'US$' || v.currency === 'U$S' ? 'USD' : v.currency} ${formatNumber(v.price)}` : '–',
        val: (v) => v.price || undefined,
        best: 'min',
        cls: 'price',
    },
    { label: 'Combustible', get: (v) => v.fuelType ? <FuelTag type={fuelToTagType(v.fuelType)} plain /> : '–' },
    { label: 'Potencia', get: (v) => v.engineHp ? `${v.engineHp} HP` : '–', val: (v) => v.engineHp, best: 'max' },
    { label: 'Torque', get: (v) => v.engineTorque ? `${v.engineTorque} Nm` : '–', val: (v) => v.engineTorque, best: 'max' },
    // "–" here means "not applicable", not "missing data": a battery car has no
    // displacement and an EV has no fuel tank. This page had no powertrain
    // logic at all, so it printed "Cilindrada –" on every electric vehicle.
    { label: 'Cilindrada', get: (v) => showsDisplacement(v.fuelType) && v.engineCc ? `${formatNumber(v.engineCc)} cc` : '–' },
    { label: 'Caja', get: (v) => v.transmission ? `${transmissionNames[v.transmission] || v.transmission}${showsGearCount(v.fuelType, v.gears) ? ` · ${v.gears}` : ''}` : '–' },
    { label: 'Batería', get: (v) => hasBattery(v.fuelType) && v.batteryKwh ? `${v.batteryKwh} kWh` : '–', val: (v) => hasBattery(v.fuelType) ? v.batteryKwh : undefined, best: 'max' },
    { label: 'Autonomía', get: (v) => hasBattery(v.fuelType) && v.autonomyKm ? `${formatNumber(v.autonomyKm)} km` : '–', val: (v) => hasBattery(v.fuelType) ? v.autonomyKm : undefined, best: 'max' },
    { label: 'Baúl / Carga', get: (v) => v.trunkCapacity ? `${formatNumber(v.trunkCapacity)} L` : '–', val: (v) => v.trunkCapacity, best: 'max' },
    { label: 'Tanque', get: (v) => showsFuelTank(v.fuelType) && v.fuelTank ? `${v.fuelTank} L` : '–' },
    { label: 'Largo', get: (v) => v.length ? `${formatNumber(v.length)} mm` : '–' },
    { label: 'Ancho', get: (v) => v.width ? `${formatNumber(v.width)} mm` : '–' },
    { label: 'Alto', get: (v) => v.height ? `${formatNumber(v.height)} mm` : '–' },
    { label: 'Entre ejes', get: (v) => v.wheelbase ? `${formatNumber(v.wheelbase)} mm` : '–' },
    { label: 'Peso', get: (v) => v.weight ? `${formatNumber(v.weight)} kg` : '–', val: (v) => v.weight, best: 'min' },
];

/** Slugs of the winners for a row — only when every vehicle has the value. */
function bestSlugs(row: Row, cars: Vehicle[]): string[] {
    if (!row.best || !row.val || cars.length < 2) return [];
    const vals = cars.map((c) => ({ slug: c.slug, n: row.val!(c) }));
    if (vals.some((x) => x.n == null)) return [];
    const nums = vals.map((x) => x.n as number);
    const pick = row.best === 'min' ? Math.min(...nums) : Math.max(...nums);
    return vals.filter((x) => x.n === pick).map((x) => x.slug);
}

export default async function ComparatorPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;

    // Canonical param: ?vehicles=slug1,slug2,… — legacy ?vehicle1=&vehicle2= still accepted
    const fromList = typeof params.vehicles === 'string' ? params.vehicles.split(',') : [];
    const legacy = [params.vehicle1, params.vehicle2].filter((s): s is string => typeof s === 'string' && s.length > 0);
    const slugs = [...new Set([...fromList, ...legacy].map((s) => s.trim()).filter(Boolean))].slice(0, MAX_VEHICLES);

    const cars = (await Promise.all(slugs.map((s) => getVehicleBySlug(s)))).filter((v): v is Vehicle => !!v);
    const carSlugs = cars.map((c) => c.slug);

    const removeHref = (slug: string) => {
        const rest = carSlugs.filter((s) => s !== slug);
        return rest.length > 0 ? `/compare?vehicles=${rest.join(',')}` : '/compare';
    };

    // Skip rows where no vehicle has data
    const visibleRows = ROWS.filter((row) => cars.some((c) => {
        const content = row.get(c);
        return content !== '–';
    }));

    return (
        <div className="cm" style={{ paddingBottom: 24 }}>
            <h1 className="cm__title">Comparador</h1>
            <p className="cm__sub">Enfrentá hasta {MAX_VEHICLES} vehículos y mirá las diferencias que importan.</p>

            {cars.length === 0 ? (
                <div className="iv__empty" style={{ maxWidth: 520 }}>
                    <p style={{ margin: '0 0 18px' }}>Elegí hasta {MAX_VEHICLES} vehículos para enfrentarlos.</p>
                    <CompareAdd current={[]} />
                </div>
            ) : (
                <div className="cm__wrap">
                    <table className="cm__table">
                        <thead>
                            <tr>
                                <th className="cm__rowlabel" style={{ borderTop: 'none' }}></th>
                                {cars.map((v) => (
                                    <th className="cm__col cm__head" key={v.slug}>
                                        <div className="cm__hcard">
                                            <div className="cm__media">
                                                <Link className="cm__rm" href={removeHref(v.slug)} aria-label={`Quitar ${v.brand} ${v.model}`}>
                                                    <X size={15} aria-hidden="true" />
                                                </Link>
                                                {v.image
                                                    ? <Image src={v.image} alt={`${v.brand} ${v.model}`} fill sizes="240px" style={{ objectFit: 'cover' }} />
                                                    : <CarFront size={26} aria-hidden="true" />}
                                            </div>
                                            <span className="cm__hbrand">{v.brand} · {v.year}</span>
                                            <span className="cm__hmodel">{v.model}</span>
                                            {v.version && <span className="cm__htrim">{v.version}</span>}
                                        </div>
                                    </th>
                                ))}
                                {cars.length < MAX_VEHICLES && (
                                    <th className="cm__col cm__add">
                                        <CompareAdd current={carSlugs} />
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row, ri) => {
                                const best = bestSlugs(row, cars);
                                return (
                                    <tr key={ri}>
                                        <td className="cm__rowlabel">{row.label}</td>
                                        {cars.map((v) => (
                                            <td key={v.slug} className={`cm__col cm__cell ${row.cls || ''}${best.includes(v.slug) ? ' best' : ''}`}>
                                                {row.get(v)}
                                            </td>
                                        ))}
                                        {cars.length < MAX_VEHICLES && <td className="cm__col"></td>}
                                    </tr>
                                );
                            })}
                            <tr>
                                <td className="cm__rowlabel"></td>
                                {cars.map((v) => (
                                    <td key={v.slug} className="cm__col cm__cell">
                                        <ButtonLink size="sm" variant="secondary" block href={`/vehiculo/${v.slug}`}>Ver ficha</ButtonLink>
                                    </td>
                                ))}
                                {cars.length < MAX_VEHICLES && <td className="cm__col"></td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
