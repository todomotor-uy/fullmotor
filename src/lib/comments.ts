import { tenantHeader } from '@/lib/tenant'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface CommentUser {
    id: string
    name: string
    avatarUrl: string | null
}

export interface Comment {
    id: string
    resourceId: string
    userId: string
    user: CommentUser
    body: string
    deleted: boolean
    parentId?: string
    replies: Comment[]
    createdAt: string
}

interface CommentsResponse {
    data: Comment[]
    meta: {
        total: number
        page: number
        lastPage: number
    }
}

export async function fetchComments(
    resourceId: string,
    page = 1,
    limit = 20
): Promise<CommentsResponse> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await fetch(`${API_URL}/api/comments/${resourceId}?${params}`, {
        headers: tenantHeader(),
    })

    if (!res.ok) {
        throw new Error('Error al cargar comentarios')
    }

    return res.json()
}

export async function createComment(
    resourceId: string,
    body: string,
    token: string,
    parentId?: string
): Promise<Comment> {
    const payload: { body: string; parentId?: string } = { body }
    if (parentId) payload.parentId = parentId

    const res = await fetch(`${API_URL}/api/comments/${resourceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...tenantHeader(),
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Error al publicar comentario')
    }

    return res.json()
}

export async function deleteComment(
    resourceId: string,
    commentId: string,
    token: string
): Promise<void> {
    const res = await fetch(`${API_URL}/api/comments/${resourceId}/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, ...tenantHeader() },
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Error al eliminar comentario')
    }
}
