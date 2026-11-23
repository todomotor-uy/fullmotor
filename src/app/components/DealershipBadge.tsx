import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { ClassifiedDealership } from '@/types/classified'
import { BIZ } from '@/lib/tenant'

interface DealershipBadgeProps {
  dealership: ClassifiedDealership
  /**
   * Whether to link through to the storefront.
   *
   * Must stay false anywhere the badge sits inside another link — the listing
   * card is wrapped in one, and nesting anchors is invalid HTML that browsers
   * "repair" by splitting the outer link, so half the card would stop being
   * clickable. Same trap the version chips hit, solved the same way.
   */
  asLink?: boolean
}

export default function DealershipBadge({ dealership, asLink = false }: DealershipBadgeProps) {
  const content = (
    <>
      <BadgeCheck size={13} aria-hidden="true" className="flex-shrink-0" />
      <span className="truncate">{dealership.name}</span>
    </>
  )

  const className =
    'inline-flex items-center gap-1 max-w-full text-xs font-semibold text-accent-ink bg-accent-soft px-2 py-0.5 rounded-[var(--radius-pill)]'

  if (!asLink) {
    return (
      <span className={className} title={`${dealership.name} · ${BIZ.One} verificado`}>
        {content}
      </span>
    )
  }

  return (
    <Link
      href={`/comercios/${dealership.slug}`}
      className={`${className} hover:bg-accent hover:text-white transition-colors`}
    >
      {content}
    </Link>
  )
}
