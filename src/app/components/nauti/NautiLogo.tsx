import Link from 'next/link'

export function NautiMark({ size = 40 }: { size?: number }) {
  return (
    <svg className="tm-logo__mark" width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Nauti">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="var(--accent)" />
      <path d="M25 9 L25 30 L36 30 Z" fill="#fff" />
      <path d="M22.5 13 L22.5 30 L13 30 Z" fill="#fff" opacity="0.75" />
      <path
        d="M10 34.5 C13.5 32 16.5 32 20 34.5 C23.5 37 26.5 37 30 34.5 C33.5 32 36.5 32 38 33.6"
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
        <span className="tm-logo__todo">nau</span><span className="tm-logo__motor">ti</span>
      </span>
      <span className="tm-logo__uy" style={{ fontSize: Math.max(10, size * 0.34), paddingBottom: size * 0.12 }}>UY</span>
    </Link>
  )
}
