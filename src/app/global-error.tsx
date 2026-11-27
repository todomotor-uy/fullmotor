'use client'

import { useEffect } from 'react'
import { reportClientError } from './components/ErrorReporter'

/** The root layout itself failed: no header, no styles we can count on. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(`${error.name}: ${error.message}`, error.stack, error.digest)
  }, [error])

  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '80px 16px' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Algo salió mal</h1>
        <p style={{ color: '#555', marginBottom: 24 }}>No pudimos cargar el sitio. Probá de nuevo en un momento.</p>
        <button type="button" onClick={reset} style={{ padding: '10px 18px', cursor: 'pointer' }}>
          Reintentar
        </button>
      </body>
    </html>
  )
}
