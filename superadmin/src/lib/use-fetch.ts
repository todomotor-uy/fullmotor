'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Runs `fetcher` on mount, whenever it changes (pass a useCallback over the
 * request's parameters) and on `reload()`. `loading` holds until the answer
 * for the current fetcher arrives; the last good data stays visible in the
 * meantime, and when a later request fails. A stale answer from a superseded
 * request is dropped.
 */
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<{ fetcher: unknown; nonce: number; data?: T; error?: unknown } | null>(null)

  useEffect(() => {
    let alive = true
    fetcher().then(
      (data) => {
        if (alive) setState({ fetcher, nonce, data })
      },
      (error: unknown) => {
        if (alive) setState((prev) => ({ fetcher, nonce, data: prev?.data, error }))
      }
    )
    return () => {
      alive = false
    }
  }, [fetcher, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const loading = !state || state.fetcher !== fetcher || state.nonce !== nonce
  return { data: state?.data, error: state?.error, loading, reload }
}
