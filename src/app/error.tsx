'use client'

import { useEffect } from 'react'
import { reportClientError } from './components/ErrorReporter'
import { Button } from './components/ui/Button'

/**
 * A page that failed to render, reported to the API. In production a server
 * error arrives here as a digest only, which matches the server-side report
 * from instrumentation.ts.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(`${error.name}: ${error.message}`, error.stack, error.digest)
  }, [error])

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-ink mb-2">Algo salió mal</h1>
      <p className="text-sm text-muted mb-6">
        No pudimos mostrar esta página. Ya nos llegó el aviso; probá de nuevo en un momento.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  )
}
