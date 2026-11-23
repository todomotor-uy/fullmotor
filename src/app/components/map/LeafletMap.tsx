'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { UY_CENTER, UY_ZOOM, type LatLng } from '@/lib/location'

/**
 * Drawn in CSS rather than Leaflet's default PNG marker, whose image paths
 * the bundler does not resolve.
 */
const pinIcon = L.divIcon({
  className: 'tm-map-pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

/** Zoom used once something is pinned: close enough to see the street. */
const PIN_ZOOM = 15

interface LeafletMapProps {
  pin: LatLng | null
  /** Makes the map editable: a tap places the pin, dragging moves it. */
  onChange?: (pin: LatLng) => void
  /** Where to look while nothing is pinned, e.g. the chosen department. */
  focus?: LatLng | null
  className?: string
}

function ClickToPlace({ onChange }: { onChange: (pin: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

/** Follows the pin when it is set from outside (e.g. "Usar mi ubicación"). */
function FollowPin({ pin }: { pin: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (pin) map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), PIN_ZOOM))
  }, [pin, map])
  return null
}

/** Flies to the focus (a department) while there is no pin to show. */
function FollowFocus({ focus, pin }: { focus?: LatLng | null; pin: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (focus && !pin) map.setView([focus.lat, focus.lng], 11)
    // Only when the focus changes; a pin placed later must not be undone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, map])
  return null
}

export default function LeafletMap({ pin, onChange, focus, className }: LeafletMapProps) {
  const center = pin ?? UY_CENTER
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={pin ? PIN_ZOOM : UY_ZOOM}
      scrollWheelZoom={false}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pin && (
        <Marker
          position={[pin.lat, pin.lng]}
          icon={pinIcon}
          draggable={Boolean(onChange)}
          eventHandlers={
            onChange
              ? {
                  dragend(e) {
                    const p = (e.target as L.Marker).getLatLng()
                    onChange({ lat: p.lat, lng: p.lng })
                  },
                }
              : undefined
          }
        />
      )}
      {onChange && <ClickToPlace onChange={onChange} />}
      {onChange && <FollowPin pin={pin} />}
      {onChange && <FollowFocus focus={focus} pin={pin} />}
    </MapContainer>
  )
}
