'use client'

import type { ClassifiedCategory } from '@/types/classified'
import { Badge } from './ui/Badge'
import { useCategoryLabel } from './SiteSettingsProvider'

export default function CategoryBadge({ category }: { category: ClassifiedCategory }) {
  const label = useCategoryLabel()
  return (
    <Badge tone="neutral" variant="outline" size="sm">
      {label(category)}
    </Badge>
  )
}
