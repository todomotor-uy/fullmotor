'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { type User, fetchCurrentUser, getStoredToken, loginWithGoogle, removeToken, storeToken } from '@/lib/auth'
import { translateApiError } from '@/lib/api'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

type Status = 'loading' | 'signed-out' | 'signed-in'

interface AuthContextType {
  status: Status
  user: User | null
  /** Why the last sign-in failed, if it did. */
  error: string | null
  signIn: (credential: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  user: null,
  error: null,
  signIn: async () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

/**
 * The session: a token from the API's Google sign-in, kept in localStorage
 * and checked against /auth/me on load. A trimmed copy of the portals'
 * AuthProvider, without the modal — the sign-in screen is the whole page.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStoredToken()
    if (!stored) {
      queueMicrotask(() => setStatus('signed-out'))
      return
    }
    fetchCurrentUser(stored)
      .then((u) => {
        setUser(u)
        setStatus('signed-in')
      })
      .catch(() => {
        removeToken()
        setStatus('signed-out')
      })
  }, [])

  const signIn = useCallback(async (credential: string) => {
    try {
      const data = await loginWithGoogle(credential)
      storeToken(data.token)
      setUser(data.user)
      setError(null)
      setStatus('signed-in')
    } catch (err) {
      removeToken()
      setError(translateApiError(err, 'No pudimos iniciar sesión'))
    }
  }, [])

  const logout = useCallback(() => {
    removeToken()
    window.google?.accounts.id.disableAutoSelect()
    setUser(null)
    setStatus('signed-out')
  }, [])

  return <AuthContext.Provider value={{ status, user, error, signIn, logout }}>{children}</AuthContext.Provider>
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const GSI_SRC = 'https://accounts.google.com/gsi/client'

/** Google's own sign-in button (Google Identity Services, popup mode). */
export function GoogleButton() {
  const { signIn } = useAuth()
  const ref = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    if (window.google?.accounts) {
      queueMicrotask(() => setReady(true))
      return
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = GSI_SRC
      script.async = true
      document.head.appendChild(script)
    }
    const onLoad = () => setReady(true)
    script.addEventListener('load', onLoad)
    return () => script.removeEventListener('load', onLoad)
  }, [])

  // initialize() before renderButton(), in one effect, so the order cannot
  // depend on which of the script and the node arrived first.
  useEffect(() => {
    const node = ref.current
    if (!ready || !node || !window.google) return
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r: { credential: string }) => void signIn(r.credential),
      ux_mode: 'popup',
      auto_select: false,
      locale: 'es',
    })
    node.innerHTML = ''
    window.google.accounts.id.renderButton(node, {
      type: 'standard',
      size: 'large',
      theme: 'outline',
      text: 'signin_with',
      shape: 'pill',
      width: 280,
      locale: 'es',
    })
  }, [ready, signIn])

  if (!GOOGLE_CLIENT_ID) {
    return <p className="text-sm text-danger-ink">Falta NEXT_PUBLIC_GOOGLE_CLIENT_ID en este despliegue.</p>
  }
  return <div ref={ref} className="min-h-[44px]" />
}
