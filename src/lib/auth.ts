import type { Dealership } from '@/types/classified'
import { tenantHeader } from '@/lib/tenant'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const TOKEN_KEY = 'todomotor_token'

export interface User {
    id: string
    email: string
    name: string
    avatarUrl: string | null
    role?: string
    /** The caller's own business account, whatever its review state. */
    dealership?: Dealership
    /**
     * Per-account limits, resolved server-side. An object rather than a bare
     * number so future limits have somewhere to live.
     */
    limits?: { maxImages: number }
    createdAt: string
    updatedAt: string
}

interface LoginResponse {
    token: string
    user: User
}

export function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY)
}

export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tenantHeader() },
        body: JSON.stringify({ idToken }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Error al iniciar sesión')
    }

    return res.json()
}

export async function fetchCurrentUser(token: string): Promise<User> {
    const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, ...tenantHeader() },
    })

    if (!res.ok) {
        throw new Error('Token inválido o expirado')
    }

    return res.json()
}
