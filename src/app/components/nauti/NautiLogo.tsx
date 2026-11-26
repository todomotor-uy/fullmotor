import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/tenant'

export function NautiMark({ size = 40 }: { size?: number }) {
  // South cardinal mark: two cones pointing down, over the water.
  return (
    <svg className="tm-logo__mark" width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Cardinal Sur">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="var(--accent)" />
      <path d="M14 9 H34 L24 20 Z" fill="#fff" />
      <path d="M14 22 H34 L24 33 Z" fill="#fff" opacity="0.75" />
      <path
        d="M10 38 C13.5 35.5 16.5 35.5 20 38 C23.5 40.5 26.5 40.5 30 38 C33.5 35.5 36.5 35.5 38 37.1"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function NautiLogo({ size = 22, inverse = false, className = '' }: { size?: number; inverse?: boolean; className?: string }) {
  const markSize = Math.round(size * 1.5)
  return (
    <Link href="/" className={['tm-logo', inverse ? 'tm-logo--inverse' : '', className].filter(Boolean).join(' ')}>
      <NautiMark size={markSize} />
      <span className="tm-logo__wm" style={{ fontSize: size }}>
        <span className="tm-logo__todo">{SITE_CONFIG.logo[0]}</span><span className="tm-logo__motor">{SITE_CONFIG.logo[1]}</span>
      </span>
      <span className="tm-logo__uy" style={{ fontSize: Math.max(10, size * 0.34), paddingBottom: size * 0.12 }}>UY</span>
    </Link>
  )
}
