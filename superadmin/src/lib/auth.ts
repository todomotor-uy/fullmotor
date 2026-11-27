import { API_URL, ApiError, tenantHeader } from './api'

const TOKEN_KEY = 'vitri_superadmin_token'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  /** Set by the API from SUPERADMIN_EMAILS. */
  superAdmin?: boolean
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Private mode: the session lasts as long as the tab.
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing stored, nothing to remove.
  }
}

export async function loginWithGoogle(idToken: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tenantHeader() },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error || body.message || res.statusText, res.status)
  }
  return res.json()
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, ...tenantHeader() },
  })
  if (!res.ok) throw new ApiError('Invalid or expired token', res.status)
  return res.json()
}
