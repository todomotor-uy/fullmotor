'use client'

import { useEffect, useRef, useState } from 'react'
import { PLACEMENTS, placementModifier, type PlacementCode } from './placements'
import { seenParam } from './ad-queue'
import { useAdImpression } from './useAdImpression'
import AdCreativeRender from './AdCreativeRender'
import type { AdTargeting, ServedAd } from './types'
import { SITE_CONFIG } from '@/lib/tenant'

/**
 * One ad slot.
 *
 * It is a client component, and that is the central design decision rather
 * than a convenience. The vehicle page and every article are ISR with
 * `revalidate: 60`, so a Server Component asking for a creative would freeze
 * one advertiser into the HTML for a minute at a time: no rotation, and an
 * impression count that means nothing because the same response is replayed
 * to everyone. Making these pages dynamic instead would hand back the ISR that
 * carries all of the organic traffic — which is the inventory being sold.
 *
 * So the ad is fetched from the browser, after hydration, and only once the
 * slot is near the viewport.
 */

interface AdSlotProps {
  placement: PlacementCode
  targeting?: AdTargeting
  /** Distinguishes repeated in-feed slots on one page for React's key. */
  index?: number
  className?: string
  /**
   * Extra disclosure rendered under the creative — the buying guide's "no
   * participa del ranking" line.
   *
   * It lives inside the slot rather than beside it on purpose: rendered by the
   * parent, it survives when the slot collapses, and the page ends up showing
   * a disclaimer about an ad that is not there.
   */
  disclosure?: string
}

/** Start fetching before the slot is on screen, so the creative is usually
 *  there by the time the reader reaches it. */
const PREFETCH_MARGIN = '600px'

function currentDevice(): 'desktop' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop'
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop'
}

/**
 * Sites without advertising render nothing. A wrapper rather than an early
 * return inside the slot, which would put its hooks behind a condition.
 */
export default function AdSlot(props: AdSlotProps) {
  if (!SITE_CONFIG.features.ads) return null
  return <AdSlotInner {...props} />
}

function AdSlotInner({ placement, targeting, className, disclosure }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Flattened here so the effect's dependency list stays statically checkable
  // and a fresh `targeting` object literal from the parent does not restart
  // the fetch on every render.
  const tagsKey = targeting?.tags?.join(',') ?? ''
  const [ad, setAd] = useState<ServedAd | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'filled' | 'empty'>('idle')

  useAdImpression(ad, containerRef)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const size = PLACEMENTS[placement]
    const device = currentDevice()
    const other = device === 'mobile' ? 'desktop' : 'mobile'
    // A zero size on this device only means "hidden here" when the other
    // device has a real size — the inventory sidebar below 1000px, for
    // instance. When both are zero the placement simply has no fixed size,
    // which is what a native creative like the buying-guide slot looks like;
    // bailing there would silently disable the highest-value product on the
    // site.
    if (size[device][0] === 0 && size[other][0] !== 0) {
      setState('empty')
      return
    }

    let cancelled = false

    async function load() {
      setState('loading')
      const params = new URLSearchParams({ placement, device })
      if (targeting?.vehicleType) params.set('vehicleType', targeting.vehicleType)
      if (targeting?.brand) params.set('brand', targeting.brand)
      if (targeting?.category) params.set('category', targeting.category)
      if (targeting?.use) params.set('use', targeting.use)
      if (targeting?.band) params.set('band', targeting.band)
      if (targeting?.tags?.length) params.set('tags', targeting.tags.join(','))
      const seen = seenParam()
      if (seen) params.set('seen', seen)

      try {
        const res = await fetch(`/api/promos/slot?${params.toString()}`, { cache: 'no-store' })
        if (cancelled) return
        if (res.status === 204 || !res.ok) {
          setState('empty')
          return
        }
        const body = (await res.json()) as { data: ServedAd }
        if (cancelled) return
        setAd(body.data)
        setState('filled')
      } catch {
        // A failed ad request must never take the page with it.
        if (!cancelled) setState('empty')
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      load()
      return () => {
        cancelled = true
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect()
          load()
        }
      },
      { rootMargin: PREFETCH_MARGIN }
    )
    observer.observe(el)

    return () => {
      cancelled = true
      observer.disconnect()
    }
    // Spread into primitives on purpose — see tagsKey above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    placement,
    targeting?.vehicleType,
    targeting?.brand,
    targeting?.category,
    targeting?.use,
    targeting?.band,
    tagsKey,
  ])

  // Below-the-fold slots with nothing to show collapse. They are already
  // hydrated and off screen, so removing them shifts nothing the reader can
  // see — and an empty bordered box is worse than no box.
  if (state === 'empty') return null

  // `is-filled` lets the CSS drop the placeholder tint and shrink the frame to
  // the creative once it has actually arrived.
  const classes = ['tm-promo', placementModifier(placement), ad ? 'is-filled' : null, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role="complementary"
      aria-label={ad ? `Publicidad de ${ad.advertiserName}` : 'Espacio publicitario'}
      data-nosnippet
    >
      {/* Always rendered, even while loading: the label is part of the
          reserved height, so revealing it later would shift the layout. */}
      <span className="tm-promo__label">{ad?.isHouse ? 'TodoMotor' : 'Publicidad'}</span>
      <div className="tm-promo__frame" ref={containerRef}>
        {ad ? <AdCreativeRender ad={ad} /> : null}
      </div>
      {ad && disclosure ? <span className="tm-promo__disclosure">{disclosure}</span> : null}
    </div>
  )
}
