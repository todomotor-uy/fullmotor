'use client'

import dynamic from 'next/dynamic'
import { Navigation } from 'lucide-react'
import { directionsUrl, type LatLng } from '@/lib/location'

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="tm-map__loading">Cargando mapa…</div>,
})

interface MapViewProps {
  pin: LatLng
  /** Shown above the map, e.g. the address. */
  label?: string
}

/** A read-only map with the pin and a "Cómo llegar" link. */
export default function MapView({ pin, label }: MapViewProps) {
  return (
    <div className="space-y-2">
      <div className="tm-map tm-map--view">
        <LeafletMap pin={pin} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {label ? <p className="text-sm text-muted">{label}</p> : <span />}
        <a href={directionsUrl(pin)} target="_blank" rel="noopener noreferrer" className="tm-btn tm-btn--secondary tm-btn--sm">
          <Navigation size={14} aria-hidden="true" />
          Cómo llegar
        </a>
      </div>
    </div>
  )
}
