import { NextRequest, NextResponse } from 'next/server'
import { fetchBlogPosts } from '@/lib/blog'
import { parseTagParams } from '@/lib/blog-tags'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '12', 10)
  const tags = parseTagParams({ tag: searchParams.get('tag'), tags: searchParams.get('tags') })

  const result = await fetchBlogPosts({ page, limit, tags })

  return NextResponse.json(result)
}
