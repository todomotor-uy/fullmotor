'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Crosshair, MapPin, X } from 'lucide-react'
import type { LatLng } from '@/lib/location'

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="tm-map__loading">Cargando mapa…</div>,
})

interface MapPickerProps {
  value: LatLng | null
  onChange: (pin: LatLng | null) => void
  /** What the pin marks, for the hint: "tu comercio", "dónde se da el servicio". */
  subject?: string
  /** Where to look while nothing is pinned, e.g. the chosen department. */
  focus?: LatLng | null
}

/** An optional map pin: tap to place, drag to adjust, remove to leave it out. */
export default function MapPicker({ value, onChange, subject = 'el lugar', focus }: MapPickerProps) {
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Tu navegador no comparte la ubicación.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocating(false)
        setGeoError('No pudimos obtener tu ubicación. Marcala tocando el mapa.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted flex items-center gap-1.5">
          <MapPin size={14} aria-hidden="true" />
          {value ? 'Podés arrastrar el pin para ajustarlo.' : `Opcional: tocá el mapa para marcar ${subject}.`}
        </p>
        <div className="flex gap-2">
          <button type="button" className="tm-btn tm-btn--secondary tm-btn--sm" onClick={useMyLocation} disabled={locating}>
            <Crosshair size={14} aria-hidden="true" />
            {locating ? 'Buscando…' : 'Usar mi ubicación'}
          </button>
          {value && (
            <button type="button" className="tm-btn tm-btn--ghost tm-btn--sm" onClick={() => onChange(null)}>
              <X size={14} aria-hidden="true" />
              Quitar pin
            </button>
          )}
        </div>
      </div>
      <div className="tm-map">
        <LeafletMap pin={value} onChange={onChange} focus={focus} />
      </div>
      {geoError && <p className="text-xs text-danger">{geoError}</p>}
    </div>
  )
}
