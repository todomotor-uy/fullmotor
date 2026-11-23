/** A map pin. */
export interface LatLng {
  lat: number
  lng: number
}

/**
 * Uruguay's departments, spelled as the API returns them. The API matches
 * them ignoring case and accents and refuses anything else, so this list is
 * what the selects offer and what the filter sends.
 */
export const UY_DEPARTMENTS = [
  'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores',
  'Florida', 'Lavalleja', 'Maldonado', 'Montevideo', 'Paysandú',
  'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano',
  'Tacuarembó', 'Treinta y Tres',
] as const

/**
 * Roughly each department's capital: where the map flies when a department
 * is picked and nothing is pinned yet, so the pin goes in with one zoom.
 */
export const UY_DEPARTMENT_CENTERS: Record<string, LatLng> = {
  Artigas: { lat: -30.4, lng: -56.47 },
  Canelones: { lat: -34.52, lng: -56.28 },
  'Cerro Largo': { lat: -32.37, lng: -54.17 },
  Colonia: { lat: -34.47, lng: -57.84 },
  Durazno: { lat: -33.38, lng: -56.52 },
  Flores: { lat: -33.52, lng: -56.9 },
  Florida: { lat: -34.1, lng: -56.21 },
  Lavalleja: { lat: -34.37, lng: -55.23 },
  Maldonado: { lat: -34.91, lng: -54.96 },
  Montevideo: { lat: -34.9, lng: -56.19 },
  Paysandú: { lat: -32.32, lng: -58.08 },
  'Río Negro': { lat: -33.12, lng: -58.3 },
  Rivera: { lat: -30.9, lng: -55.55 },
  Rocha: { lat: -34.48, lng: -54.33 },
  Salto: { lat: -31.39, lng: -57.96 },
  'San José': { lat: -34.34, lng: -56.71 },
  Soriano: { lat: -33.25, lng: -58.03 },
  Tacuarembó: { lat: -31.71, lng: -55.98 },
  'Treinta y Tres': { lat: -33.23, lng: -54.38 },
}

/** Where the map opens when nothing is pinned yet: all of Uruguay. */
export const UY_CENTER: LatLng = { lat: -32.6, lng: -56.0 }
export const UY_ZOOM = 6

/** The pin a record carries, if it has one. */
export function pinOf(r: { latitude?: number | null; longitude?: number | null }): LatLng | null {
  return r.latitude != null && r.longitude != null ? { lat: r.latitude, lng: r.longitude } : null
}

/** "Maldonado" or "Punta del Este, Maldonado", without repeating "Montevideo, Montevideo". */
export function placeLabel(city?: string | null, department?: string | null): string {
  const c = city?.trim()
  const d = department?.trim()
  if (c && d && c.toLowerCase() !== d.toLowerCase()) return `${c}, ${d}`
  return c || d || ''
}

/** Directions in Google Maps to a pin. */
export function directionsUrl(p: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
}
