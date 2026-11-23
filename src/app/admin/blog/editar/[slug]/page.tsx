'use client'

import { useParams } from 'next/navigation'
import { PostEditor } from '../../PostEditor'

export default function EditPostPage() {
  const { slug } = useParams<{ slug: string }>()
  // Keyed by slug so moving between posts starts from a clean editor.
  return <PostEditor key={slug} slug={decodeURIComponent(slug)} />
}
