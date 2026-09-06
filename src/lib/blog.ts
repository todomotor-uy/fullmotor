import { BlogPost, BlogPostDetail, BlogListResponse, BlogTagsResponse } from '@/types/blog'
import { getHeaders } from './api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface FetchBlogPostsParams {
  page?: number
  limit?: number
  tag?: string
}

export async function fetchBlogPosts(params: FetchBlogPostsParams = {}): Promise<{ posts: BlogPost[]; meta: BlogListResponse['meta'] }> {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.tag) searchParams.set('tag', params.tag)

  const url = `${API_URL}/api/blog${searchParams.toString() ? `?${searchParams}` : ''}`

  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch blog posts: ${response.statusText}`)
  }

  const data: BlogListResponse = await response.json()

  return {
    posts: data.data,
    meta: data.meta,
  }
}

export async function fetchBlogTags(): Promise<string[]> {
  const url = `${API_URL}/api/blog/tags`

  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch blog tags: ${response.statusText}`)
  }

  // `data` is the unified envelope; `tags` is the legacy key, still emitted by
  // the API so the two repos can deploy in either order.
  const body: BlogTagsResponse & { data?: string[] } = await response.json()
  return body.data ?? body.tags ?? []
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const url = `${API_URL}/api/blog/${slug}`

  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: getHeaders(),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch blog post: ${response.statusText}`)
  }

  // The detail endpoint now returns { data }, like every other endpoint. The
  // `?? body` fallback tolerates an API that has not been deployed yet.
  const body = await response.json()
  return body?.data ?? body
}

export async function getLatestBlogPosts(limit: number = 3): Promise<BlogPost[]> {
  try {
    const { posts } = await fetchBlogPosts({ page: 1, limit })
    return posts
  } catch (error) {
    console.error('[blog] getLatestBlogPosts failed:', error)
    return []
  }
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const allPosts: BlogPost[] = []
    let page = 1
    const limit = 100

    while (true) {
      const { posts, meta } = await fetchBlogPosts({ page, limit })
      allPosts.push(...posts)
      if (page >= meta.lastPage) break
      page++
    }

    return allPosts
  } catch (error) {
    // Swallowing this keeps the build green but silently empties the sitemap
    // and skips every prerendered article — log loudly so it shows up in CI.
    console.error('[blog] getAllBlogPosts failed — sitemap and prerendered articles will be empty:', error)
    return []
  }
}
