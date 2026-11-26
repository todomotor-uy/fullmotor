import { ImageResponse } from 'next/og'
import { SITE_NAME } from './site'
import { IS_NAUTI, SITE_CONFIG } from './tenant'

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const ACCENT = IS_NAUTI ? '#0E7C86' : '#1F4FE0'
const INK = '#0E131B'
const MUTED = '#6B7686'
const PAPER = '#F6F8FB'

/**
 * The brand mark, inlined as a data URI. It must not be fetched over the
 * network: OG images are generated at build time, where /brand/*.svg is not
 * yet served by anything.
 */
const MARK_SVG = `<svg width="120" height="120" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="46" height="46" rx="12" fill="${ACCENT}"/>
  <path d="M12.74 31.5 A13 13 0 1 1 35.26 31.5" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  <line x1="12.74" y1="18.5" x2="15.34" y2="20" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
  <line x1="24" y1="12" x2="24" y2="15" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
  <line x1="35.26" y1="18.5" x2="32.66" y2="20" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
  <line x1="21.5" y1="28.7" x2="30.3" y2="16" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
  <circle cx="24" cy="25" r="3" fill="#FFFFFF"/>
  <circle cx="24" cy="25" r="1.3" fill="${ACCENT}"/>
</svg>`

const NAUTI_MARK_SVG = `<svg width="120" height="120" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="46" height="46" rx="12" fill="${ACCENT}"/>
  <path d="M14 9 H34 L24 20 Z" fill="#fff"/>
  <path d="M14 22 H34 L24 33 Z" fill="#fff" opacity="0.75"/>
  <path d="M10 38 C13.5 35.5 16.5 35.5 20 38 C23.5 40.5 26.5 40.5 30 38 C33.5 35.5 36.5 35.5 38 37.1" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>
</svg>`

const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(IS_NAUTI ? NAUTI_MARK_SVG : MARK_SVG).toString('base64')}`

interface OgImageOptions {
  /** Small uppercase label above the title. */
  eyebrow: string
  title: string
  subtitle: string
}

/**
 * Shared 1200x630 social card. Everything is self-contained — no remote fonts,
 * no remote images — so generation never depends on the network.
 */
export function renderOgImage({ eyebrow, title, subtitle }: OgImageOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: PAPER,
          backgroundImage: `radial-gradient(80% 120% at 85% -10%, #EDF2FF 0%, ${PAPER} 55%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_DATA_URI} width={96} height={96} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>
              {SITE_NAME}
            </span>
            <span style={{ fontSize: 24, color: MUTED }}>{new URL(SITE_CONFIG.defaultUrl).host}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 26,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: ACCENT,
              marginBottom: 20,
            }}
          >
            {eyebrow}
          </span>
          <span
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
            }}
          >
            {title}
          </span>
          <span style={{ fontSize: 32, color: MUTED, marginTop: 24, lineHeight: 1.3 }}>
            {subtitle}
          </span>
        </div>

        <div style={{ display: 'flex', height: 10, borderRadius: 5, background: ACCENT, width: 200 }} />
      </div>
    ),
    OG_SIZE
  )
}
